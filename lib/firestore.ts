import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  deleteDoc,
  updateDoc,
  deleteField,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  increment,
  getCountFromServer,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { deleteCloudinaryImages } from './cloudinary'
import type { Place, PlaceWithDistance, Review, Suggestion, PlaceCategory, RoleEvent, EventReview, Eat, Stay, EatReview, StayReview, RoteiroReview } from '@/types'
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
  scheduledDate?: string    // ISO "YYYY-MM-DD" — início
  scheduledEndDate?: string // ISO "YYYY-MM-DD" — fim (multi-day)
  public?: boolean
  publishedToExplore?: boolean
  copyCount?: number
  averageRating?: number
  reviewCount?: number
  authorName?: string
  authorPhotoUrl?: string
  originalRoteiroId?: string
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
  const reviewRef = doc(collection(db, 'reviews'))
  const placeRef = doc(db, 'places', review.placeId)

  await runTransaction(db, async (tx) => {
    const placeSnap = await tx.get(placeRef)
    tx.set(reviewRef, { ...review, createdAt: serverTimestamp() })
    if (placeSnap.exists()) {
      const data = placeSnap.data()
      const count = data.reviewCount || 0
      const newCount = count + 1
      const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
      const newSum = oldSum + review.rating

      // Dificuldade — só trilhas enviam esse campo
      tx.update(placeRef, {
        ratingSum: newSum,
        averageRating: Math.round((newSum / newCount) * 10) / 10,
        reviewCount: newCount,
        ...(review.verified ? { verifiedReviewCount: increment(1) } : {}),
      })
    }
  })

  return reviewRef.id
}

export async function deleteReview(id: string, placeId: string, rating: number, photos?: string[], verified?: boolean): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  const reviewRef = doc(db, 'reviews', id)
  const placeRef = doc(db, 'places', placeId)
  await runTransaction(db, async (tx) => {
    const placeSnap = await tx.get(placeRef)
    tx.delete(reviewRef)
    if (placeSnap.exists()) {
      const data = placeSnap.data()
      const count = data.reviewCount || 0
      if (count <= 1) {
        tx.update(placeRef, {
          ratingSum: 0,
          averageRating: 0,
          reviewCount: 0,
          ...(verified ? { verifiedReviewCount: 0 } : {}),
        })
      } else {
        const newCount = count - 1
        const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
        const newSum = Math.max(0, oldSum - rating)
        tx.update(placeRef, {
          ratingSum: newSum,
          averageRating: Math.round((newSum / newCount) * 10) / 10,
          reviewCount: newCount,
          ...(verified ? { verifiedReviewCount: increment(-1) } : {}),
        })
      }
    }
  })
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
  const snap = await getDoc(doc(db, 'suggestions', id))
  const photos = snap.data()?.photos as string[] | undefined
  if (photos?.length) await deleteCloudinaryImages(photos)
  await deleteDoc(doc(db, 'suggestions', id))
}

async function geocodeCity(city: string, state: string): Promise<{ lat: number; lng: number }> {
  try {
    const q = encodeURIComponent(`${city}, ${state}, Brasil`)
    const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'letsapp/1.0 (leonardomorenodasilva3@gmail.com)' },
    })
    const data = await r.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
  } catch { /* geocoding falhou */ }
  return { lat: 0, lng: 0 }
}

export async function approveSuggestion(suggestion: Suggestion): Promise<void> {
  let lat = suggestion.lat || 0
  let lng = suggestion.lng || 0
  if (lat === 0 && lng === 0) {
    const coords = await geocodeCity(suggestion.city, suggestion.state)
    lat = coords.lat
    lng = coords.lng
  }
  if (lat === 0 && lng === 0) {
    throw new Error(`Não foi possível obter coordenadas para "${suggestion.city}, ${suggestion.state}". Edite a sugestão e informe o link do Maps.`)
  }
  await addDoc(collection(db, 'places'), {
    name: suggestion.name,
    city: suggestion.city,
    state: suggestion.state,
    category: suggestion.category,
    description: suggestion.description,
    lat,
    lng,
    photoUrl: suggestion.photos?.[0] ?? null,
    photos: suggestion.photos ?? null,
    mapsLink: suggestion.mapsLink ?? null,
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
  const q = query(collection(db, 'eventReviews'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50))
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
  const reviewRef = doc(collection(db, 'eventReviews'))
  const eventRef = doc(db, 'events', review.eventId)
  await runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef)
    tx.set(reviewRef, { ...review, createdAt: serverTimestamp() })
    if (eventSnap.exists()) {
      const data = eventSnap.data()
      const count = data.reviewCount || 0
      const newCount = count + 1
      const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
      const newSum = oldSum + review.rating
      tx.update(eventRef, {
        ratingSum: newSum,
        averageRating: Math.round((newSum / newCount) * 10) / 10,
        reviewCount: newCount,
      })
    }
  })
  return reviewRef.id
}

