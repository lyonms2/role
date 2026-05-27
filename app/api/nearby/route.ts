import { NextRequest, NextResponse } from 'next/server'
import { normalize } from '@/lib/utils'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

const INCLUDED_TYPES: Record<string, string[]> = {
  events: ['night_club', 'performing_arts_theater', 'movie_theater', 'stadium', 'comedy_club', 'karaoke', 'bowling_alley'],
  eats: [
    'restaurant', 'cafe', 'bakery', 'bar',
    'fast_food_restaurant', 'seafood_restaurant', 'meal_takeaway', 'meal_delivery',
    'pizza_restaurant', 'barbecue_restaurant', 'brazilian_restaurant', 'hamburger_restaurant',
    'steak_house', 'sandwich_shop', 'ice_cream_shop', 'coffee_shop',
    'brunch_restaurant', 'breakfast_restaurant', 'sushi_restaurant',
    'italian_restaurant', 'chinese_restaurant', 'japanese_restaurant',
    'american_restaurant', 'mediterranean_restaurant', 'vegetarian_restaurant',
  ],
  stays: ['lodging'],
}

const EATS_PRIMARY_TYPE_BLOCKLIST = new Set([
  'tourist_attraction', 'museum', 'art_gallery', 'castle', 'church',
  'hindu_temple', 'mosque', 'synagogue', 'cemetery', 'park',
  'national_park', 'natural_feature', 'campground', 'rv_park',
  'lodging', 'hotel', 'motel', 'hostel',
  'grocery_store', 'supermarket', 'convenience_store', 'market',
  'wholesale_store', 'drugstore', 'pharmacy', 'gas_station',
  'department_store', 'home_goods_store', 'hardware_store', 'store',
  'school', 'university', 'hospital', 'doctor', 'dentist', 'gym',
  'car_dealer', 'car_repair', 'car_wash', 'bank', 'atm',
])

const EATS_NAME_BLOCKLIST = [
  'mercado', 'supermercado', 'supermarket', 'atacado', 'atacadão',
  'armazém', 'armazem', 'empório', 'emporio', 'minimercado', 'mercearia',
  'quitanda', 'hortifrutti', 'hortifruti', 'sacolão', 'sacolao',
  'conveniência', 'conveniencia', 'farmácia', 'farmacia', 'drogaria',
  'posto ', 'magazine', 'hipermercado',
]

const STAYS_NAME_FILTER = [
  'pousada', 'cabana', 'chalé', 'chale', 'hotel', 'motel',
  'hostel', 'hospedagem', 'albergue', 'resort', 'lodge', 'inn',
  'flat', 'apart', 'suite', 'suites', 'villa', 'bangalô', 'bangalo',
  'glamping', 'camping', 'acampamento', 'refúgio', 'refugio',
  'recanto', 'retiro', 'estalagem', 'sitio', 'sítio', 'chacara', 'chácara',
  'rancho', 'colônia', 'colonia', 'fazenda', 'haras', 'eco',
]

const STAYS_BYPASS_TYPES = new Set([
  'lodging', 'hotel', 'motel', 'extended_stay_hotel', 'resort_hotel',
  'hostel_or_backpacker_accommodation', 'bed_and_breakfast', 'guest_house',
  'campground', 'cottage',
])

function eatsBlocked(place: any): boolean {
  const primaryType: string = place.primaryType || ''
  if (primaryType && EATS_PRIMARY_TYPE_BLOCKLIST.has(primaryType)) return true
  const n = normalize(place.displayName?.text || '')
  return EATS_NAME_BLOCKLIST.some((w) => n.includes(normalize(w)))
}

const PRICE_MAP: Record<string, string> = {
  PRICE_LEVEL_FREE: 'Gratuito',
  PRICE_LEVEL_INEXPENSIVE: '💲',
  PRICE_LEVEL_MODERATE: '💲💲',
  PRICE_LEVEL_EXPENSIVE: '💲💲💲',
  PRICE_LEVEL_VERY_EXPENSIVE: '💲💲💲',
}

