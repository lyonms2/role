export interface GooglePlace {
  place_id: string
  name: string
  vicinity: string
  geometry: {
    location: { lat: number; lng: number }
  }
  photos?: Array<{ photo_reference: string }>
  rating?: number
  types?: string[]
}

export function getPhotoUrl(photoReference: string, maxWidth = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}`
}

export async function autocompleteCity(input: string): Promise<Array<{ description: string; place_id: string }>> {
  const res = await fetch(
    `/api/places/autocomplete?input=${encodeURIComponent(input)}`
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.predictions || []
}

export async function getCoordinatesFromPlaceId(placeId: string): Promise<{ lat: number; lng: number } | null> {
  const res = await fetch(`/api/places/details?place_id=${placeId}`)
  if (!res.ok) return null
  const data = await res.json()
  return data.location || null
}
