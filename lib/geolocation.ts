export function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada neste dispositivo.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    })
  })
}

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

export async function verifyUserAtLocation(
  placeLat: number,
  placeLng: number,
  thresholdKm = 5
): Promise<{ verified: boolean; userLat: number; userLng: number; distanceKm: number }> {
  const position = await getCurrentPosition()
  const userLat = position.coords.latitude
  const userLng = position.coords.longitude
  const distanceKm = haversineDistance(userLat, userLng, placeLat, placeLng)
  return { verified: distanceKm <= thresholdKm, userLat, userLng, distanceKm }
}