export async function deleteEventReview(id: string, eventId: string, rating: number, photos?: string[]): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  const reviewRef = doc(db, 'eventReviews', id)
  const eventRef = doc(db, 'events', eventId)
  await runTransaction(db, async (tx) => {
    const eventSnap = await tx.get(eventRef)
    tx.delete(reviewRef)
    if (eventSnap.exists()) {
      const data = eventSnap.data()
      const count = data.reviewCount || 0
      if (count <= 1) {
        tx.update(eventRef, { ratingSum: 0, averageRating: 0, reviewCount: 0 })
      } else {
        const newCount = count - 1
        const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
        const newSum = Math.max(0, oldSum - rating)
        tx.update(eventRef, {
          ratingSum: newSum,
          averageRating: Math.round((newSum / newCount) * 10) / 10,
          reviewCount: newCount,
        })
      }
    }
  })
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
): Promise<string> {
  const reviewRef = doc(collection(db, 'eatReviews'))
  const eatRef = doc(db, 'eats', review.eatId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(eatRef)
    tx.set(reviewRef, { ...review, createdAt: serverTimestamp() })
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0, communityPriceSum = 0, ratingSum: rs } = snap.data()
      const newCount = reviewCount + 1
      const oldSum = rs ?? averageRating * reviewCount
      const newSum = oldSum + review.rating
      const newPriceSum = communityPriceSum + (PRICE_TO_NUM[review.priceRange] ?? 1)
      tx.update(eatRef, {
        ratingSum: newSum,
        averageRating: Math.round((newSum / newCount) * 10) / 10,
        reviewCount: newCount,
        priceRange: numToPriceRange(newPriceSum / newCount),
        communityPriceSum: newPriceSum,
      })
    }
  })
  return reviewRef.id
}

export async function deleteEatReview(reviewId: string, eatId: string, rating: number, priceRange: '💲' | '💲💲' | '💲💲💲', photos?: string[]): Promise<void> {
  if (photos?.length) {
    try { await deleteCloudinaryImages(photos) } catch {}
  }
  const reviewRef = doc(db, 'eatReviews', reviewId)
  const eatRef = doc(db, 'eats', eatId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(eatRef)
    tx.delete(reviewRef)
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0, communityPriceSum = 0 } = snap.data()
      if (reviewCount <= 1) {
        tx.update(eatRef, { ratingSum: 0, averageRating: 0, reviewCount: 0, communityPriceSum: 0 })
      } else {
        const newCount = reviewCount - 1
        const oldSum = snap.data().ratingSum ?? averageRating * reviewCount
        const newSum = Math.max(0, oldSum - rating)
        const newPriceSum = Math.max(0, communityPriceSum - (PRICE_TO_NUM[priceRange] ?? 1))
        tx.update(eatRef, {
          ratingSum: newSum,
          averageRating: Math.round((newSum / newCount) * 10) / 10,
          reviewCount: newCount,
          priceRange: numToPriceRange(newPriceSum / newCount),
          communityPriceSum: newPriceSum,
        })
      }
    }
  })
}

export async function getEatReviewsByUser(userId: string): Promise<EatReview[]> {
  const q = query(collection(db, 'eatReviews'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50))
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
): Promise<string> {
  const reviewRef = doc(collection(db, 'stayReviews'))
  const stayRef = doc(db, 'stays', review.stayId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(stayRef)
    tx.set(reviewRef, { ...review, createdAt: serverTimestamp() })
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0, communityPriceSum = 0, ratingSum: rs } = snap.data()
      const newCount = reviewCount + 1
      const oldSum = rs ?? averageRating * reviewCount
      const newSum = oldSum + review.rating
      const newPriceSum = communityPriceSum + (PRICE_TO_NUM[review.priceRange ?? '💲💲'] ?? 2)
      tx.update(stayRef, {
        ratingSum: newSum,
        averageRating: Math.round((newSum / newCount) * 10) / 10,
        reviewCount: newCount,
        priceRange: numToPriceRange(newPriceSum / newCount),
        communityPriceSum: newPriceSum,
      })
    }
  })
  return reviewRef.id
}

export async function deleteStayReview(reviewId: string, stayId: string, rating: number, photos?: string[], priceRange?: string): Promise<void> {
  if (photos?.length) {
    try { await deleteCloudinaryImages(photos) } catch {}
  }
  const reviewRef = doc(db, 'stayReviews', reviewId)
  const stayRef = doc(db, 'stays', stayId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(stayRef)
    tx.delete(reviewRef)
    if (snap.exists()) {
      const { averageRating = 0, reviewCount = 0, communityPriceSum = 0 } = snap.data()
      if (reviewCount <= 1) {
        tx.update(stayRef, { ratingSum: 0, averageRating: 0, reviewCount: 0, communityPriceSum: 0 })
      } else {
        const newCount = reviewCount - 1
        const oldSum = snap.data().ratingSum ?? averageRating * reviewCount
        const newSum = Math.max(0, oldSum - rating)
        const newPriceSum = Math.max(0, communityPriceSum - (PRICE_TO_NUM[priceRange ?? '💲💲'] ?? 2))
        tx.update(stayRef, {
          ratingSum: newSum,
          averageRating: Math.round((newSum / newCount) * 10) / 10,
          reviewCount: newCount,
          priceRange: numToPriceRange(newPriceSum / newCount),
          communityPriceSum: newPriceSum,
        })
      }
    }
  })
}

