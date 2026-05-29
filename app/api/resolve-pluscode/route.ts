import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'code obrigatório' }, { status: 400 })
  if (!API_KEY) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(code)}&key=${API_KEY}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' || !data.results?.[0]) {
      return NextResponse.json({ error: 'Plus Code inválido ou não encontrado' }, { status: 422 })
    }

    const loc = data.results[0].geometry.location
    return NextResponse.json({ lat: loc.lat, lng: loc.lng })
  } catch {
    return NextResponse.json({ error: 'Falha ao resolver Plus Code' }, { status: 500 })
  }
}
