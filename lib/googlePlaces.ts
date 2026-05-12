// Funções de integração com APIs de lugares
// Agora usando Nominatim (OpenStreetMap) — gratuito, sem API key

export interface NominatimPrediction {
  place_id: string
  description: string
  lat: number
  lng: number
}

export async function autocompleteCity(input: string): Promise<NominatimPrediction[]> {
  const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`)
  if (!res.ok) return []
  const data = await res.json()
  return data.predictions || []
}
