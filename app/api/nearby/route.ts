import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY!

const INCLUDED_TYPES: Record<string, string[]> = {
  events: ['night_club', 'performing_arts_theater', 'movie_theater', 'stadium', 'comedy_club', 'karaoke', 'bowling_alley'],
  eats: ['restaurant', 'cafe', 'bakery', 'bar'],
  stays: ['lodging'],
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
    if (types.includes('cafe')) return 'Café'
    if (types.includes('bakery')) return 'Padaria'
    if (types.includes('bar')) return 'Bar'
    return 'Restaurante'
  }
  if (section === 'stays') {
    if (types.includes('hostel_or_backpacker_accommodation')) return 'Hostel'
    if (types.includes('motel')) return 'Pousada'
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
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const type = searchParams.get('type') as string

  if (!lat || !lng || !INCLUDED_TYPES[type]) {
    return NextResponse.json({ results: [] })
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.types,places.priceLevel,places.shortFormattedAddress,places.rating,places.userRatingCount,places.location',
      },
      body: JSON.stringify({
        includedTypes: INCLUDED_TYPES[type],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
            radius: 15000,
          },
        },
      }),
      next: { revalidate: 3600 },
    })

    if (!res.ok) return NextResponse.json({ results: [] })
    const data = await res.json()
    const places: any[] = data.places || []

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

      if (type === 'eats') {
        return { id: `g_${p.id}`, name, category: cat, priceRange: PRICE_MAP[priceLevel] || '💲💲', priceLevel, address, rating, reviewCount, googlePlaceId, lat, lng }
      }
      if (type === 'stays') {
        return { id: `g_${p.id}`, name, category: cat, priceFrom: null, priceLevel, address, rating, reviewCount, googlePlaceId, lat, lng }
      }
      return { id: `g_${p.id}`, name, venue: address, date: null, category: cat, rating, reviewCount, googlePlaceId, lat, lng }
    })

    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'public, s-maxage=3600' } })
  } catch {
    return NextResponse.json({ results: [] })
  }
}
