import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')
  if (!input || input.length < 2) return NextResponse.json({ predictions: [] })

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', input)
  url.searchParams.set('format', 'json')
  url.searchParams.set('countrycodes', 'br')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('limit', '5')
  // Nominatim exige User-Agent identificando o app
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'role-app/1.0 (contato@role.app)' },
    next: { revalidate: 3600 },
  })

  if (!res.ok) return NextResponse.json({ predictions: [] })
  const data = await res.json()

  const predictions = (data as any[]).map((item) => {
    const addr = item.address || {}
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
    const state = addr.state || ''
    const stateCode = addr.ISO3166_2_lvl4?.replace('BR-', '') || addr.state_code || ''
    const label = city ? `${city}, ${state}` : item.display_name.split(',').slice(0, 2).join(',').trim()

    return {
      place_id: String(item.place_id),
      description: label,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      cityName: city,
      stateCode,
    }
  })

  return NextResponse.json({ predictions })
}
