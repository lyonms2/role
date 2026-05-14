import { NextRequest, NextResponse } from 'next/server'
import { mapFsqCategory } from '@/types'

// Foursquare v3 category IDs para atrações brasileiras
const FSQ_CATEGORIES: Record<string, string> = {
  praia: '16001',            // Beach
  cachoeira: '16039',        // Waterfall
  serra: '16026',            // Mountain
  cidade_historica: '16020', // Historic & Protected Site
  natureza: '16028,16036',   // Nature Preserve + State/Provincial Park
  parque: '16030',           // Park
}

const FSQ_QUERY: Record<string, string> = {
  praia: 'praia',
  cachoeira: 'cachoeira',
  serra: 'serra montanha',
  cidade_historica: 'centro historico turismo',
  natureza: 'reserva natural parque',
  parque: 'parque',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')
  const radius = parseInt(searchParams.get('radius') || '100') * 1000
  const category = searchParams.get('category') || ''
  const key = process.env.FOURSQUARE_API_KEY

  if (!lat || !lng) {
    return NextResponse.json({ results: [] })
  }

  if (!key) {
    return NextResponse.json({ results: [], debug: 'FOURSQUARE_API_KEY não configurada' })
  }

  const url = new URL('https://api.foursquare.com/v3/places/search')
  url.searchParams.set('ll', `${lat},${lng}`)
  url.searchParams.set('radius', String(Math.min(radius, 100000)))
  url.searchParams.set('limit', '20')
  url.searchParams.set('fields', 'fsq_id,name,location,geocodes,categories,photos,rating,description')
  url.searchParams.set('sort', 'RATING')

  if (category && FSQ_CATEGORIES[category]) {
    url.searchParams.set('categories', FSQ_CATEGORIES[category])
  }
  if (category && FSQ_QUERY[category]) {
    url.searchParams.set('query', FSQ_QUERY[category])
  } else if (!category) {
    // Sem categoria: busca atrações turísticas gerais
    url.searchParams.set('categories', '16000')
    url.searchParams.set('query', 'turismo atração')
  }

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: key,
      Accept: 'application/json',
    },
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ results: [], debug: `Foursquare ${res.status}: ${text}` })
  }

  const data = await res.json()

  const results = (data.results || [])
    .filter((p: any) => p.geocodes?.main?.latitude && p.name)
    .map((p: any) => ({
      id: `fsq_${p.fsq_id}`,
      name: p.name,
      city: p.location?.locality || p.location?.region || '',
      state: p.location?.region || '',
      lat: p.geocodes.main.latitude,
      lng: p.geocodes.main.longitude,
      photoUrl: p.photos?.[0]
        ? `${p.photos[0].prefix}400x300${p.photos[0].suffix}`
        : null,
      rating: p.rating ? Math.round((p.rating / 2) * 10) / 10 : 0,
      description: p.description || '',
      category: mapFsqCategory(p.categories?.[0]?.id),
      fsqCategory: p.categories?.[0]?.name || '',
      source: 'foursquare',
    }))

  return NextResponse.json({ results, debug: { total: data.results?.length, mapped: results.length } })
}
