import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { searchParams } = req.nextUrl
  const originLat = searchParams.get('originLat')
  const originLng = searchParams.get('originLng')
  const destLat   = searchParams.get('destLat')
  const destLng   = searchParams.get('destLng')

  if (!originLat || !originLng || !destLat || !destLng) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const embedUrl =
    `https://www.google.com/maps/embed/v1/directions` +
    `?key=${API_KEY}` +
    `&origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&mode=driving` +
    `&language=pt-BR`

  return NextResponse.json({ embedUrl })
}
