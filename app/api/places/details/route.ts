import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const placeId = req.nextUrl.searchParams.get('place_id')
  const key = process.env.GOOGLE_PLACES_KEY

  if (!placeId) return NextResponse.json({ location: null })

  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'geometry')
  url.searchParams.set('key', key || '')

  const res = await fetch(url.toString())
  const data = await res.json()
  const location = data.result?.geometry?.location || null

  return NextResponse.json({ location })
}
