import { NextRequest, NextResponse } from 'next/server'

// Com Nominatim, lat/lng já vêm no autocomplete.
// Este endpoint existe como fallback caso o front precise buscar por place_id.
export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id')
  if (!placeId) return NextResponse.json({ location: null })

  const url = new URL('https://nominatim.openstreetmap.org/lookup')
  url.searchParams.set('osm_ids', `R${placeId}`)
  url.searchParams.set('format', 'json')

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'letsapp/1.0 (leonardomorenodasilva3@gmail.com)' },
  })

  if (!res.ok) return NextResponse.json({ location: null })
  const data = await res.json()
  const item = (data as any[])[0]
  if (!item) return NextResponse.json({ location: null })

  return NextResponse.json({
    location: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
  })
}
