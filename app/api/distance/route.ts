import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get('origin')
  const destinations = req.nextUrl.searchParams.get('destinations')
  const key = process.env.GOOGLE_DISTANCE_KEY

  if (!origin || !destinations) {
    return NextResponse.json({ error: 'origin e destinations são obrigatórios' }, { status: 400 })
  }

  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json')
  url.searchParams.set('origins', origin)
  url.searchParams.set('destinations', destinations)
  url.searchParams.set('mode', 'driving')
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('key', key || '')

  const res = await fetch(url.toString())
  const data = await res.json()

  const rows = data.rows?.[0]?.elements || []
  const results = rows.map((el: any) => ({
    distanceKm: el.distance ? Math.round(el.distance.value / 1000) : null,
    durationMin: el.duration ? Math.round(el.duration.value / 60) : null,
    status: el.status,
  }))

  return NextResponse.json({ results })
}
