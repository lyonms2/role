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

// Whitelist de tipos aceitos em text search — qualquer primaryType fora dessa lista é descartado
const ATTRACTION_TYPES = new Set([
  'tourist_attraction', 'natural_feature',
  'park', 'city_park', 'national_park', 'state_park', 'nature_preserve',
  'wildlife_park', 'wildlife_refuge', 'campground', 'hiking_area', 'woods',
  'beach', 'botanical_garden', 'garden', 'zoo', 'aquarium',
  'amusement_park', 'water_park',
  'museum', 'art_gallery', 'historical_landmark', 'performing_arts_theater', 'cultural_center',
  'monument', 'ruins',
])

function isAttraction(place: any): boolean {
  const t = place.primaryType || ''
  if (!t) return true  // sem tipo = provavelmente atração natural sem classificação
  return ATTRACTION_TYPES.has(t)
}

// Subcategory → Google configuration
const CATEGORY_CONFIG: Record<string, { types?: string[]; excludedTypes?: string[]; textQuery?: string; extraTextQuery?: string; nameFilter?: string[] }> = {
  praia:      { types: ['beach'], extraTextQuery: 'praia' },
  cachoeira:  { textQuery: 'cachoeira cascata', extraTextQuery: 'salto cachoeira' },
  trilha:     { textQuery: 'trilha', extraTextQuery: 'caminhada trekking', nameFilter: ['trilha', 'caminhada', 'trekking', 'hiking', 'percurso', 'circuito'] },
  serra:      { textQuery: 'serra montanha chapada' },
  parque:     { types: ['park', 'city_park', 'botanical_garden', 'garden'] },
  zoo:        { types: ['zoo', 'aquarium'] },
  diversoes:  { types: ['amusement_park', 'water_park'] },
  mirante:    { textQuery: 'mirante ponto panorâmico' },
  museu:      { types: ['museum', 'art_gallery'] },
  patrimonio: { types: ['historical_landmark', 'tourist_attraction'], excludedTypes: ['national_park', 'nature_preserve', 'wildlife_park', 'wildlife_refuge', 'campground', 'hiking_area', 'park', 'state_park', 'woods', 'beach'] },
  teatro:     { types: ['performing_arts_theater', 'cultural_center'] },
}

// Google primaryType → PlaceCategory fallback
const TYPE_TO_CATEGORY: Record<string, string> = {
  beach:                    'praia',
  hiking_area:              'trilha',
  campground:               'trilha',
  national_park:            'trilha',
  state_park:               'trilha',
  nature_preserve:          'trilha',
  wildlife_park:            'trilha',
  wildlife_refuge:          'trilha',
  woods:                    'trilha',
  natural_feature:          'natureza',
  historical_landmark:      'cidade_historica',
  tourist_attraction:       'cidade_historica',
  museum:                   'cidade_historica',
  art_gallery:              'cidade_historica',
  performing_arts_theater:  'cidade_historica',
  movie_theater:            'cidade_historica',
  park:                     'parque',
  city_park:                'parque',
  botanical_garden:         'parque',
  garden:                   'parque',
  zoo:                      'parque',
  aquarium:                 'parque',
  amusement_park:           'parque',
  water_park:               'parque',
  playground:               'parque',
  dog_park:                 'parque',
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
      // Text Search para categorias sem tipo direto (cachoeira, serra, mirante)
      const textQueries = [config.textQuery, ...(config.extraTextQuery ? [config.extraTextQuery] : [])]
      const locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } }

      const textResults = await Promise.all(
        textQueries.map((q) =>
          fetch(TEXT_URL, {
            method: 'POST', headers,
            body: JSON.stringify({ textQuery: q, pageSize: 20, languageCode: 'pt-BR', locationBias }),
          }).then(async (r) => {
            if (!r.ok) { console.error('[places] Text Search error', r.status, await r.text()); return [] }
            return ((await r.json()).places || []).filter(isAttraction) as any[]
          })
        )
      )

      const seen = new Set<string>()
      for (const batch of textResults) {
        for (const p of batch) {
          if (!seen.has(p.id)) { seen.add(p.id); places.push(p) }
        }
      }
      if (config?.nameFilter?.length) {
        const words = config.nameFilter
        places = places.filter((p: any) => {
          const name = (p.displayName?.text || '').toLowerCase()
          return words.some((w) => name.includes(w))
        })
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
          'historical_landmark', 'park', 'nature_preserve',
        ],
        ...(config?.excludedTypes ? { excludedTypes: config.excludedTypes } : {}),
      }
      const res = await fetch(NEARBY_URL, { method: 'POST', headers, body: JSON.stringify(body) })
      if (res.ok) {
        const data = await res.json()
        places = data.places || []
        if (config?.nameFilter?.length) {
          const words = config.nameFilter
          places = places.filter((p: any) => {
            if (p.primaryType === 'hiking_area') return true
            const name = (p.displayName?.text || '').toLowerCase()
            return words.some((w) => name.includes(w))
          })
        }

        // Busca segunda página quando disponível (ex: muitas praias em Floripa)
        if (data.nextPageToken && places.length >= 20) {
          const page2Res = await fetch(NEARBY_URL, {
            method: 'POST', headers,
            body: JSON.stringify({ ...body, pageToken: data.nextPageToken }),
          })
          if (page2Res.ok) {
            const page2Data = await page2Res.json()
            const page2Places: any[] = page2Data.places || []
            const existingIds = new Set(places.map((p: any) => p.id))
            places.push(...page2Places.filter((p: any) => !existingIds.has(p.id)))
          }
        }
      } else {
        const errText = await res.text()
        console.error('[places] Nearby Search error', res.status, errText)
        return NextResponse.json({ results: [], debug: { status: res.status, body: errText, types: body.includedTypes } })
      }

      // Text Search extra (ex: praias sem tipo beach, trilhas sem tag hiking_area)
      if (config?.extraTextQuery) {
        const textBody = {
          textQuery: config.extraTextQuery,
          pageSize: 20,
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
          const extra: any[] = (textData.places || []).filter(isAttraction)
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
