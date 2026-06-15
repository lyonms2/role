'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, useMapEvents, useMap } from 'react-leaflet'
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

function radiusToZoom(km?: number): number {
  if (!km) return 11
  if (km <= 10) return 11
  if (km <= 25) return 10
  return 9
}

function FlyToCenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1.0 })
  }, [lat, lng])
  return null
}

interface Props {
  places: PlaceWithDistance[]
  centerLat?: number
  centerLng?: number
  onOriginChange?: (lat: number, lng: number) => void
  originLat?: number
  originLng?: number
  radiusKm?: number
  mapClassName?: string
  onEventClick?: (id: string) => void
}

export default function DestinationMapLeaflet({ places, centerLat, centerLng, onOriginChange, originLat, originLng, radiusKm, mapClassName, onEventClick }: Props) {
  const [satellite, setSatellite] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl
    L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl })
  }, [])

  const hasCenter = !!(centerLat && centerLng)
  const initialCenter: [number, number] = hasCenter
    ? [centerLat!, centerLng!]
    : places.length > 0
    ? [places[0].lat, places[0].lng]
    : [-14.235, -51.925]

  const initialZoom = hasCenter ? radiusToZoom(radiusKm) : places.length > 0 ? 7 : 4

  const cls = mapClassName ?? 'w-full h-72 rounded-xl overflow-hidden border border-gray-200'

  return (
    <div className={`${cls} relative`}>
      <button
        onClick={() => setSatellite((v) => !v)}
        className="absolute bottom-2 right-2 z-[400] bg-white border border-gray-200 shadow-md rounded-lg px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
      >
        {satellite ? '🗺️ Mapa' : '🛰️ Satélite'}
      </button>
    <MapContainer
      center={initialCenter}
      zoom={initialZoom}
      className="w-full h-full"
      style={{ zIndex: 0, cursor: onOriginChange ? 'crosshair' : 'grab' }}
    >
      {satellite ? (
        <TileLayer
          attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
      ) : (
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
      )}
      {hasCenter && <FlyToCenter lat={centerLat!} lng={centerLng!} zoom={radiusToZoom(radiusKm)} />}
      {onOriginChange && <MapClickHandler onOriginChange={onOriginChange} />}
      {originLat !== undefined && originLng !== undefined && radiusKm && (
        <Circle
          center={[originLat, originLng]}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#FF6B35',
            fillColor: '#FF6B35',
            fillOpacity: 0.07,
            weight: 1.5,
            dashArray: '6 4',
          }}
        />
      )}
      {originLat !== undefined && originLng !== undefined && (
        <Marker position={[originLat, originLng]} icon={getOriginIcon()}>
          <Popup><span className="text-sm font-semibold">📍 Seu ponto de partida</span></Popup>
        </Marker>
      )}
      {places.map((place) => {
        if (!place.lat || !place.lng) return null
        const isEvent = place.source === 'event'
        const href = place.link ?? (isEvent
          ? `/evento/${place.id}`
          : place.source === 'external' && place.googlePlaceId
          ? `/destino/google/${place.googlePlaceId}`
          : `/destino/${place.id}`)
        return (
          <Marker key={place.id} position={[place.lat, place.lng]} icon={getOrangeIcon()}>
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 140 }}>
                <strong style={{ display: 'block', marginBottom: 4 }}>{place.name}</strong>
                {place.subtitle && (
                  <span style={{ display: 'block', color: '#374151', marginBottom: 2 }}>{place.subtitle}</span>
                )}
                {place.durationMin != null && (
                  <span style={{ display: 'block', color: '#374151', marginBottom: 4 }}>
                    🚗 (~{place.durationMin >= 60
                      ? `${Math.floor(place.durationMin / 60)}h${place.durationMin % 60 > 0 ? `${place.durationMin % 60}min` : ''}`
                      : `${place.durationMin} min`})
                  </span>
                )}
                {isEvent && onEventClick ? (
                  <button
                    onClick={() => onEventClick(place.id)}
                    style={{ background: 'none', border: 'none', padding: 0, color: '#7c3aed', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}
                  >
                    Ver detalhes →
                  </button>
                ) : (
                  <a href={href} style={{ display: 'inline-block', color: '#7c3aed', fontWeight: 600, textDecoration: 'none' }}>
                    Ver detalhes →
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
    </div>
  )
}
