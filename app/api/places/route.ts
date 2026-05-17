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
const CATEGORY_CONFIG: Record<string, { types?: string[]; textQuery?: string; extraTextQuery?: string }> = {
  praia:            { types: ['beach', 'marina'] },
  natureza:         { types: ['hiking_area', 'national_park', 'nature_reserve', 'campground'], extraTextQuery: 'cachoeira' },
  cidade_historica: { types: ['historical_landmark', 'tourist_attraction'] },
  parque:           { types: ['park', 'botanical_garden', 'zoo', 'amusement_park', 'water_park', 'aquarium'] },
}

// Google primaryType → Rolê category
const TYPE_TO_CATEGORY: Record<string, string> = {
  beach:               'praia',
  marina:              'praia',
  hiking_area:         'natureza',
  national_park:       'natureza',
  nature_reserve:      'natureza',
  natural_feature:     'natureza',
  campground:          'natureza',
  historical_landmark: 'cidade_historica',
  tourist_attraction:  'cidade_historica',
  park:                'parque',
  botanical_garden:    'parque',
  zoo:                 'parque',
  amusement_park:      'parque',
  water_park:          'parque',
  aquarium:            'parque',
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
      } else {
        const errText = await res.text()
        console.error('[places] Nearby Search error', res.status, errText)
        return NextResponse.json({ results: [], debug: { status: res.status, body: errText, types: body.includedTypes } })
      }

      // Text Search extra (ex: cachoeiras para natureza)
      if (config?.extraTextQuery) {
        const textBody = {
          textQuery: config.extraTextQuery,
          pageSize: 10,
          languageCode: 'pt-BR',
          locationBias: {
            circle: {
              center: { latitude: lat, longitude: lng },
              radius: radiusMeters,
            },
          },
        }
        const textRes = await fetch(TEXT_URL, { method: 'POST', headers, body: JSON.stringify(textBody) })
        if (textRes.ok) {
          const textData = await textRes.json()
          const extra: any[] = textData.places || []
          const existingIds = new Set(places.map((p: any) => p.id))
          places.push(...extra.filter((p: any) => !existingIds.has(p.id)))
        }
      }
    }

    const mapped = places.map((p) => mapPlace(p, category))
    const results = mapped.filter((p) => p.lat !== 0 && p.lng !== 0)
    return NextResponse.json({ results }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
    })
  } catch (e) {
    console.error('[places] exception', e)
    return NextResponse.json({ results: [] })
  }
}
