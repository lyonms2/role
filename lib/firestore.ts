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
import type { Place, PlaceWithDistance, Review, Suggestion, PlaceCategory, RoleEvent, Eat, Stay } from '@/types'
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
    orderBy('averageRating', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Place))
}

export async function getPlacesByCategory(category: PlaceCategory): Promise<Place[]> {
  const q = query(
    collection(db, 'places'),
    where('status', '==', 'approved'),
    where('category', '==', category),
    orderBy('averageRating', 'desc')
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

export async function deleteReview(id: string, placeId: string, rating: number, photos?: string[]): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  await deleteDoc(doc(db, 'reviews', id))
  const placeRef = doc(db, 'places', placeId)
  const placeSnap = await getDoc(placeRef)
  if (placeSnap.exists()) {
    const data = placeSnap.data()
    const count = data.reviewCount || 0
    if (count <= 1) {
      await updateDoc(placeRef, { averageRating: 0, reviewCount: 0 })
    } else {
      const newCount = count - 1
      const newAvg = ((data.averageRating || 0) * count - rating) / newCount
      await updateDoc(placeRef, {
        averageRating: Math.round(newAvg * 10) / 10,
        reviewCount: increment(-1),
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
  const q = query(collection(db, 'suggestions'), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Suggestion))
  return docs.sort((a, b) => (a as any).createdAt?.seconds - (b as any).createdAt?.seconds)
}

export async function rejectSuggestion(id: string, photos?: string[] | null): Promise<void> {
  if (photos?.length) await deleteCloudinaryImages(photos)
  await updateDoc(doc(db, 'suggestions', id), { status: 'rejected' })
}

export async function approveSuggestion(suggestion: Suggestion): Promise<void> {
  const lat = (suggestion as any).lat || 0
  const lng = (suggestion as any).lng || 0
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
  const q = query(collection(db, 'places'), where('status', '==', 'approved'))
  const snap = await getDocs(q)
  let docs = snap.docs.map((d) => ({ id: d.id, ...d.data(), source: 'community' as const } as PlaceWithDistance))
  if (category) docs = docs.filter((p) => p.category === category)
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
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
  const q = query(collection(db, 'suggestions'), where('suggestedBy', '==', userId))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Suggestion))
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
}

// --- USER REVIEWS ---

export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const q = query(collection(db, 'reviews'), where('userId', '==', userId))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
}


// --- EVENTOS ---

export async function getApprovedEvents(city?: string): Promise<RoleEvent[]> {
  const q = query(
    collection(db, 'events'),
    where('status', '==', 'approved'),
    orderBy('date', 'asc')
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

// --- ONDE COMER ---

export async function getApprovedEats(city?: string): Promise<Eat[]> {
  const q = query(
    collection(db, 'eats'),
    where('status', '==', 'approved'),
    orderBy('averageRating', 'desc')
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

// --- ONDE DORMIR ---

export async function getApprovedStays(city?: string): Promise<Stay[]> {
  const q = query(
    collection(db, 'stays'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc')
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
  const q = query(collection(db, 'roteiros'), where('userId', '==', userId))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SavedRoteiro))
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
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
  placeId: string
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
  const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReviewReport))
}

export async function dismissReport(reportId: string): Promise<void> {
  await deleteDoc(doc(db, 'reports', reportId))
}

export async function deleteReviewAndReport(reportId: string, reviewId: string, placeId: string, rating: number): Promise<void> {
  const reviewSnap = await getDoc(doc(db, 'reviews', reviewId))
  const photos = reviewSnap.exists() ? (reviewSnap.data().photos as string[] | undefined) : undefined
  await deleteReview(reviewId, placeId, rating, photos)
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
  price?: string
  ticketUrl?: string
  // Comer
  priceRange?: string
  mapsLink?: string
  // Hospedar
  priceFrom?: number
  bookingUrl?: string
  // Contato
  contactName: string
  contactEmail: string
  contactPhone?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
}

export async function addAdvertiserRequest(
  data: Omit<AdvertiserRequest, 'id' | 'createdAt' | 'status'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'advertiser_requests'), {
    ...data,
    status: 'pending',
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function getAdvertiserRequests(): Promise<AdvertiserRequest[]> {
  const q = query(collection(db, 'advertiser_requests'), where('status', '==', 'pending'))
  const snap = await getDocs(q)
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as AdvertiserRequest))
  return docs.sort((a, b) => (b as any).createdAt?.seconds - (a as any).createdAt?.seconds)
}

export async function rejectAdvertiserRequest(id: string): Promise<void> {
  await updateDoc(doc(db, 'advertiser_requests', id), { status: 'rejected' })
}

export async function approveAdvertiserRequest(req: AdvertiserRequest): Promise<void> {
  if (req.type === 'evento') {
    await addDoc(collection(db, 'events'), {
      name: req.name,
      city: req.city,
      state: req.state,
      description: req.description,
      venue: req.venue || '',
      date: req.date ? Timestamp.fromDate(new Date(req.date)) : serverTimestamp(),
      price: req.price || null,
      ticketUrl: req.ticketUrl || null,
      category: req.category || 'cultural',
      photoUrl: null,
      suggestedBy: 'advertiser',
      status: 'approved',
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
      photoUrl: null,
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
      photoUrl: null,
      averageRating: 0,
      reviewCount: 0,
      suggestedBy: 'advertiser',
      status: 'approved',
      createdAt: serverTimestamp(),
    })
  }
  await updateDoc(doc(db, 'advertiser_requests', req.id), { status: 'approved' })
}
