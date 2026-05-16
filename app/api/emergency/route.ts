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

export async function GET(req: NextRequest) {
  if (!API_KEY) return NextResponse.json({ services: [] })

  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')

  if (!lat || !lng) return NextResponse.json({ services: [] })

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes: ['hospital', 'police', 'fire_station'],
        maxResultCount: 15,
        rankPreference: 'DISTANCE',
        languageCode: 'pt-BR',
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 30000,
          },
        },
      }),
      next: { revalidate: 86400 },
    })

    if (!res.ok) return NextResponse.json({ services: [] })

    const data = await res.json()

    const HOSPITAL_KEYWORDS = ['hospital', 'upa', 'samu', 'pronto socorro', 'pronto-socorro', 'emergência', 'emergencia', 'urgência', 'urgencia']
    const POLICE_KEYWORDS = ['polícia', 'policia', 'delegacia', 'batalhão', 'batalhao', 'pm ', 'dp ']
    const FIRE_KEYWORDS = ['bombeiro', 'salva-vidas', 'salva vidas', 'guarda-vidas', 'guarda vidas', 'corpo de bombeiros']

    function isRelevant(name: string, type: string): boolean {
      const n = name.toLowerCase()
      if (type === 'police') return POLICE_KEYWORDS.some((k) => n.includes(k)) || true
      if (type === 'fire_station') return FIRE_KEYWORDS.some((k) => n.includes(k)) || true
      if (type === 'hospital') return HOSPITAL_KEYWORDS.some((k) => n.includes(k))
      return false
    }

    const services = (data.places || [])
      .map((p: any) => ({
        id: p.id,
        name: p.displayName?.text || '',
        type: p.primaryType || 'hospital',
        address: p.formattedAddress || '',
        phone: p.nationalPhoneNumber || null,
        lat: p.location?.latitude || 0,
        lng: p.location?.longitude || 0,
        openNow: p.regularOpeningHours?.openNow ?? null,
      }))
      .filter((s: any) => isRelevant(s.name, s.type))

    return NextResponse.json({ services }, {
      headers: { 'Cache-Control': 'public, s-maxage=86400' },
    })
  } catch {
    return NextResponse.json({ services: [] })
  }
}
