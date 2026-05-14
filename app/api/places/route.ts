import { NextRequest, NextResponse } from 'next/server'
import type { PlaceCategory } from '@/types'

const OTM_KINDS: Record<string, string> = {
  praia: 'beaches',
  cachoeira: 'waterfalls',
  serra: 'mountains,natural',
  cidade_historica: 'historic,archaeology',
  natureza: 'nature_reserves,natural',
  parque: 'parks,gardens',
}

const ALL_KINDS = 'beaches,waterfalls,mountains,nature_reserves,parks,historic,archaeology'

function mapOTMCategory(kinds: string): PlaceCategory {
  if (kinds.includes('beach')) return 'praia'
  if (kinds.includes('waterfall')) return 'cachoeira'
  if (kinds.includes('mountain')) return 'serra'
  if (kinds.includes('historic') || kinds.includes('archaeolog')) return 'cidade_historica'
  if (kinds.includes('park') || kinds.includes('garden')) return 'parque'
  return 'natureza'
}

function rateToScore(rate: number): number {
  if (rate >= 3) return 4.5
  if (rate >= 2) return 3.5
  return 2.5
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = parseInt(searchParams.get('radius') || '100') * 1000
  const category = searchParams.get('category') || ''
  const key = process.env.OPENTRIPMAP_API_KEY

  if (!lat || !lng) return NextResponse.json({ results: [] })

  if (!key) {
    return NextResponse.json({ results: [], debug: 'OPENTRIPMAP_API_KEY não configurada' })
  }

  const kinds = category && OTM_KINDS[category] ? OTM_KINDS[category] : ALL_KINDS

  const url = new URL('https://api.opentripmap.com/0.1/en/places/radius')
  url.searchParams.set('lat', lat)
  url.searchParams.set('lon', lng)
  url.searchParams.set('radius', String(Math.min(radius, 100000)))
  url.searchParams.set('kinds', kinds)
  url.searchParams.set('rate', '2')
  url.searchParams.set('limit', '20')
  url.searchParams.set('format', 'json')
  url.searchParams.set('apikey', key)

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ results: [], debug: `OpenTripMap ${res.status}: ${text}` })
  }

  const data = await res.json()
  const list: any[] = Array.isArray(data) ? data : (data.features || [])

  const results = list
    .filter((p) => {
      const lat = p.point?.lat ?? p.geometry?.coordinates?.[1]
      return lat && p.name
    })
    .map((p) => {
      const plat = p.point?.lat ?? p.geometry?.coordinates?.[1]
      const plng = p.point?.lon ?? p.geometry?.coordinates?.[0]
      const score = rateToScore(p.rate ?? p.properties?.rate ?? 0)
      const kinds = p.kinds ?? p.properties?.kinds ?? ''
      return {
        id: `otm_${p.xid ?? p.properties?.xid}`,
        name: p.name ?? p.properties?.name,
        city: '',
        state: '',
        lat: plat,
        lng: plng,
        photoUrl: null,
        averageRating: score,
        reviewCount: 0,
        verifiedReviewCount: 0,
        status: 'approved' as const,
        description: '',
        category: mapOTMCategory(kinds),
        fsqCategory: kinds,
        source: 'external' as const,
      }
    })

  return NextResponse.json({ results })
}