export async function getStayReviewsByUser(userId: string): Promise<StayReview[]> {
  const q = query(collection(db, 'stayReviews'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50))
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

export async function updateRoteiroDate(id: string, date: string | null, endDate?: string | null): Promise<void> {
  if (date === null) {
    await updateDoc(doc(db, 'roteiros', id), { scheduledDate: deleteField(), scheduledEndDate: deleteField() })
  } else {
    await updateDoc(doc(db, 'roteiros', id), {
      scheduledDate: date,
      scheduledEndDate: endDate ?? deleteField(),
    })
  }
}

export async function getRoteiroById(id: string): Promise<SavedRoteiro | null> {
  const snap = await getDoc(doc(db, 'roteiros', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as SavedRoteiro
}

export async function setRoteiroPublic(id: string, isPublic: boolean): Promise<void> {
  await updateDoc(doc(db, 'roteiros', id), { public: isPublic })
}

export async function getPublishedRoteiros(): Promise<SavedRoteiro[]> {
  const q = query(
    collection(db, 'roteiros'),
    where('publishedToExplore', '==', true),
    orderBy('createdAt', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRoteiro))
}

export async function getPublishedSharedRoteiros(): Promise<SharedRoteiro[]> {
  const q = query(
    collection(db, 'sharedRoteiros'),
    orderBy('sharedAt', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SharedRoteiro))
}

export async function getPublishedRoteirosByDestination(destinationId: string): Promise<SavedRoteiro[]> {
  const q = query(
    collection(db, 'roteiros'),
    where('publishedToExplore', '==', true),
    where('destination.id', '==', destinationId),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRoteiro))
}

export async function getSharedRoteirosByDestination(destinationId: string): Promise<SharedRoteiro[]> {
  const q = query(
    collection(db, 'sharedRoteiros'),
    where('destination.id', '==', destinationId),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as SharedRoteiro))
    .sort((a, b) => {
      const ta = (a.sharedAt as any)?.seconds ?? 0
      const tb = (b.sharedAt as any)?.seconds ?? 0
      return tb - ta
    })
}

export async function publishRoteiroToExplore(
  id: string,
  published: boolean,
  authorName?: string,
  authorPhotoUrl?: string
): Promise<void> {
  const update: Record<string, any> = { publishedToExplore: published }
  if (published && authorName) update.authorName = authorName
  if (published && authorPhotoUrl) update.authorPhotoUrl = authorPhotoUrl
  await updateDoc(doc(db, 'roteiros', id), update)
}

export async function copyRoteiroToProfile(
  roteiro: SavedRoteiro,
  userId: string,
  authorName: string,
  authorPhotoUrl?: string
): Promise<string> {
  const newData = stripUndefined({
    userId,
    name: `Cópia de ${roteiro.name}`,
    destination: roteiro.destination,
    events: roteiro.events,
    eats: roteiro.eats,
    stays: roteiro.stays,
    authorName,
    ...(authorPhotoUrl ? { authorPhotoUrl } : {}),
    originalRoteiroId: roteiro.id,
    copyCount: 0,
    publishedToExplore: false,
    createdAt: serverTimestamp(),
  })
  const ref = await addDoc(collection(db, 'roteiros'), newData)
  updateDoc(doc(db, 'roteiros', roteiro.id), { copyCount: increment(1) }).catch(() => {})
  return ref.id
}

// --- DENÚNCIAS ---

export interface ReviewReport {
  id: string
  reviewId: string
  reviewType?: 'place' | 'event' | 'eat' | 'stay' | 'roteiro' | 'sharedRoteiro'
  placeId?: string
  eatId?: string
  stayId?: string
  eventId?: string
  roteiroId?: string
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
  const { reviewId, reviewType, placeId, eatId, stayId, eventId, roteiroId, reviewRating } = report
  if (reviewType === 'eat' && eatId) {
    const snap = await getDoc(doc(db, 'eatReviews', reviewId))
    const d = snap.exists() ? snap.data() : {}
    await deleteEatReview(reviewId, eatId, reviewRating, d.priceRange, d.photos)
  } else if (reviewType === 'stay' && stayId) {
    const snap = await getDoc(doc(db, 'stayReviews', reviewId))
    const d = snap.exists() ? snap.data() : {}
    await deleteStayReview(reviewId, stayId, reviewRating, d.photos, d.priceRange)
  } else if (reviewType === 'event' && eventId) {
    const snap = await getDoc(doc(db, 'eventReviews', reviewId))
    const d = snap.exists() ? snap.data() : {}
    await deleteEventReview(reviewId, eventId, reviewRating, d.photos)
  } else if (reviewType === 'roteiro' && roteiroId) {
    await deleteRoteiroReview(reviewId, roteiroId, reviewRating)
  } else if (reviewType === 'sharedRoteiro' && roteiroId) {
    await deleteSharedRoteiro(roteiroId)
  } else if (placeId) {
    const snap = await getDoc(doc(db, 'reviews', reviewId))
    const photos = snap.exists() ? (snap.data().photos as string[] | undefined) : undefined
    const verified = snap.exists() ? (snap.data().verified as boolean | undefined) : undefined
    await deleteReview(reviewId, placeId, reviewRating, photos, verified)
  }
  await deleteDoc(doc(db, 'reports', reportId))
}

// --- ROTEIRO REVIEWS ---

export async function addRoteiroReview(review: Omit<RoteiroReview, 'id' | 'createdAt'>): Promise<string> {
  const reviewRef = doc(collection(db, 'roteiroReviews'))
  const roteiroRef = doc(db, 'roteiros', review.roteiroId)
  await runTransaction(db, async (tx) => {
    const roteiroSnap = await tx.get(roteiroRef)
    tx.set(reviewRef, { ...review, createdAt: serverTimestamp() })
    if (roteiroSnap.exists()) {
      const data = roteiroSnap.data()
      const count = data.reviewCount || 0
      const newCount = count + 1
      const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
      const newSum = oldSum + review.rating
      tx.update(roteiroRef, {
        ratingSum: newSum,
        averageRating: Math.round((newSum / newCount) * 10) / 10,
        reviewCount: newCount,
      })
    }
  })
  return reviewRef.id
}

export async function deleteRoteiroReview(reviewId: string, roteiroId: string, rating: number): Promise<void> {
  const reviewRef = doc(db, 'roteiroReviews', reviewId)
  const roteiroRef = doc(db, 'roteiros', roteiroId)
  await runTransaction(db, async (tx) => {
    const roteiroSnap = await tx.get(roteiroRef)
    tx.delete(reviewRef)
    if (roteiroSnap.exists()) {
      const data = roteiroSnap.data()
      const count = data.reviewCount || 0
      if (count <= 1) {
        tx.update(roteiroRef, { ratingSum: 0, averageRating: 0, reviewCount: 0 })
      } else {
        const newCount = count - 1
        const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
        const newSum = Math.max(0, oldSum - rating)
        tx.update(roteiroRef, {
          ratingSum: newSum,
          averageRating: Math.round((newSum / newCount) * 10) / 10,
          reviewCount: newCount,
        })
      }
    }
  })
}

export async function getRoteiroReviews(roteiroId: string): Promise<RoteiroReview[]> {
  const q = query(collection(db, 'roteiroReviews'), where('roteiroId', '==', roteiroId), orderBy('createdAt', 'desc'), limit(50))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoteiroReview))
}

