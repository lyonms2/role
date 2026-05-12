import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const input = req.nextUrl.searchParams.get('input')
  const key = process.env.GOOGLE_PLACES_KEY

  if (!input) return NextResponse.json({ predictions: [] })

  const url = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json')
  url.searchParams.set('input', input)
  url.searchParams.set('types', '(cities)')
  url.searchParams.set('components', 'country:br')
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('key', key || '')

  const res = await fetch(url.toString())
  const data = await res.json()

  return NextResponse.json({ predictions: data.predictions || [] })
}
