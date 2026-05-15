import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Place, Review, Tip, Suggestion, PlaceCategory, RoleEvent, Eat, Stay, Vehicle } from '@/types'

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

// --- TIPS ---

export async function getTipsByPlace(placeId: string): Promise<Tip[]> {
  const q = query(
    collection(db, 'tips'),
    where('placeId', '==', placeId),
    orderBy('likes', 'desc'),
    limit(20)
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tip))
}

export async function addTip(tip: Omit<Tip, 'id' | 'createdAt' | 'likes'>): Promise<string> {
  const ref = await addDoc(collection(db, 'tips'), {
    ...tip,
    likes: 0,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function likeTip(tipId: string): Promise<void> {
  await updateDoc(doc(db, 'tips', tipId), { likes: increment(1) })
}

// --- SUGGESTIONS ---

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

// --- USER REVIEWS ---

export async function getReviewsByUser(userId: string): Promise<Review[]> {
  const q = query(
    collection(db, 'reviews'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Review))
}

export async function getTipsByUser(userId: string): Promise<Tip[]> {
  const q = query(
    collection(db, 'tips'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tip))
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
    orderBy('averageRating', 'desc')
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

// --- VEÍCULOS ---

export async function getApprovedVehicles(city?: string): Promise<Vehicle[]> {
  const q = query(
    collection(db, 'vehicles'),
    where('status', '==', 'approved'),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Vehicle))
  if (!city) return all
  return all.filter((v) => v.city.toLowerCase().includes(city.toLowerCase()))
}

export async function addVehicle(vehicle: Omit<Vehicle, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'vehicles'), { ...vehicle, createdAt: serverTimestamp() })
  return ref.id
}
