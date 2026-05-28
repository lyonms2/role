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
  reviewerRank?: string
  createdAt: Timestamp
}

export interface Suggestion {
  id: string
  name: string
  city: string
  state: string
  category: string
  description: string
  lat?: number
  lng?: number
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


export const CATEGORY_EMOJIS: Record<PlaceCategory, string> = {
  praia: '🏖️',
  cachoeira: '💧',
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
  eventName?: string
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  crowded: 'tranquilo' | 'moderado' | 'lotado' | 'sim' | 'nao'
  organization?: 'otima' | 'boa' | 'ruim'
  priceRange?: '💲' | '💲💲' | '💲💲💲'
  familyFriendly: boolean
  text?: string
  photos?: string[]
  verified?: boolean
  userLat?: number
  userLng?: number
  reviewerRank?: string
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
  lat?: number
  lng?: number
  photoUrl?: string
  photos?: string[]
  mapsLink?: string
  socialLink?: string
  averageRating: number
  reviewCount: number
  suggestedBy: string
  plan?: 'free' | 'paid'
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
  priceRange?: '💲' | '💲💲' | '💲💲💲'
  communityPriceSum?: number
  lat?: number
  lng?: number
  photoUrl?: string
  photos?: string[]
  bookingUrl?: string
  mapsLink?: string
  socialLink?: string
  averageRating: number
  reviewCount: number
  suggestedBy: string
  plan?: 'free' | 'paid'
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

export interface EatReview {
  id: string
  eatId: string
  eatName?: string
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  crowded: 'tranquilo' | 'moderado' | 'lotado'
  foodQuality: 'otima' | 'boa' | 'ruim'
  priceRange: '💲' | '💲💲' | '💲💲💲'
  text: string
  photos?: string[]
  verified?: boolean
  userLat?: number
  userLng?: number
  reviewerRank?: string
  createdAt: Timestamp
}

export interface StayReview {
  id: string
  stayId: string
  stayName?: string
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  familyFriendly: boolean
  cleanliness: 'impecavel' | 'boa' | 'ruim'
  service: 'excelente' | 'bom' | 'ruim'
  priceRange?: '💲' | '💲💲' | '💲💲💲'
  text: string
  photos?: string[]
  verified?: boolean
  userLat?: number
  userLng?: number
  reviewerRank?: string
  createdAt: Timestamp
}

export interface RoteiroReview {
  id: string
  roteiroId: string
  roteiroName?: string
  userId: string
  userName: string
  userPhoto?: string
  rating: number
  text: string
  reviewerRank?: string
  createdAt: Timestamp
}