function mapCategory(types: string[], section: string): string {
  if (section === 'eats') {
    if (types.includes('cafe') || types.includes('coffee_shop')) return 'Café'
    if (types.includes('bakery')) return 'Padaria'
    if (types.includes('bar')) return 'Bar'
    if (types.includes('seafood_restaurant')) return 'Frutos do Mar'
    if (types.includes('pizza_restaurant')) return 'Pizzaria'
    if (types.includes('barbecue_restaurant') || types.includes('steak_house')) return 'Churrascaria'
    if (types.includes('ice_cream_shop')) return 'Sorveteria'
    if (types.includes('fast_food_restaurant') || types.includes('hamburger_restaurant') || types.includes('sandwich_shop')) return 'Lanche'
    if (types.includes('sushi_restaurant') || types.includes('japanese_restaurant')) return 'Japonês'
    return 'Restaurante'
  }
  if (section === 'stays') {
    if (types.includes('hostel_or_backpacker_accommodation')) return 'Hostel'
    if (types.includes('bed_and_breakfast') || types.includes('guest_house')) return 'Pousada'
    if (types.includes('campground')) return 'Camping'
    if (types.includes('cottage') || types.includes('farm')) return 'Chalé'
    if (types.includes('resort_hotel')) return 'Resort'
    if (types.includes('motel')) return 'Motel'
    return 'Hotel'
  }
  // events
  if (types.includes('night_club')) return 'show'
  if (types.includes('performing_arts_theater')) return 'teatro'
  if (types.includes('stadium')) return 'esportivo'
  if (types.includes('movie_theater')) return 'cultural'
  if (types.includes('amusement_park')) return 'festival'
  return 'cultural'
}

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ results: [] }, { status: 503 })

  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const type = searchParams.get('type') as string
  const radius = Math.min(parseInt(searchParams.get('radius') || '8000'), 30000)

  if (!lat || !lng || !INCLUDED_TYPES[type]) {
    return NextResponse.json({ results: [] })
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.primaryType,places.priceLevel,places.shortFormattedAddress,places.rating,places.userRatingCount,places.location,places.photos',
      },
      body: JSON.stringify({
        includedTypes: INCLUDED_TYPES[type],
        maxResultCount: 20,
        rankPreference: 'DISTANCE',
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius,
          },
        },
      }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()
    let places: any[] = data.places || []

    if (type === 'eats') {
      places = places.filter((p) => !eatsBlocked(p))
    }
    if (type === 'stays') {
      const words = STAYS_NAME_FILTER.map(normalize)
      places = places.filter((p) => {
        if (STAYS_BYPASS_TYPES.has(p.primaryType)) return true
        const n = normalize(p.displayName?.text || '')
        return words.some((w) => n.includes(w))
      })
    }

    const results = places.map((p) => {
      const name = p.displayName?.text || 'Sem nome'
      const types: string[] = p.types || []
      const cat = mapCategory(types, type)
      const address: string = p.shortFormattedAddress || ''
      const rating: number | undefined = p.rating ?? undefined
      const reviewCount: number | undefined = p.userRatingCount ?? undefined
      const googlePlaceId: string = p.id
      const lat: number | undefined = p.location?.latitude ?? undefined
      const lng: number | undefined = p.location?.longitude ?? undefined
      const priceLevel: string = p.priceLevel || ''
      const firstPhoto = p.photos?.[0]?.name
      const photoUrl = firstPhoto ? `/api/photo?name=${encodeURIComponent(firstPhoto)}&w=400&h=300` : undefined

      if (type === 'eats') {
        return { id: `g_${p.id}`, name, category: cat, priceRange: PRICE_MAP[priceLevel] || '💲💲', priceLevel, address, rating, reviewCount, googlePlaceId, lat, lng, photoUrl }
      }
      if (type === 'stays') {
        return { id: `g_${p.id}`, name, category: cat, priceFrom: null, priceLevel, address, rating, reviewCount, googlePlaceId, lat, lng, photoUrl }
      }
      return { id: `g_${p.id}`, name, venue: address, date: null, category: cat, rating, reviewCount, googlePlaceId, lat, lng, photoUrl }
    })

    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
