'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { getMemberColor } from '@/lib/realtimeDb'
import type { TrackingMember } from '@/lib/realtimeDb'

const TILE_STREET = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function photoIcon(photoUrl: string, color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width:42px;height:42px;border-radius:50%;overflow:hidden;
      border:3px solid ${color};box-shadow:0 2px 8px rgba(0,0,0,0.4);
    "><img src="${photoUrl}" style="width:100%;height:100%;object-fit:cover;" referrerpolicy="no-referrer" /></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 42],
    popupAnchor: [0, -46],
  })
}

function letterIcon(name: string, color: string, isMe: boolean) {
  const size = isMe ? 38 : 32
  const initial = name.charAt(0).toUpperCase()
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};width:${size}px;height:${size}px;
      border-radius:50% 50% 50% 0;transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
    "><span style="transform:rotate(45deg);font-weight:700;font-size:${isMe ? 15 : 13}px;color:white;">${initial}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size - 4],
  })
}

function timeSince(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'agora'
  if (s < 3600) return `há ${Math.floor(s / 60)}min`
  return `há ${Math.floor(s / 3600)}h`
}

function AutoFit({ members }: { members: Record<string, TrackingMember> }) {
  const map = useMap()
  useEffect(() => {
    const pts = Object.values(members).filter((m) => m.lat !== 0 && m.lng !== 0)
    if (pts.length === 0) return
    if (pts.length === 1) { map.setView([pts[0].lat, pts[0].lng], 15); return }
    const lats = pts.map((m) => m.lat)
    const lngs = pts.map((m) => m.lng)
    map.fitBounds(
      [[Math.min(...lats), Math.min(...lngs)], [Math.max(...lats), Math.max(...lngs)]],
      { padding: [48, 48], maxZoom: 16 },
    )
  }, [])
  return null
}

interface Props {
  members: Record<string, TrackingMember>
  myId: string
  myPhotoUrl?: string
  center: [number, number]
  zoom: number
  satellite: boolean
}

export default function TrackingMap({ members, myId, myPhotoUrl, center, zoom, satellite }: Props) {
  const entries = Object.entries(members).filter(([, m]) => m.lat !== 0 && m.lng !== 0)

  return (
    <MapContainer center={center} zoom={zoom} className="w-full h-full" zoomControl>
      <TileLayer
        key={satellite ? 'sat' : 'street'}
        url={satellite ? TILE_SATELLITE : TILE_STREET}
        attribution={satellite ? '© Esri' : '© OpenStreetMap'}
      />
      <AutoFit members={members} />
      {entries.map(([uid, member], i) => {
        const isMe = uid === myId
        const color = getMemberColor(i)
        const icon = isMe && myPhotoUrl
          ? photoIcon(myPhotoUrl, color)
          : letterIcon(member.name, color, isMe)
        return (
          <Marker key={uid} position={[member.lat, member.lng]} icon={icon}>
            <Popup>
              <div className="text-center min-w-[100px]">
                <p className="font-bold text-gray-900">{isMe ? 'Você' : member.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{timeSince(member.updatedAt)}</p>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
