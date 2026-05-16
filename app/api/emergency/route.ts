import { NextRequest, NextResponse } from 'next/server'

const API_KEY = process.env.GOOGLE_PLACES_API_KEY

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.location',
  'places.nationalPhoneNumber',
  'places.primaryType',
  'places.regularOpeningHours',
  'places.formattedAddress',
].join(',')

const HOSPITAL_KEYWORDS = ['hospital', 'upa', 'samu', 'pronto socorro', 'pronto-socorro', 'emergência', 'emergencia', 'urgência', 'urgencia', 'ps ', 'ps-']

async function searchCategory(types: string[], lat: number, lng: number, radius = 30000, max = 5) {
  const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': API_KEY!,
      'X-Goog-FieldMask': FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: max,
      rankPreference: 'DISTANCE',
      languageCode: 'pt-BR',
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius },
      },
    }),
    next: { revalidate: 86400 },
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.places || []).map((p: any) => ({
    id: p.id,
    name: p.displayName?.text || '',
    type: p.primaryType || '',
    address: p.formattedAddress || '',
    phone: p.nationalPhoneNumber || null,
    lat: p.location?.latitude || 0,
    lng: p.location?.longitude || 0,
    openNow: p.regularOpeningHours?.openNow ?? null,
  }))
}

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ police: [], fire: [], hospital: [] })

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  if (!lat || !lng) return NextResponse.json({ police: [], fire: [], hospital: [] })

  try {
    const [policeRaw, fireRaw, hospitalRaw] = await Promise.all([
      searchCategory(['police'], lat, lng, 50000, 5),
      searchCategory(['fire_station'], lat, lng, 50000, 5),
      searchCategory(['hospital'], lat, lng, 30000, 15),
    ])

    const hospital = hospitalRaw.filter((s: any) => {
      const n = s.name.toLowerCase()
      return HOSPITAL_KEYWORDS.some((k) => n.includes(k))
    }).slice(0, 5)

    return NextResponse.json(
      { police: policeRaw, fire: fireRaw, hospital },
      { headers: { 'Cache-Control': 'public, s-maxage=86400' } }
    )
  } catch {
    return NextResponse.json({ police: [], fire: [], hospital: [] })
  }
}