export async function getRoteiroReviewsByUser(userId: string): Promise<RoteiroReview[]> {
  const q = query(collection(db, 'roteiroReviews'), where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoteiroReview))
}

export async function hasUserReviewedRoteiro(userId: string, roteiroId: string): Promise<boolean> {
  const q = query(collection(db, 'roteiroReviews'), where('userId', '==', userId), where('roteiroId', '==', roteiroId), limit(1))
  const snap = await getDocs(q)
  return !snap.empty
}




// --- ROTEIROS COMPARTILHADOS ---

export interface SharedRoteiro {
  id: string
  name: string
  destination: DestinationSnap
  events: EventSnap[]
  eats: EatSnap[]
  stays: StaySnap[]
  authorId: string
  authorName: string
  authorPhotoUrl?: string
  sharedAt: Timestamp
  ratingSum: number
  averageRating: number
  reviewCount: number
  copyCount: number
  sourceRoteiroId?: string
  tags?: string[]
}

export async function shareRoteiro(
  roteiro: SavedRoteiro,
  authorId: string,
  authorName: string,
  authorPhotoUrl?: string,
  tags?: string[]
): Promise<string> {
  const data = stripUndefined({
    name: roteiro.name,
    destination: roteiro.destination,
    events: roteiro.events,
    eats: roteiro.eats,
    stays: roteiro.stays,
    authorId,
    authorName,
    ...(authorPhotoUrl ? { authorPhotoUrl } : {}),
    ...(tags && tags.length > 0 ? { tags } : {}),
    sourceRoteiroId: roteiro.id,
    sharedAt: serverTimestamp(),
    ratingSum: 0,
    averageRating: 0,
    reviewCount: 0,
    copyCount: 0,
  })
  const ref = await addDoc(collection(db, 'sharedRoteiros'), data)
  return ref.id
}

