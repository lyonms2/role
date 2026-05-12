'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import type { PlaceWithDistance } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Corrige ícones do Leaflet com webpack/Next.js
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

function getOrangeIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#FF6B35;
      width:28px;height:28px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:3px solid white;
      box-shadow:0 2px 6px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -30],
  })
}

interface Props {
  places: PlaceWithDistance[]
  centerLat?: number
  centerLng?: number
}

export default function DestinationMapLeaflet({ places, centerLat, centerLng }: Props) {
  useEffect(() => {
    // Fix para o ícone padrão do Leaflet com bundlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
  }, [])

  if (places.length === 0) return null

  const center: [number, number] = centerLat && centerLng
    ? [centerLat, centerLng]
    : [places[0].lat, places[0].lng]

  return (
    <MapContainer
      center={center}
      zoom={8}
      className="w-full h-72 rounded-xl overflow-hidden border border-gray-200"
      style={{ zIndex: 0 }}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {places.map((place) => (
        <Marker
          key={place.id}
          position={[place.lat, place.lng]}
          icon={getOrangeIcon()}
        >
          <Popup>
            <div className="text-sm">
              <strong>{place.name}</strong>
              <br />
              <span className="text-gray-500">{place.city}, {place.state}</span>
              {place.distanceKm && (
                <>
                  <br />
                  <span>🚗 {place.distanceKm} km</span>
                </>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
