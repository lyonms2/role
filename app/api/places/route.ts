import { NextRequest, NextResponse } from 'next/server'
import { PLACES_SC } from '@/data/places-sc'
import { haversineDistance } from '@/lib/geolocation'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '100')
  const category = searchParams.get('category') || ''

  if (!lat || !lng) return NextResponse.json({ results: [] })

  const results = PLACES_SC
    .filter((p) => !category || p.category === category)
    .map((p) => ({
      ...p,
      id: `sc_${p.name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`,
      distanceKm: Math.round(haversineDistance(lat, lng, p.lat, p.lng)),
      averageRating: 0,
      reviewCount: 0,
      verifiedReviewCount: 0,
      status: 'approved' as const,
      source: 'external' as const,
    }))
    .filter((p) => p.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 20)

  return NextResponse.json({ results })
}