export async function getSharedRoteiroById(id: string): Promise<SharedRoteiro | null> {
  const snap = await getDoc(doc(db, 'sharedRoteiros', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as SharedRoteiro
}

export async function getSharedRoteirosByUser(authorId: string): Promise<SharedRoteiro[]> {
  const q = query(
    collection(db, 'sharedRoteiros'),
    where('authorId', '==', authorId),
    orderBy('sharedAt', 'desc'),
    limit(30)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SharedRoteiro))
}

export async function deleteSharedRoteiro(id: string): Promise<void> {
  await deleteDoc(doc(db, 'sharedRoteiros', id))
}

export async function copySharedRoteiroToProfile(
  roteiro: SharedRoteiro,
  userId: string,
  authorName: string,
  authorPhotoUrl?: string
): Promise<string> {
  const newData = stripUndefined({
    userId,
    name: `Cópia de ${roteiro.name}`,
    destination: roteiro.destination,
    events: roteiro.events,
    eats: roteiro.eats,
    stays: roteiro.stays,
    authorName,
    ...(authorPhotoUrl ? { authorPhotoUrl } : {}),
    originalRoteiroId: roteiro.id,
    copyCount: 0,
    publishedToExplore: false,
    createdAt: serverTimestamp(),
  })
  const ref = await addDoc(collection(db, 'roteiros'), newData)
  updateDoc(doc(db, 'sharedRoteiros', roteiro.id), { copyCount: increment(1) }).catch(() => {})
  return ref.id
}

export async function addSharedRoteiroReview(review: Omit<RoteiroReview, 'id' | 'createdAt'>): Promise<string> {
  const reviewRef = doc(collection(db, 'roteiroReviews'))
  const roteiroRef = doc(db, 'sharedRoteiros', review.roteiroId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roteiroRef)
    tx.set(reviewRef, { ...review, createdAt: serverTimestamp() })
    if (snap.exists()) {
      const data = snap.data()
      const count = data.reviewCount || 0
      const newCount = count + 1
      const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
      const newSum = oldSum + review.rating
      tx.update(roteiroRef, {
        ratingSum: newSum,
        averageRating: Math.round((newSum / newCount) * 10) / 10,
        reviewCount: newCount,
      })
    }
  })
  return reviewRef.id
}

export async function deleteSharedRoteiroReview(reviewId: string, roteiroId: string, rating: number): Promise<void> {
  const reviewRef = doc(db, 'roteiroReviews', reviewId)
  const roteiroRef = doc(db, 'sharedRoteiros', roteiroId)
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(roteiroRef)
    tx.delete(reviewRef)
    if (snap.exists()) {
      const data = snap.data()
      const count = data.reviewCount || 0
      if (count <= 1) {
        tx.update(roteiroRef, { ratingSum: 0, averageRating: 0, reviewCount: 0 })
      } else {
        const newCount = count - 1
        const oldSum = data.ratingSum ?? (data.averageRating || 0) * count
        const newSum = Math.max(0, oldSum - rating)
        tx.update(roteiroRef, {
          ratingSum: newSum,
          averageRating: Math.round((newSum / newCount) * 10) / 10,
          reviewCount: newCount,
        })
      }
    }
  })
}

export async function reportSharedRoteiro(data: {
  roteiroId: string
  roteiroName: string
  authorId: string
  authorName: string
  reportedBy: string
  reportedByName: string
}): Promise<void> {
  await addDoc(collection(db, 'reports'), {
    reviewType: 'sharedRoteiro',
    roteiroId: data.roteiroId,
    placeName: data.roteiroName,
    reviewUserId: data.authorId,
    reviewUserName: data.authorName,
    reviewRating: 0,
    reviewText: '',
    reportedBy: data.reportedBy,
    reportedByName: data.reportedByName,
    createdAt: serverTimestamp(),
  })
}

export async function hasUserReportedSharedRoteiro(userId: string, roteiroId: string): Promise<boolean> {
  const q = query(
    collection(db, 'reports'),
    where('reportedBy', '==', userId),
    where('roteiroId', '==', roteiroId),
    where('reviewType', '==', 'sharedRoteiro'),
    limit(1)
  )
  const snap = await getDocs(q)
  return !snap.empty
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
  videoUrl?: string
  photoUrl?: string
  recurrence?: 'weekly' | 'monthly_date' | 'monthly_weekday' | null
  plan?: 'free' | 'paid'
  // Comer / Evento (maps link)
  priceRange?: string
  mapsLink?: string
  socialLink?: string
  photos?: string[]
  // Hospedar
  priceFrom?: number
  bookingUrl?: string
  // Contato
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  lat?: number
  lng?: number
  userId?: string
  status: 'pending' | 'approved' | 'rejected' | 'removed'
  publishedId?: string
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
  return docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function getMyAdvertiserRequests(userId: string): Promise<AdvertiserRequest[]> {
  const q = query(collection(db, 'advertiser_requests'), where('userId', '==', userId), limit(50))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdvertiserRequest))
  return docs.sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
}

export async function rejectAdvertiserRequest(id: string, photoUrl?: string, photos?: string[]): Promise<void> {
  const urls = [...(photoUrl ? [photoUrl] : []), ...(photos ?? [])]
  if (urls.length) await deleteCloudinaryImages(urls)
  await updateDoc(doc(db, 'advertiser_requests', id), { status: 'rejected' })
}

export async function deleteAdvertiserRequest(id: string): Promise<void> {
  await deleteDoc(doc(db, 'advertiser_requests', id))
}

