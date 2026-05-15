import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const fromLat = searchParams.get('fromLat')
  const fromLng = searchParams.get('fromLng')
  const toLat   = searchParams.get('toLat')
  const toLng   = searchParams.get('toLng')

  if (!fromLat || !fromLng || !toLat || !toLng) {
    return NextResponse.json({ geometry: null })
  }

  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return NextResponse.json({ geometry: null })
    const data = await res.json()
    const route = data.routes?.[0]
    return NextResponse.json({
      distance: route?.distance ?? null,
      duration: route?.duration ?? null,
      geometry: route?.geometry ?? null,
    })
  } catch {
    return NextResponse.json({ geometry: null })
  }
}
