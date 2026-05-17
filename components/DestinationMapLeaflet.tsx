'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import type { PlaceWithDistance } from '@/types'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

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

function getOriginIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:#2563eb;
      width:34px;height:34px;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:16px;line-height:1;
    ">🏠</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  })
}

function MapClickHandler({ onOriginChange }: { onOriginChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) { onOriginChange(e.latlng.lat, e.latlng.lng) },
  })
  return null
}

interface Props {
  places: PlaceWithDistance[]
  centerLat?: number
  centerLng?: number
  onOriginChange?: (lat: number, lng: number) => void
  originLat?: number
  originLng?: number
}

export default function DestinationMapLeaflet({ places, centerLat, centerLng, onOriginChange, originLat, originLng }: Props) {
  useEffect(() => {
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
      style={{ zIndex: 0, cursor: onOriginChange ? 'crosshair' : 'grab' }}
    >
      <TileLayer
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onOriginChange && <MapClickHandler onOriginChange={onOriginChange} />}
      {originLat !== undefined && originLng !== undefined && (
        <Marker position={[originLat, originLng]} icon={getOriginIcon()}>
          <Popup><span className="text-sm font-semibold">📍 Seu ponto de partida</span></Popup>
        </Marker>
      )}
      {places.map((place) => {
        const href = place.source === 'external' && place.googlePlaceId
          ? `/destino/google/${place.googlePlaceId}`
          : `/destino/${place.id}`
        return (
          <Marker
            key={place.id}
            position={[place.lat, place.lng]}
            icon={getOrangeIcon()}
          >
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 140 }}>
                <strong style={{ display: 'block', marginBottom: 2 }}>{place.name}</strong>
                <span style={{ color: '#6b7280' }}>{place.city}, {place.state}</span>
                {place.distanceKm !== undefined && (
                  <span style={{ display: 'block', color: '#374151' }}>🚗 {place.distanceKm} km</span>
                )}
                <a
                  href={href}
                  style={{ display: 'inline-block', marginTop: 6, color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}
                >
                  Ver detalhes →
                </a>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
