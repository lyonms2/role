import { NextRequest, NextResponse } from 'next/server'
import type { PlaceCategory } from '@/types'

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter'

const CATEGORY_TAGS: Record<string, Array<[string, string]>> = {
  praia:            [['natural', 'beach'], ['leisure', 'beach_resort']],
  cachoeira:        [['waterway', 'waterfall']],
  serra:            [['natural', 'peak']],
  cidade_historica: [['historic', '*']],
  natureza:         [['leisure', 'nature_reserve'], ['boundary', 'national_park']],
  parque:           [['leisure', 'park']],
}

const ALL_TAGS: Array<[string, string]> = [
  ['natural', 'beach'],
  ['waterway', 'waterfall'],
  ['natural', 'peak'],
  ['historic', '*'],
  ['leisure', 'park'],
  ['leisure', 'nature_reserve'],
  ['boundary', 'national_park'],
]

function mapOSMCategory(tags: Record<string, string>): PlaceCategory {
  if (tags.natural === 'beach' || tags.leisure === 'beach_resort') return 'praia'
  if (tags.waterway === 'waterfall') return 'cachoeira'
  if (tags.natural === 'peak') return 'serra'
  if (tags.historic) return 'cidade_historica'
  if (tags.leisure === 'nature_reserve' || tags.boundary === 'national_park') return 'natureza'
  if (tags.leisure === 'park') return 'parque'
  return 'natureza'
}

function buildQuery(lat: string, lng: string, radiusM: number, category: string): string {
  const tags = category && CATEGORY_TAGS[category] ? CATEGORY_TAGS[category] : ALL_TAGS
  const r = Math.min(radiusM, 100000)

  const parts = tags.flatMap(([key, value]) => {
    const f = value === '*' ? `[${key}]` : `[${key}=${value}]`
    return [
      `node(around:${r},${lat},${lng})${f}[name];`,
      `way(around:${r},${lat},${lng})${f}[name];`,
    ]
  })

  return `[out:json][timeout:25];\n(\n  ${parts.join('\n  ')}\n);\nout center;`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = parseInt(searchParams.get('radius') || '100') * 1000
  const category = searchParams.get('category') || ''

  if (!lat || !lng) return NextResponse.json({ results: [] })

  const query = buildQuery(lat, lng, radius, category)

  const overpassUrl = `${OVERPASS_URL}?data=${encodeURIComponent(query)}`

  let res: Response
  try {
    res = await fetch(overpassUrl, {
      headers: {
        'User-Agent': 'RoleApp/1.0 (travel discovery app)',
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 },
    })
  } catch (err) {
    return NextResponse.json({ results: [], debug: `Overpass network error: ${err}` })
  }

  if (!res.ok) {
    return NextResponse.json({ results: [], debug: `Overpass ${res.status}` })
  }

  const data = await res.json()
  const elements: any[] = data.elements || []

  // Deduplica por posição aproximada (~1km)
  const seen = new Set<string>()

  const results = elements
    .filter((el) => {
      const elLat = el.lat ?? el.center?.lat
      const elLng = el.lon ?? el.center?.lon
      if (!elLat || !elLng || !el.tags?.name) return false
      const key = `${Math.round(elLat * 100)},${Math.round(elLng * 100)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 20)
    .map((el) => ({
      id: `osm_${el.type}_${el.id}`,
      name: el.tags.name,
      city: el.tags['addr:city'] || el.tags['is_in:city'] || '',
      state: el.tags['addr:state'] || el.tags['is_in:state'] || '',
      lat: el.lat ?? el.center.lat,
      lng: el.lon ?? el.center.lon,
      photoUrl: null,
      averageRating: 0,
      reviewCount: 0,
      verifiedReviewCount: 0,
      status: 'approved' as const,
      description: el.tags['description:pt'] || el.tags.description || '',
      category: mapOSMCategory(el.tags),
      fsqCategory: '',
      source: 'external' as const,
    }))

  return NextResponse.json({ results })
}
