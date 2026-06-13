import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const address = req.nextUrl.searchParams.get('address')
  if (!address) return NextResponse.json({ error: 'Missing address' }, { status: 400 })

  // Try parsing as "lat,lng" directly
  const coordMatch = address.match(/^\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*$/)
  if (coordMatch) {
    const lat = parseFloat(coordMatch[1])
    const lng = parseFloat(coordMatch[2])
    return NextResponse.json({
      lat,
      lng,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      formattedAddress: `${lat}, ${lng}`,
    })
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${API_KEY}&language=pt-BR`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status !== 'OK' || !data.results?.length) {
      return NextResponse.json({ error: 'Endereço não encontrado' }, { status: 404 })
    }

    const result = data.results[0]
    const { lat, lng } = result.geometry.location
    return NextResponse.json({
      lat,
      lng,
      mapsLink: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      formattedAddress: result.formatted_address,
    })
  } catch {
    return NextResponse.json({ error: 'Falha ao geocodificar' }, { status: 502 })
  }
}
