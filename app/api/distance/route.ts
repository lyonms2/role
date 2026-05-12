import { NextRequest, NextResponse } from 'next/server'

// OSRM Table Service — calcula distância/tempo de carro de 1 origem para N destinos
// Completamente gratuito, sem API key
export async function GET(req: NextRequest) {
  const origin = req.nextUrl.searchParams.get('origin')       // "lat,lng"
  const destinations = req.nextUrl.searchParams.get('destinations') // "lat,lng|lat,lng|..."

  if (!origin || !destinations) {
    return NextResponse.json({ error: 'origin e destinations são obrigatórios' }, { status: 400 })
  }

  // OSRM usa formato lng,lat (invertido em relação ao Google)
  function toOsrm(latLng: string) {
    const [lat, lng] = latLng.split(',')
    return `${lng},${lat}`
  }

  const originOsrm = toOsrm(origin)
  const destList = destinations.split('|').map(toOsrm)
  const allCoords = [originOsrm, ...destList].join(';')

  const url = new URL(`https://router.project-osrm.org/table/v1/driving/${allCoords}`)
  url.searchParams.set('sources', '0')
  url.searchParams.set('annotations', 'duration,distance')

  const res = await fetch(url.toString(), {
    next: { revalidate: 3600 },
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Falha ao calcular distância' }, { status: 500 })
  }

  const data = await res.json()

  // durations[0] = durações da origem para cada destino (em segundos)
  // distances[0] = distâncias da origem para cada destino (em metros)
  const durations: number[] = data.durations?.[0]?.slice(1) ?? []
  const distances: number[] = data.distances?.[0]?.slice(1) ?? []

  const results = destList.map((_, i) => ({
    distanceKm: distances[i] != null ? Math.round(distances[i] / 1000) : null,
    durationMin: durations[i] != null ? Math.round(durations[i] / 60) : null,
    status: 'OK',
  }))

  return NextResponse.json({ results })
}
