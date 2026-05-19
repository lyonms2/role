import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  query,
  where,
  orderBy,
  limit,
  increment,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { deleteCloudinaryImages } from './cloudinary'
import type { Place, PlaceWithDistance, Review, Suggestion, PlaceCategory, RoleEvent, EventReview, Eat, Stay, EatReview, StayReview } from '@/types'
import type { DestinationSnap, EventSnap, EatSnap, StaySnap } from './roteiro-context'

export interface SavedRoteiro {
  id: string
  userId: string
  name: string
  destination: DestinationSnap
  events: EventSnap[]
  eats: EatSnap[]
  stays: StaySnap[]
  createdAt: Timestamp
  scheduledDate?: string // ISO "YYYY-MM-DD"
}

// --- PLACES ---

export async function getApprovedPlaces(): Promise<Place[]> {
  const q = query(
    collection(db, 'places'),
    where('status', '==', 'approved'),
    orderBy('averageRating', 'desc'),
    limit(300)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Place))
}

export async function getPlacesByCategory(category: PlaceCategory): Promise<Place[]> {
  const q = query(
    collection(db, 'places'),
    where('status', '==', 'approved'),
    where('category', '==', category),
    orderBy('averageRating', 'desc'),
    limit(300)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Place))
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const ref = doc(db, 'places', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Place
}

// --- REVIEWS ---

export async function getReviewsByPlace(placeId: string): Promise<Review[]> {
  const q = query(
    collection(db, 'reviews'),
    where('placeId', '==', placeId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))
}

export async function addReview(
  review: Omit<Review, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'reviews'), {
    ...review,
    createdAt: serverTimestamp(),
  })

  const placeRef = doc(db, 'places', review.placeId)
  const placeSnap = await getDoc(placeRef)
  if (placeSnap.exists()) {
    const data = placeSnap.data()
    const currentTotal = (data.averageRating || 0) * (data.reviewCount || 0)
    const newCount = (data.reviewCount || 0) + 1
    const newAvg = (currentTotal + review.rating) / newCount
    await updateDoc(placeRef, {
      averageRating: Math.round(newAvg * 10) / 10,
      reviewCount: increment(1),
      ...(review.verified ? { verifiedReviewCount: increment(1) } : {}),
    })
  }

  return ref.id
}

export async function deleteReview(id: string, placeId: string, rating: number, photos?: string[], verified?: boolean): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  await deleteDoc(doc(db, 'reviews', id))
  const placeRef = doc(db, 'places', placeId)
  const placeSnap = await getDoc(placeRef)
  if (placeSnap.exists()) {
    const data = placeSnap.data()
    const count = data.reviewCount || 0
    if (count <= 1) {
      await updateDoc(placeRef, {
        averageRating: 0,
        reviewCount: 0,
        ...(verified ? { verifiedReviewCount: 0 } : {}),
      })
    } else {
      const newCount = count - 1
      const newAvg = ((data.averageRating || 0) * count - rating) / newCount
      await updateDoc(placeRef, {
        averageRating: Math.round(newAvg * 10) / 10,
        reviewCount: increment(-1),
        ...(verified ? { verifiedReviewCount: increment(-1) } : {}),
      })
    }
  }
}

export async function hasUserReviewedPlace(userId: string, placeId: string): Promise<boolean> {
  const q = query(
    collection(db, 'reviews'),
    where('userId', '==', userId),
    where('placeId', '==', placeId),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// --- SUGGESTIONS ---

export async function getPendingSuggestions(): Promise<Suggestion[]> {
  const q = query(
    collection(db, 'suggestions'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'asc'),
    limit(100)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Suggestion))
}

export async function rejectSuggestion(id: string, photos?: string[] | null): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  await updateDoc(doc(db, 'suggestions', id), { status: 'rejected' })
}