async function deleteChildReviews(collectionName: string, field: string, parentId: string): Promise<void> {
  const q = query(collection(db, collectionName), where(field, '==', parentId), limit(200))
  const snap = await getDocs(q)
  const photos = snap.docs.flatMap((d) => (d.data().photos as string[] | undefined) ?? [])
  if (photos.length) await deleteCloudinaryImages(photos)
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)))
}

export async function deleteEvent(id: string, photoUrl?: string): Promise<void> {
  await deleteChildReviews('eventReviews', 'eventId', id)
  if (photoUrl) await deleteCloudinaryImages([photoUrl])
  await deleteDoc(doc(db, 'events', id))
  await retractAdvertiserItem(id)
}

export async function deleteExpiredEvents(): Promise<number> {
  const { isEventExpired } = await import('./events')
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(23, 59, 59, 999)
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'approved'),
    where('date', '<', Timestamp.fromDate(yesterday)),
    orderBy('date', 'asc'),
    limit(300)
  )
  const snap = await getDocs(q)
  const candidates = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoleEvent))
  // Eventos recorrentes nunca expiram — só deleta os únicos
  const expired = candidates.filter((ev) => !ev.recurrence && isEventExpired(ev))
  await Promise.all(expired.map((ev) => deleteEvent(ev.id, ev.photoUrl)))
  return expired.length
}

export async function pruneRejectedSuggestions(): Promise<number> {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 30) // mantém 30 dias para referência
  const q = query(
    collection(db, 'suggestions'),
    where('status', '==', 'rejected'),
    where('createdAt', '<', Timestamp.fromDate(cutoff)),
    limit(200)
  )
  const snap = await getDocs(q)
  await Promise.all(snap.docs.map(async (d) => {
    const photos = d.data().photos as string[] | undefined
    if (photos?.length) await deleteCloudinaryImages(photos)
    await deleteDoc(d.ref)
  }))
  return snap.size
}

export async function deleteEat(id: string, photoUrl?: string, photos?: string[]): Promise<void> {
  await deleteChildReviews('eatReviews', 'eatId', id)
  const urls = [...(photoUrl ? [photoUrl] : []), ...(photos ?? [])]
  if (urls.length) await deleteCloudinaryImages(urls)
  await deleteDoc(doc(db, 'eats', id))
  await retractAdvertiserItem(id)
}

export async function deleteStay(id: string, photoUrl?: string, photos?: string[]): Promise<void> {
  await deleteChildReviews('stayReviews', 'stayId', id)
  const urls = [...(photoUrl ? [photoUrl] : []), ...(photos ?? [])]
  if (urls.length) await deleteCloudinaryImages(urls)
  await deleteDoc(doc(db, 'stays', id))
  await retractAdvertiserItem(id)
}

export async function approveAdvertiserRequest(req: AdvertiserRequest): Promise<void> {
  if (!(['evento', 'comer', 'hospedar'] as const).includes(req.type as 'evento' | 'comer' | 'hospedar')) {
    throw new Error(`Tipo de anúncio desconhecido: ${req.type}`)
  }
  let publishedId: string | undefined
  if (req.type === 'evento') {
    const ref = await addDoc(collection(db, 'events'), {
      name: req.name,
      city: req.city,
      state: req.state,
      description: req.description,
      venue: req.venue || '',
      date: req.date ? Timestamp.fromDate(new Date(`${req.date}T${req.time || '00:00'}:00`)) : serverTimestamp(),
      endDate: req.recurrence ? null : (req.endDate ? Timestamp.fromDate(new Date(`${req.endDate}T${req.endTime || '23:59'}:59`)) : null),
      recurrence: req.recurrence || null,
      price: req.price || null,
      ticketUrl: req.ticketUrl || null,
      videoUrl: req.videoUrl || null,
      mapsLink: req.mapsLink || null,
      lat: req.lat || null,
      lng: req.lng || null,
      category: req.category || 'cultural',
      photoUrl: req.photoUrl || null,
      plan: req.plan || 'free',
      suggestedBy: 'advertiser',
      status: 'approved',
      averageRating: 0,
      reviewCount: 0,
      createdAt: serverTimestamp(),
    })
    publishedId = ref.id
  } else if (req.type === 'comer') {
    const ref = await addDoc(collection(db, 'eats'), {
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
      plan: (req as any).plan || 'paid',
      status: 'approved',
      createdAt: serverTimestamp(),
    })
    publishedId = ref.id
  } else if (req.type === 'hospedar') {
    const ref = await addDoc(collection(db, 'stays'), {
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
      plan: (req as any).plan || 'paid',
      status: 'approved',
      createdAt: serverTimestamp(),
    })
    publishedId = ref.id
  }
  await updateDoc(doc(db, 'advertiser_requests', req.id), { status: 'approved', ...(publishedId ? { publishedId } : {}) })
}

