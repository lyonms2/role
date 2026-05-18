import { Timestamp } from 'firebase/firestore'

export type PlaceCategory =
  | 'praia'
  | 'cachoeira'
  | 'serra'
  | 'cidade_historica'
  | 'natureza'
  | 'parque'
  | 'trilha'

export interface Place {
  id: string
  name: string
  city: string
  state: string
  category: PlaceCategory
  description: string
  lat: number
  lng: number
  googlePlaceId?: string
  photoUrl?: string
  photos?: string[]
  averageRating: number
  reviewCount: number
  verifiedReviewCount: number
  status: 'approved' | 'pending'
  createdAt: Timestamp
  suggestedBy?: string
}

export interface PlaceWithDistance extends Place {
  distanceKm?: number
  durationMin?: number
  weather?: WeatherData
  source?: 'firestore' | 'external' | 'community' | 'event'
  fsqCategory?: string
  photoUrl?: string
  googlePlaceId?: string
  mapsLink?: string
  photos?: string[]
  subtitle?: string
}

export interface Review {
  id: string
  placeId: string
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  crowded: 'sim' | 'nao' | 'moderado'
  familyFriendly: boolean
  signal?: 'good' | 'weak' | 'none'
  bestTime?: string
  text?: string
  photos?: string[]
  verified: boolean
  userLat: number
  userLng: number
  placeName?: string
  googlePlaceId?: string
  createdAt: Timestamp
}

export interface Suggestion {
  id: string
  name: string
  city: string
  state: string
  category: string
  description: string
  mapsLink?: string
  photos?: string[]
  videoUrl?: string
  suggestedBy: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Timestamp
}

export interface WeatherData {
  temp: number
  condition: string
  icon: string
  humidity: number
  description: string
}

export interface SearchParams {
  city: string
  lat: number
  lng: number
  radius: number
  category?: PlaceCategory
}

export const CATEGORY_LABELS: Record<PlaceCategory, string> = {
  praia: '🏖️ Praia',
  cachoeira: '💧 Cachoeira',
  trilha: '🥾 Trilha',
  serra: '🏔️ Serra',
  cidade_historica: '🏛️ Histórico',
  natureza: '🌿 Natureza',
  parque: '🎡 Praças e Lazer',
}

// Mapeia category ID do Foursquare para nosso tipo
export function mapFsqCategory(fsqCategoryId?: number): PlaceCategory {
  if (!fsqCategoryId) return 'natureza'
  if (fsqCategoryId === 16001) return 'praia'
  if (fsqCategoryId === 16039) return 'cachoeira'
  if (fsqCategoryId === 16026) return 'serra'
  if (fsqCategoryId === 16020) return 'cidade_historica'
  if ([16028, 16036, 16029].includes(fsqCategoryId)) return 'natureza'
  if ([16030, 16032].includes(fsqCategoryId)) return 'parque'
  if ([16031, 16033].includes(fsqCategoryId)) return 'trilha'
  return 'natureza'
}

export const CATEGORY_EMOJIS: Record<PlaceCategory, string> = {
  praia: '🏖️',
  cachoeira: '🌊',
  trilha: '🥾',
  serra: '🏔️',
  cidade_historica: '🏛️',
  natureza: '🌿',
  parque: '🎡',
}

// ──────────────────────────────────────────────
// EVENTOS
// ──────────────────────────────────────────────
export type EventCategory = 'show' | 'festival' | 'feira' | 'esportivo' | 'cultural' | 'teatro'

export interface RoleEvent {
  id: string
  name: string
  city: string
  state: string
  description: string
  venue: string
  date: Timestamp
  endDate?: Timestamp
  price?: string
  category: EventCategory
  photoUrl?: string
  ticketUrl?: string
  mapsLink?: string
  lat?: number
  lng?: number
  durationMin?: number
  suggestedBy: string
  status: 'pending' | 'approved'
  averageRating?: number
  reviewCount?: number
  createdAt: Timestamp
}

export interface EventReview {
  id: string
  eventId: string
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  crowded: 'sim' | 'nao' | 'moderado'
  familyFriendly: boolean
  text?: string
  photos?: string[]
  createdAt: Timestamp
}

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  show: '🎤 Show',
  festival: '🎪 Festival',
  feira: '🏪 Feira',
  esportivo: '⚽ Esportivo',
  cultural: '🎭 Cultural',
  teatro: '🎬 Teatro',
}

// ──────────────────────────────────────────────
// ONDE COMER
// ──────────────────────────────────────────────
export type EatCategory = 'restaurante' | 'bar' | 'cafe' | 'food_truck' | 'sorveteria' | 'padaria'

export interface Eat {
  id: string
  name: string
  city: string
  state: string
  description: string
  category: EatCategory
  priceRange: '💲' | '💲💲' | '💲💲💲'
  photoUrl?: string
  photos?: string[]
  mapsLink?: string
  socialLink?: string
  averageRating: number
  reviewCount: number
  suggestedBy: string
  status: 'pending' | 'approved'
  createdAt: Timestamp
}

export const EAT_CATEGORY_LABELS: Record<EatCategory, string> = {
  restaurante: '🍽️ Restaurante',
  bar: '🍺 Bar',
  cafe: '☕ Café',
  food_truck: '🚚 Food Truck',
  sorveteria: '🍦 Sorveteria',
  padaria: '🥐 Padaria',
}

// ──────────────────────────────────────────────
// ONDE DORMIR
// ──────────────────────────────────────────────
export type StayCategory = 'hotel' | 'pousada' | 'hostel' | 'camping' | 'chale' | 'resort'

export interface Stay {
  id: string
  name: string
  city: string
  state: string
  description: string
  category: StayCategory
  priceFrom?: number
  photoUrl?: string
  photos?: string[]
  bookingUrl?: string
  mapsLink?: string
  socialLink?: string
  averageRating: number
  reviewCount: number
  suggestedBy: string
  status: 'pending' | 'approved'
  createdAt: Timestamp
}

export const STAY_CATEGORY_LABELS: Record<StayCategory, string> = {
  hotel: '🏨 Hotel',
  pousada: '🏡 Pousada',
  hostel: '🛏️ Hostel',
  camping: '⛺ Camping',
  chale: '🌲 Chalé',
  resort: '🏖️ Resort',
}


