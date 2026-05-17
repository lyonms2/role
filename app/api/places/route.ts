import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY
const NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const TEXT_URL = 'https://places.googleapis.com/v1/places:searchText'

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'places.primaryType',
  'places.formattedAddress',
  'places.addressComponents',
  'places.googleMapsUri',
].join(',')

// Rolê category → Google configuration
const CATEGORY_CONFIG: Record<string, { types?: string[]; textQuery?: string }> = {
  praia:            { types: ['beach'] },
  cachoeira:        { textQuery: 'cachoeiras waterfall' },
  trilha:           { types: ['hiking_area'] },
  serra:            { textQuery: 'serras montanhas pico' },
  cidade_historica: { types: ['historical_landmark'] },
  natureza:         { types: ['national_park', 'nature_reserve', 'natural_feature'] },
  parque:           { types: ['park', 'national_park'] },
}

// Google primaryType → Rolê category
const TYPE_TO_CATEGORY: Record<string, string> = {
  beach:               'praia',
  national_park:       'natureza',
  nature_reserve:      'natureza',
  natural_feature:     'natureza',
  park:                'parque',
  hiking_area:         'trilha',
  historical_landmark: 'cidade_historica',
  tourist_attraction:  'cidade_historica',
  mountain_peak:       'serra',
  waterfall:           'cachoeira',
}

function extractCityState(components: any[]): { city: string; state: string } {
  let city = ''
  let state = ''
  for (const comp of components || []) {
    const types: string[] = comp.types || []
    if (!city && (types.includes('locality') || types.includes('administrative_area_level_2'))) {
      city = comp.longText || ''
    }
    if (types.includes('administrative_area_level_1')) {
      state = comp.shortText || ''
    }
  }
  return { city, state }
}

function mapPlace(place: any, fallbackCategory: string) {
  const { city, state } = extractCityState(place.addressComponents || [])
  const photoRef = place.photos?.[0]?.name
  const category = TYPE_TO_CATEGORY[place.primaryType] || fallbackCategory || 'natureza'

  return {
    id: `google_${place.id}`,
    name: place.displayName?.text || '',
    city,
    state,
    category,
    description: '',
    lat: place.location?.latitude || 0,
    lng: place.location?.longitude || 0,
    photoUrl: photoRef ? `/api/photo?name=${encodeURIComponent(photoRef)}` : undefined,
    googlePlaceId: place.id,
    googleMapsUri: place.googleMapsUri || undefined,
    averageRating: place.rating || 0,
    reviewCount: place.userRatingCount || 0,
    verifiedReviewCount: 0,
    status: 'approved' as const,
    source: 'external' as const,
  }
}

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ results: [] })

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '100')
  const category = searchParams.get('category') || ''

  if (!lat || !lng) return NextResponse.json({ results: [] })

  const radiusMeters = Math.min(radius * 1000, 50000)
  const headers = {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': API_KEY,
    'X-Goog-FieldMask': FIELD_MASK,
  }

  try {
    let places: any[] = []
    const config = category ? CATEGORY_CONFIG[category] : null

    if (config?.textQuery) {
      // Text Search para categorias sem tipo direto (cachoeira, serra)
      const body = {
        textQuery: config.textQuery,
        pageSize: 20,
        languageCode: 'pt-BR',
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
      }
      const res = await fetch(TEXT_URL, { method: 'POST', headers, body: JSON.stringify(body) })
      if (res.ok) {
        const data = await res.json()
        places = data.places || []
      }
    } else {
      // Nearby Search para todas as outras categorias
      const body: any = {
        maxResultCount: 20,
        rankPreference: 'POPULARITY',
        languageCode: 'pt-BR',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radiusMeters,
          },
        },
        includedTypes: config?.types || [
          'tourist_attraction', 'national_park', 'beach',
          'historical_landmark', 'park', 'natural_feature',
        ],
      }
      const res = await fetch(NEARBY_URL, { method: 'POST', headers, body: JSON.stringify(body) })
      if (res.ok) {
        const data = await res.json()
        places = data.places || []
      }
    }

    const WATERFALL_WORDS = ['cachoeira', 'waterfall', 'queda d', 'salto']
    const mapped = places.map((p) => mapPlace(p, category))
    const results = mapped.filter((p) => {
      const name = p.name.toLowerCase()
      const primaryType = places.find((pl) => `google_${pl.id}` === p.id)?.primaryType || ''
      if (category === 'trilha') return name.includes('trilha') || name.includes('caminho')
      if (category === 'cachoeira') return primaryType !== 'hiking_area' || WATERFALL_WORDS.some((w) => name.includes(w))
      // Para qualquer categoria específica, descartar resultados com categoria mapeada diferente
      if (category && p.category !== category) return false
      return true
    })
    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