async function retractAdvertiserItem(publishedId: string): Promise<void> {
  const q = query(collection(db, 'advertiser_requests'), where('publishedId', '==', publishedId), limit(1))
  const snap = await getDocs(q)
  if (!snap.empty) {
    await updateDoc(snap.docs[0].ref, { status: 'removed' })
  }
}

// --- USERS / RANK ---

export async function getUserRankLabel(userId: string): Promise<string> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return '🌱 Novato'
  return snap.data().rankLabel ?? '🌱 Novato'
}

export async function updateUserRank(userId: string, rankLabel: string, score: number): Promise<void> {
  await setDoc(doc(db, 'users', userId), { rankLabel, score }, { merge: true })
}

// --- NOTIFICATIONS ---

export interface UserNotification {
  id: string
  userId: string
  type: 'suggestion_rejected' | 'request_rejected'
  title: string
  itemName: string
  reason: string
  read: boolean
  createdAt: Timestamp
}

export async function createRejectionNotification(
  userId: string,
  type: UserNotification['type'],
  itemName: string,
  reason: string
): Promise<void> {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type,
    title: type === 'suggestion_rejected' ? 'Sugestão não aprovada' : 'Solicitação não aprovada',
    itemName,
    reason,
    read: false,
    createdAt: serverTimestamp(),
  })
}

export async function getUserNotifications(userId: string): Promise<UserNotification[]> {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as UserNotification))
    .sort((a, b) => ((b.createdAt as any)?.seconds ?? 0) - ((a.createdAt as any)?.seconds ?? 0))
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true })
}

export async function deleteNotification(notificationId: string): Promise<void> {
  await deleteDoc(doc(db, 'notifications', notificationId))
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notifs = await getUserNotifications(userId)
  await Promise.all(
    notifs.filter((n) => !n.read).map((n) => updateDoc(doc(db, 'notifications', n.id), { read: true }))
  )
}

// --- ADMIN: USER CONTENT ---

export interface AdminReview {
  id: string
  type: 'place' | 'event' | 'eat' | 'stay' | 'roteiro'
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  text?: string
  targetId: string
  targetName?: string
  photos?: string[]
  videoUrl?: string
  priceRange?: '💲' | '💲💲' | '💲💲💲'
  verified?: boolean
  createdAt: Timestamp
}

export async function getRecentAdminReviews(): Promise<AdminReview[]> {
  const [placeSnap, eventSnap, eatSnap, staySnap, roteiroSnap] = await Promise.all([
    getDocs(query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(30))),
    getDocs(query(collection(db, 'eventReviews'), orderBy('createdAt', 'desc'), limit(30))),
    getDocs(query(collection(db, 'eatReviews'), orderBy('createdAt', 'desc'), limit(30))),
    getDocs(query(collection(db, 'stayReviews'), orderBy('createdAt', 'desc'), limit(30))),
    getDocs(query(collection(db, 'roteiroReviews'), orderBy('createdAt', 'desc'), limit(30))),
  ])
  const all: AdminReview[] = [
    ...placeSnap.docs.map((d) => { const r = d.data(); return { id: d.id, type: 'place' as const, userId: r.userId, userName: r.userName, userPhoto: r.userPhoto, rating: r.rating, text: r.text, targetId: r.placeId, targetName: r.placeName, photos: r.photos, verified: r.verified, createdAt: r.createdAt } }),
    ...eventSnap.docs.map((d) => { const r = d.data(); return { id: d.id, type: 'event' as const, userId: r.userId, userName: r.userName, userPhoto: r.userPhoto, rating: r.rating, text: r.text, targetId: r.eventId, targetName: r.eventName, photos: r.photos, createdAt: r.createdAt } }),
    ...eatSnap.docs.map((d) => { const r = d.data(); return { id: d.id, type: 'eat' as const, userId: r.userId, userName: r.userName, userPhoto: r.userPhoto, rating: r.rating, text: r.text, targetId: r.eatId, targetName: r.eatName, photos: r.photos, priceRange: r.priceRange, createdAt: r.createdAt } }),
    ...staySnap.docs.map((d) => { const r = d.data(); return { id: d.id, type: 'stay' as const, userId: r.userId, userName: r.userName, userPhoto: r.userPhoto, rating: r.rating, text: r.text, targetId: r.stayId, targetName: r.stayName, photos: r.photos, priceRange: r.priceRange, createdAt: r.createdAt } }),
    ...roteiroSnap.docs.map((d) => { const r = d.data(); return { id: d.id, type: 'roteiro' as const, userId: r.userId, userName: r.userName, userPhoto: r.userPhoto, rating: r.rating, text: r.text, targetId: r.roteiroId, targetName: r.roteiroName, createdAt: r.createdAt } }),
  ]
  return all.sort((a, b) => ((b.createdAt as any)?.seconds ?? 0) - ((a.createdAt as any)?.seconds ?? 0))
}

