import { NextRequest, NextResponse } from 'next/server'

const CATEGORY_TO_TYPES: Record<string, string> = {
  praia: 'natural_feature',
  cachoeira: 'natural_feature',
  serra: 'natural_feature',
  cidade_historica: 'locality',
  natureza: 'park',
  parque: 'park',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = searchParams.get('radius') || '100000'
  const category = searchParams.get('category') || ''
  const key = process.env.GOOGLE_PLACES_KEY

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat e lng são obrigatórios' }, { status: 400 })
  }

  const type = CATEGORY_TO_TYPES[category] || 'tourist_attraction'
  const radiusMeters = Math.min(parseInt(radius) * 1000, 50000)

  const url = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json')
  url.searchParams.set('location', `${lat},${lng}`)
  url.searchParams.set('radius', String(radiusMeters))
  url.searchParams.set('type', type)
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('key', key || '')

  const res = await fetch(url.toString())
  const data = await res.json()

  const results = (data.results || []).map((p: any) => ({
    id: p.place_id,
    name: p.name,
    city: p.vicinity,
    lat: p.geometry.location.lat,
    lng: p.geometry.location.lng,
    photoRef: p.photos?.[0]?.photo_reference || null,
    rating: p.rating || 0,
  }))

  return NextResponse.json({ results })
}