export async function deleteSuggestion(id: string): Promise<void> {
  await deleteDoc(doc(db, 'suggestions', id))
}

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number }> {
  try {
    const q = encodeURIComponent(`${city}, ${state}, Brasil`)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`)
    const data = await r.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* geocoding falhou */ }
  return { lat: 0, lng: 0 }
}

export async function approveSuggestion(suggestion: Suggestion): Promise<void> {
  let lat = (suggestion as any).lat || 0
  let lng = (suggestion as any).lng || 0
  if (lat === 0 && lng === 0) {
    const coords = await geocodeCity(suggestion.city, suggestion.state)
    lat = coords.lat
    lng = coords.lng
  }
  await addDoc(collection(db, 'places'), {
    name: suggestion.name,
    city: suggestion.city,
    state: suggestion.state,
    category: suggestion.category,
    description: suggestion.description,
    lat,
    lng,
    photoUrl: (suggestion as any).photos?.[0] ?? null,
    photos: (suggestion as any).photos ?? null,
    mapsLink: (suggestion as any).mapsLink ?? null,
    averageRating: 0,
    reviewCount: 0,
    verifiedReviewCount: 0,
    status: 'approved',
    source: 'community',
    suggestedBy: suggestion.suggestedBy,
    createdAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'suggestions', suggestion.id), { status: 'approved' })
}

export async function getCommunityPlaces(category?: PlaceCategory): Promise<PlaceWithDistance[]> {
  const q = category
    ? query(collection(db, 'places'), where('status', '==', 'approved'), where('category', '==', category), orderBy('averageRating', 'desc'), limit(500))
    : query(collection(db, 'places'), where('status', '==', 'approved'), orderBy('averageRating', 'desc'), limit(500))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'community' as const } as PlaceWithDistance))
}

export async function addSuggestion(
  suggestion: Omit<Suggestion, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'suggestions'), {
    ...suggestion,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getSuggestionsByUser(userId: string): Promise<Suggestion[]> {
  const q = query(
    collection(db, 'suggestions'),
    where('suggestedBy', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Suggestion))
}

// --- USER REVIEWS ---

export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const q = query(
    collection(db, 'reviews'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))
}

export async function getEventReviewsByUser(userId: string): Promise<EventReview[]> {
  const q = query(
    collection(db, 'eventReviews'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventReview))
}


// --- EVENTOS ---

export async function getEventById(id: string): Promise<RoleEvent | null> {
  const snap = await getDoc(doc(db, 'events', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as RoleEvent
}

export async function getApprovedEvents(city?: string): Promise<RoleEvent[]> {
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'approved'),
    orderBy('date', 'asc'),
    limit(300)
  )
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoleEvent))
  if (!city) return all
  return all.filter((e) => e.city.toLowerCase().includes(city.toLowerCase()))
}

export async function addEvent(event: Omit<RoleEvent, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), { ...event, createdAt: serverTimestamp() })
  return ref.id
}

// --- EVENT REVIEWS ---

export async function getEventReviews(eventId: string): Promise<EventReview[]> {
  const q = query(
    collection(db, 'eventReviews'),
    where('eventId', '==', eventId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventReview))
}

export async function addEventReview(review: Omit<EventReview, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'eventReviews'), {
    ...review,
    createdAt: serverTimestamp(),
  })
  try {
    const eventRef = doc(db, 'events', review.eventId)
    const eventSnap = await getDoc(eventRef)
    if (eventSnap.exists()) {
      const data = eventSnap.data()
      const currentTotal = (data.averageRating || 0) * (data.reviewCount || 0)
      const newCount = (data.reviewCount || 0) + 1
      const newAvg = (currentTotal + review.rating) / newCount
      await updateDoc(eventRef, {
        averageRating: Math.round(newAvg * 10) / 10,
        reviewCount: increment(1),
      })
    }
  } catch (e) {
    console.warn('[addEventReview] falha ao atualizar rating do evento:', e)
  }
  return ref.id
}

export async function deleteEventReview(id: string, eventId: string, rating: number, photos?: string[]): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  await deleteDoc(doc(db, 'eventReviews', id))
  const eventRef = doc(db, 'events', eventId)
  const eventSnap = await getDoc(eventRef)
  if (eventSnap.exists()) {
    const data = eventSnap.data()
    const count = data.reviewCount || 0
    if (count <= 1) {
      await updateDoc(eventRef, { averageRating: 0, reviewCount: 0 })
    } else {
      const newCount = count - 1
      const newAvg = ((data.averageRating || 0) * count - rating) / newCount
      await updateDoc(eventRef, {
        averageRating: Math.round(newAvg * 10) / 10,
        reviewCount: increment(-1),
      })
    }
  }
}

export async function hasUserReviewedEvent(userId: string, eventId: string): Promise<boolean> {
  const q = query(
    collection(db, 'eventReviews'),
    where('userId', '==', userId),
    where('eventId', '==', eventId),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

// --- ONDE COMER ---

export async function getEatById(id: string): Promise<Eat | null> {
  const snap = await getDoc(doc(db, 'eats', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Eat
}

export async function getApprovedEats(city?: string): Promise<Eat[]> {
  const q = query(
    collection(db, 'eats'),
    where('status', '==', 'approved'),
    orderBy('averageRating', 'desc'),
    limit(300)
  )
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Eat))
  if (!city) return all
  return all.filter((e) => e.city.toLowerCase().includes(city.toLowerCase()))
}

export async function addEat(eat: Omit<Eat, 'id' | 'createdAt' | 'averageRating' | 'reviewCount'>): Promise<string> {
  const ref = await addDoc(collection(db, 'eats'), { ...eat, averageRating: 0, reviewCount: 0, createdAt: serverTimestamp() })
  return ref.id
}

export async function getEatReviews(eatId: string): Promise<EatReview[]> {
  const q = query(
    collection(db, 'eatReviews'),
    where('eatId', '==', eatId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EatReview))
}

export async function hasUserReviewedEat(userId: string, eatId: string): Promise<boolean> {
  const q = query(
    collection(db, 'eatReviews'),
    where('userId', '==', userId),
    where('eatId', '==', eatId),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

const PRICE_TO_NUM: Record<string, number> = { '💲': 1, '💲💲': 2, '💲💲💲': 3 }
function numToPriceRange(n: number): '💲' | '💲💲' | '💲💲💲' {
  return n < 1.5 ? '💲' : n < 2.5 ? '💲💲' : '💲💲💲'
}

export async function addEatReview(
  review: Omit<EatReview, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'eatReviews'), { ...review, createdAt: serverTimestamp() })
  try {
    const ref = doc(db, 'eats', review.eatId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0, communityPriceSum = 0 } = snap.data()
      const newCount = reviewCount + 1
      const newAvg = ((averageRating * reviewCount) + review.rating) / newCount
      const newPriceSum = communityPriceSum + (PRICE_TO_NUM[review.priceRange] ?? 1)
      const newPriceRange = numToPriceRange(newPriceSum / newCount)
      await updateDoc(ref, {
        averageRating: Math.round(newAvg * 10) / 10,
        reviewCount: newCount,
        priceRange: newPriceRange,
        communityPriceSum: newPriceSum,
      })
    }
  } catch {}
}

export async function deleteEatReview(reviewId: string, eatId: string, rating: number, priceRange: '💲' | '💲💲' | '💲💲💲', photos?: string[]): Promise<void> {
  await deleteDoc(doc(db, 'eatReviews', reviewId))
  if (photos?.length) {
    try { await deleteCloudinaryImages(photos) } catch {}
  }
  try {
    const ref = doc(db, 'eats', eatId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0, communityPriceSum = 0 } = snap.data()
      if (reviewCount <= 1) {
        await updateDoc(ref, { averageRating: 0, reviewCount: 0, communityPriceSum: 0 })
      } else {
        const newCount = reviewCount - 1
        const newAvg = ((averageRating * reviewCount) - rating) / newCount
        const newPriceSum = Math.max(0, communityPriceSum - (PRICE_TO_NUM[priceRange] ?? 1))
        const newPriceRange = numToPriceRange(newPriceSum / newCount)
        await updateDoc(ref, {
          averageRating: Math.round(newAvg * 10) / 10,
          reviewCount: newCount,
          priceRange: newPriceRange,
          communityPriceSum: newPriceSum,
        })
      }
    }
  } catch {}
}

export async function getEatReviewsByUser(userId: string): Promise<EatReview[]> {
  const q = query(
    collection(db, 'eatReviews'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as EatReview))
}

// --- ONDE DORMIR ---

export async function getStayById(id: string): Promise<Stay | null> {
  const snap = await getDoc(doc(db, 'stays', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Stay
}

export async function getApprovedStays(city?: string): Promise<Stay[]> {
  const q = query(
    collection(db, 'stays'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc'),
    limit(300)
  )
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Stay))
  if (!city) return all
  return all.filter((s) => s.city.toLowerCase().includes(city.toLowerCase()))
}

export async function addStay(stay: Omit<Stay, 'id' | 'createdAt' | 'averageRating' | 'reviewCount'>): Promise<string> {
  const ref = await addDoc(collection(db, 'stays'), { ...stay, averageRating: 0, reviewCount: 0, createdAt: serverTimestamp() })
  return ref.id
}

export async function getStayReviews(stayId: string): Promise<StayReview[]> {
  const q = query(
    collection(db, 'stayReviews'),
    where('stayId', '==', stayId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StayReview))
}

export async function hasUserReviewedStay(userId: string, stayId: string): Promise<boolean> {
  const q = query(
    collection(db, 'stayReviews'),
    where('userId', '==', userId),
    where('stayId', '==', stayId),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function addStayReview(
  review: Omit<StayReview, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'stayReviews'), { ...review, createdAt: serverTimestamp() })
  try {
    const ref = doc(db, 'stays', review.stayId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0 } = snap.data()
      const newCount = reviewCount + 1
      const newAvg = ((averageRating * reviewCount) + review.rating) / newCount
      await updateDoc(ref, { averageRating: Math.round(newAvg * 10) / 10, reviewCount: newCount })
    }
  } catch {}
}

export async function deleteStayReview(reviewId: string, stayId: string, rating: number, photos?: string[]): Promise<void> {
  await deleteDoc(doc(db, 'stayReviews', reviewId))
  if (photos?.length) {
    try { await deleteCloudinaryImages(photos) } catch {}
  }
  try {
    const ref = doc(db, 'stays', stayId)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0 } = snap.data()
      if (reviewCount <= 1) {
        await updateDoc(ref, { averageRating: 0, reviewCount: 0 })
      } else {
        const newCount = reviewCount - 1
        const newAvg = ((averageRating * reviewCount) - rating) / newCount
        await updateDoc(ref, { averageRating: Math.round(newAvg * 10) / 10, reviewCount: newCount })
      }
    }
  } catch {}
}

export async function getStayReviewsByUser(userId: string): Promise<StayReview[]> {
  const q = query(
    collection(db, 'stayReviews'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StayReview))
}

// --- ROTEIROS ---

// Remove undefined recursivamente — Firestore rejeita undefined
function stripUndefined(obj: any): any {
  return JSON.parse(JSON.stringify(obj))
}

export async function saveRoteiro(
  data: Omit<SavedRoteiro, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'roteiros'), { ...stripUndefined(data), createdAt: serverTimestamp() })
  return ref.id
}

export async function getRoteirosByUser(userId: string): Promise<SavedRoteiro[]> {
  const q = query(
    collection(db, 'roteiros'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRoteiro))
}

export async function deleteRoteiro(id: string): Promise<void> {
  await deleteDoc(doc(db, 'roteiros', id))
}

export async function updateRoteiroItems(
  id: string,
  data: Pick<SavedRoteiro, 'name' | 'destination' | 'events' | 'eats' | 'stays'>
): Promise<void> {
  await updateDoc(doc(db, 'roteiros', id), stripUndefined(data))
}

export async function updateRoteiroDate(id: string, date: string | null): Promise<void> {
  await updateDoc(doc(db, 'roteiros', id), {
    scheduledDate: date ?? deleteField(),
  })
}

// --- DENÚNCIAS ---

export interface ReviewReport {
  id: string
  reviewId: string
  reviewType?: 'place' | 'event' | 'eat' | 'stay'
  placeId?: string
  eatId?: string
  stayId?: string
  eventId?: string
  reviewUserId: string
  reviewUserName: string
  reviewText?: string
  reviewRating: number
  placeName?: string
  googlePlaceId?: string
  reportedBy: string
  reportedByName: string
  createdAt: Timestamp
}

export async function reportReview(data: Omit<ReviewReport, 'id' | 'createdAt'>): Promise<void> {
  await addDoc(collection(db, 'reports'), { ...data, createdAt: serverTimestamp() })
}

export async function hasUserReportedReview(userId: string, reviewId: string): Promise<boolean> {
  const q = query(
    collection(db, 'reports'),
    where('reportedBy', '==', userId),
    where('reviewId', '==', reviewId),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
}

export async function getReports(): Promise<ReviewReport[]> {
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(100))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewReport))
}

export async function dismissReport(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'reports', reportId))
}

export async function deleteReviewAndReport(reportId: string, report: ReviewReport): Promise<void> {
  const { reviewId, reviewType, placeId, eatId, stayId, eventId, reviewRating } = report
  if (reviewType === 'eat' && eatId) {
    const snap = await getDoc(doc(db, 'eatReviews', reviewId))
    const d = snap.exists() ? snap.data() : {}
    await deleteEatReview(reviewId, eatId, reviewRating, d.priceRange, d.photos)
  } else if (reviewType === 'stay' && stayId) {
    const snap = await getDoc(doc(db, 'stayReviews', reviewId))
    const d = snap.exists() ? snap.data() : {}
    await deleteStayReview(reviewId, stayId, reviewRating, d.photos)
  } else if (reviewType === 'event' && eventId) {
    const snap = await getDoc(doc(db, 'eventReviews', reviewId))
    const d = snap.exists() ? snap.data() : {}
    await deleteEventReview(reviewId, eventId, reviewRating, d.photos)
  } else if (placeId) {
    const snap = await getDoc(doc(db, 'reviews', reviewId))
    const photos = snap.exists() ? (snap.data().photos as string[] | undefined) : undefined
    const verified = snap.exists() ? (snap.data().verified as boolean | undefined) : undefined
    await deleteReview(reviewId, placeId, reviewRating, photos, verified)
  }
  await deleteDoc(doc(db, 'reports', reportId))
}




// --- ANÚNCIOS ---

export type AdType = 'evento' | 'comer' | 'hospedar'

export interface AdvertiserRequest {
  id: string
  type: AdType
  name: string
  city: string
  state: string
  description: string
  category: string
  // Evento
  venue?: string
  date?: string
  time?: string
  endDate?: string
  endTime?: string
  price?: string
  ticketUrl?: string
  photoUrl?: string
  // Comer / Evento (maps link)
  priceRange?: string
  mapsLink?: string
  socialLink?: string
  photos?: string[]
  // Hospedar
  priceFrom?: number
  bookingUrl?: string
  // Contato
  contactName: string
  contactEmail: string
  contactPhone?: string
  lat?: number
  lng?: number
  userId?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
}

export async function addAdvertiserRequest(
  data: Omit<AdvertiserRequest, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const clean = Object.fromEntries(
    Object.entries({ ...data, status: 'pending', createdAt: serverTimestamp() })
      .filter(([, v]) => v !== undefined)
  )
  const ref = await addDoc(collection(db, 'advertiser_requests'), clean)
  return ref.id
}

export async function getAdvertiserRequests(): Promise<AdvertiserRequest[]> {
  const q = query(collection(db, 'advertiser_requests'), where('status', '==', 'pending'), limit(100))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdvertiserRequest))
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
}

export async function getMyAdvertiserRequests(userId: string): Promise<AdvertiserRequest[]> {
  const q = query(collection(db, 'advertiser_requests'), where('userId', '==', userId), limit(50))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdvertiserRequest))
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
}

export async function rejectAdvertiserRequest(id: string, photoUrl?: string, photos?: string[]): Promise<void> {
  const urls = [...(photoUrl ? [photoUrl] : []), ...(photos ?? [])]
  if (urls.length) await deleteCloudinaryImages(urls)
  await updateDoc(doc(db, 'advertiser_requests', id), { status: 'rejected' })
}

export async function deleteAdvertiserRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, 'advertiser_requests', id))
}

export async function deleteEvent(id: string, photoUrl?: string): Promise<void> {
  if (photoUrl) await deleteCloudinaryImages([photoUrl])
  await deleteDoc(doc(db, 'events', id))
}

export async function deleteExpiredEvents(): Promise<number> {
  const { isEventExpired } = await import('./events')
  const all = await getApprovedEvents()
  const expired = all.filter(isEventExpired)
  await Promise.all(expired.map((ev) => deleteEvent(ev.id, ev.photoUrl)))
  return expired.length
}

export async function deleteEat(id: string, photoUrl?: string, photos?: string[]): Promise<void> {
  const urls = [...(photoUrl ? [photoUrl] : []), ...(photos ?? [])]
  if (urls.length) await deleteCloudinaryImages(urls)
  await deleteDoc(doc(db, 'eats', id))
}

export async function deleteStay(id: string, photoUrl?: string, photos?: string[]): Promise<void> {
  const urls = [...(photoUrl ? [photoUrl] : []), ...(photos ?? [])]
  if (urls.length) await deleteCloudinaryImages(urls)
  await deleteDoc(doc(db, 'stays', id))
}

export async function approveAdvertiserRequest(req: AdvertiserRequest): Promise<void> {
  if (req.type === 'evento') {
    await addDoc(collection(db, 'events'), {
      name: req.name,
      city: req.city,
      state: req.state,
      description: req.description,
      venue: req.venue || '',
      date: req.date ? Timestamp.fromDate(new Date(`${req.date}T${req.time || '00:00'}:00`)) : serverTimestamp(),
      endDate: req.endDate ? Timestamp.fromDate(new Date(`${req.endDate}T${req.endTime || '23:59'}:59`)) : null,
      price: req.price || null,
      ticketUrl: req.ticketUrl || null,
      mapsLink: req.mapsLink || null,
      lat: req.lat || null,
      lng: req.lng || null,
      category: req.category || 'cultural',
      photoUrl: req.photoUrl || null,
      suggestedBy: 'advertiser',
      status: 'approved',
      averageRating: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
    })
  } else if (req.type === 'comer') {
    await addDoc(collection(db, 'eats'), {
      name: req.name,
      city: req.city,
      state: req.state,
      description: req.description,
      category: req.category || 'restaurante',
      priceRange: req.priceRange || '💲💲',
      mapsLink: req.mapsLink || null,
      socialLink: req.socialLink || null,
      lat: req.lat || null,
      lng: req.lng || null,
      photoUrl: req.photos?.[0] || null,
      photos: req.photos || null,
      averageRating: 0,
      reviewCount: 0,
      suggestedBy: 'advertiser',
      status: 'approved',
      createdAt: serverTimestamp(),
    })
  } else if (req.type === 'hospedar') {
    await addDoc(collection(db, 'stays'), {
      name: req.name,
      city: req.city,
      state: req.state,
      description: req.description,
      category: req.category || 'pousada',
      priceFrom: req.priceFrom || null,
      bookingUrl: req.bookingUrl || null,
      mapsLink: req.mapsLink || null,
      socialLink: req.socialLink || null,
      lat: req.lat || null,
      lng: req.lng || null,
      photoUrl: req.photos?.[0] || null,
      photos: req.photos || null,
      averageRating: 0,
      reviewCount: 0,
      suggestedBy: 'advertiser',
      status: 'approved',
      createdAt: serverTimestamp(),
    })
  }
  await updateDoc(doc(db, 'advertiser_requests', req.id), { status: 'approved' })
}
