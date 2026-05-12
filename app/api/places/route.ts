import { NextRequest, NextResponse } from 'next/server'

// Overpass API — busca POIs no OpenStreetMap, gratuito, sem API key
const CATEGORY_TAGS: Record<string, string> = {
  praia: 'natural=beach',
  cachoeira: 'waterway=waterfall',
  serra: 'natural=peak',
  cidade_historica: 'historic=town_gate',
  natureza: 'leisure=nature_reserve',
  parque: 'leisure=park',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = parseInt(searchParams.get('radius') || '100') * 1000
  const category = searchParams.get('category') || ''

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat e lng são obrigatórios' }, { status: 400 })
  }

  const tag = CATEGORY_TAGS[category] || 'tourism=attraction'
  const [key, value] = tag.split('=')

  const query = `
    [out:json][timeout:25];
    (
      node["${key}"="${value}"](around:${Math.min(radius, 50000)},${lat},${lng});
      way["${key}"="${value}"](around:${Math.min(radius, 50000)},${lat},${lng});
    );
    out center body 20;
  `

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
    next: { revalidate: 3600 },
  })

  if (!res.ok) return NextResponse.json({ results: [] })
  const data = await res.json()

  const results = (data.elements || [])
    .filter((el: any) => el.tags?.name)
    .map((el: any) => ({
      id: String(el.id),
      name: el.tags.name,
      city: el.tags['addr:city'] || el.tags['addr:municipality'] || '',
      lat: el.lat ?? el.center?.lat,
      lng: el.lon ?? el.center?.lon,
      rating: 0,
    }))

  return NextResponse.json({ results })
}