export async function adminDeleteReview(r: AdminReview): Promise<void> {
  if (r.type === 'place') {
    await deleteReview(r.id, r.targetId, r.rating, r.photos, r.verified)
  } else if (r.type === 'event') {
    await deleteEventReview(r.id, r.targetId, r.rating, r.photos)
  } else if (r.type === 'eat') {
    await deleteEatReview(r.id, r.targetId, r.rating, r.priceRange ?? '💲💲', r.photos)
  } else if (r.type === 'stay') {
    await deleteStayReview(r.id, r.targetId, r.rating, r.photos)
  } else {
    await deleteSharedRoteiroReview(r.id, r.targetId, r.rating)
  }
}

export async function getAdminSharedRoteiros(): Promise<SharedRoteiro[]> {
  const q = query(collection(db, 'sharedRoteiros'), orderBy('sharedAt', 'desc'), limit(100))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as SharedRoteiro))
}

// --- ADMIN STATS ---

export interface AdminStats {
  sharedRoteiros: number
  reviews: number
  places: number
  roteiros: number
}

export async function getAdminStats(): Promise<AdminStats> {
  const [sharedSnap, reviewSnap, placeSnap, roteiroSnap] = await Promise.all([
    getCountFromServer(collection(db, 'sharedRoteiros')),
    getCountFromServer(collection(db, 'reviews')),
    getCountFromServer(query(collection(db, 'places'), where('status', '==', 'approved'))),
    getCountFromServer(collection(db, 'roteiros')),
  ])
  return {
    sharedRoteiros: sharedSnap.data().count,
    reviews: reviewSnap.data().count,
    places: placeSnap.data().count,
    roteiros: roteiroSnap.data().count,
  }
}

// --- ADMIN: GROWTH METRICS ---

export interface WeekBucket { label: string; count: number }

export interface AdminGrowthStats {
  reviewTotals: { places: number; events: number; eats: number; stays: number; roteiros: number; total: number }
  totalUsers: number
  weeklyReviews: WeekBucket[]
  topUsers: { userId: string; name: string; photo?: string; score: number; rankLabel?: string }[]
}

export async function getAdminGrowthStats(): Promise<AdminGrowthStats> {
  const now = new Date()
  const cutoff = Timestamp.fromDate(new Date(now.getTime() - 56 * 24 * 60 * 60 * 1000))

  const [placesCount, eventsCount, eatsCount, staysCount, roteirosCount, usersCount] = await Promise.all([
    getCountFromServer(collection(db, 'reviews')),
    getCountFromServer(collection(db, 'eventReviews')),
    getCountFromServer(collection(db, 'eatReviews')),
    getCountFromServer(collection(db, 'stayReviews')),
    getCountFromServer(collection(db, 'roteiroReviews')),
    getCountFromServer(collection(db, 'users')),
  ])

  // Recent docs for weekly chart (last 56 days)
  const [placeSnap, eventSnap, eatSnap, staySnap, roteiroSnap] = await Promise.all([
    getDocs(query(collection(db, 'reviews'), where('createdAt', '>=', cutoff), orderBy('createdAt'))),
    getDocs(query(collection(db, 'eventReviews'), where('createdAt', '>=', cutoff), orderBy('createdAt'))),
    getDocs(query(collection(db, 'eatReviews'), where('createdAt', '>=', cutoff), orderBy('createdAt'))),
    getDocs(query(collection(db, 'stayReviews'), where('createdAt', '>=', cutoff), orderBy('createdAt'))),
    getDocs(query(collection(db, 'roteiroReviews'), where('createdAt', '>=', cutoff), orderBy('createdAt'))),
  ])

  // Build 8 weekly buckets (oldest → newest)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const daysBack = (7 - i) * 7
    const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
    const label = start.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    return { start, end, label }
  })

  const weekCounts = new Array(8).fill(0)
  const allDocs = [...placeSnap.docs, ...eventSnap.docs, ...eatSnap.docs, ...staySnap.docs, ...roteiroSnap.docs]
  for (const d of allDocs) {
    const ts = d.data().createdAt?.toDate?.()
    if (!ts) continue
    for (let i = 0; i < weeks.length; i++) {
      if (ts >= weeks[i].start && ts < weeks[i].end) { weekCounts[i]++; break }
    }
  }

  // Top users by score
  const usersSnap = await getDocs(query(collection(db, 'users'), orderBy('score', 'desc'), limit(10)))
  const topUsers = usersSnap.docs
    .filter(d => (d.data().score ?? 0) > 0)
    .map(d => ({
      userId: d.id,
      name: d.data().displayName || d.data().name || '—',
      photo: d.data().photoURL,
      score: d.data().score ?? 0,
      rankLabel: d.data().rankLabel,
    }))

  const total = placesCount.data().count + eventsCount.data().count + eatsCount.data().count + staysCount.data().count + roteirosCount.data().count

  return {
    reviewTotals: {
      places: placesCount.data().count,
      events: eventsCount.data().count,
      eats: eatsCount.data().count,
      stays: staysCount.data().count,
      roteiros: roteirosCount.data().count,
      total,
    },
    totalUsers: usersCount.data().count,
    weeklyReviews: weeks.map((w, i) => ({ label: w.label, count: weekCounts[i] })),
    topUsers,
  }
}
