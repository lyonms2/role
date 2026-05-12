import { Timestamp } from 'firebase/firestore'

export type PlaceCategory =
  | 'praia'
  | 'cachoeira'
  | 'serra'
  | 'cidade_historica'
  | 'natureza'
  | 'parque'

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
  bestTime?: string
  text?: string
  verified: boolean
  userLat: number
  userLng: number
  createdAt: Timestamp
}

export interface Tip {
  id: string
  placeId: string
  userId: string
  userName: string
  text: string
  likes: number
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
  photoUrl?: string
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
  cachoeira: '🌊 Cachoeira',
  serra: '🏔️ Serra',
  cidade_historica: '🏛️ Cidade histórica',
  natureza: '🌿 Natureza',
  parque: '🎡 Parque',
}

export const CATEGORY_EMOJIS: Record<PlaceCategory, string> = {
  praia: '🏖️',
  cachoeira: '🌊',
  serra: '🏔️',
  cidade_historica: '🏛️',
  natureza: '🌿',
  parque: '🎡',
}
