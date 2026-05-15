import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

const FIELD_MASK = [
  'id',
  'displayName',
  'location',
  'rating',
  'userRatingCount',
  'photos',
  'reviews',
  'editorialSummary',
  'regularOpeningHours',
  'nationalPhoneNumber',
  'websiteUri',
  'formattedAddress',
  'addressComponents',
  'primaryType',
  'googleMapsUri',
  'priceLevel',
].join(',')

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

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ place: null }, { status: 503 })

  const placeId = req.nextUrl.searchParams.get('placeId')
  if (!placeId) return NextResponse.json({ place: null }, { status: 400 })

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    console.error(`[places/google] ${res.status} para placeId=${placeId}`)
    return NextResponse.json({ place: null }, { status: 404 })
  }

  const d = await res.json()
  const { city, state } = extractCityState(d.addressComponents || [])

  const place = {
    googlePlaceId: d.id,
    name: d.displayName?.text || '',
    city,
    state,
    lat: d.location?.latitude || 0,
    lng: d.location?.longitude || 0,
    description: d.editorialSummary?.text || '',
    address: d.formattedAddress || '',
    rating: d.rating || 0,
    reviewCount: d.userRatingCount || 0,
    phone: d.nationalPhoneNumber || null,
    website: d.websiteUri || null,
    googleMapsUri: d.googleMapsUri || null,
    openNow: d.regularOpeningHours?.openNow ?? null,
    weekdayDescriptions: d.regularOpeningHours?.weekdayDescriptions || [],
    photos: (d.photos || []).slice(0, 8).map((p: any) => ({
      name: p.name,
      url: `/api/photo?name=${encodeURIComponent(p.name)}&w=900&h=600`,
    })),
    reviews: (d.reviews || []).map((r: any) => ({
      author: r.authorAttribution?.displayName || 'Usuário Google',
      authorPhoto: r.authorAttribution?.photoUri || null,
      rating: r.rating || 0,
      time: r.relativePublishTimeDescription || '',
      text: r.text?.text || r.originalText?.text || '',
    })),
    primaryType: d.primaryType || '',
  }

  return NextResponse.json({ place }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=300' },
  })
}
