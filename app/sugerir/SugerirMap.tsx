'use client'

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const TILE_STREET = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const TILE_SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

const pinIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
    background:#15803d;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

function ClickHandler({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onSelect(e.latlng.lat, e.latlng.lng) })
  return null
}

function FlyTo({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap()
  useEffect(() => { map.flyTo([lat, lng], zoom, { duration: 1 }) }, [lat, lng, zoom])
  return null
}

interface Props {
  center: [number, number]
  zoom: number
  selected: { lat: number; lng: number } | null
  onSelect: (lat: number, lng: number) => void
}

export default function SugerirMap({ center, zoom, selected, onSelect }: Props) {
  const [satellite, setSatellite] = useState(false)
  const [search, setSearch] = useState<'none' | 'coords' | 'pluscode'>('none')
  const [coordsInput, setCoordsInput] = useState('')
  const [plusCodeInput, setPlusCodeInput] = useState('')
  const [plusCodeError, setPlusCodeError] = useState('')
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null)

  function parseCoords(input: string) {
    const m = input.trim().match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/)
    if (!m) return null
    const lat = parseFloat(m[1]), lng = parseFloat(m[2])
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
    return { lat, lng }
  }

  function applyCoords() {
    const p = parseCoords(coordsInput)
    if (!p) return
    onSelect(p.lat, p.lng)
    setFlyTarget({ ...p, zoom: 16 })
    setSearch('none')
    setCoordsInput('')
  }

  async function applyPlusCode() {
    setPlusCodeError('')
    try {
      const res = await fetch(`/api/resolve-pluscode?code=${encodeURIComponent(plusCodeInput.trim())}`)
      const d = await res.json()
      if (d.lat && d.lng) {
        onSelect(d.lat, d.lng)
        setFlyTarget({ lat: d.lat, lng: d.lng, zoom: 17 })
        setSearch('none')
        setPlusCodeInput('')
      } else {
        setPlusCodeError('Plus Code não encontrado.')
      }
    } catch { setPlusCodeError('Erro ao buscar.') }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setSatellite(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            satellite ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}>
          {satellite ? '🗺️ Ruas' : '🛰️ Satélite'}
        </button>
        <button type="button" onClick={() => setSearch(s => s === 'coords' ? 'none' : 'coords')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            search === 'coords' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}>
          🌐 Coordenadas
        </button>
        <button type="button" onClick={() => setSearch(s => s === 'pluscode' ? 'none' : 'pluscode')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
            search === 'pluscode' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
          }`}>
          📍 Plus Code
        </button>
      </div>

      {/* Inputs de busca */}
      {search === 'coords' && (
        <div className="flex gap-2">
          <input value={coordsInput} onChange={e => setCoordsInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyCoords()}
            placeholder="-27.1234, -48.5678" autoFocus
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500"
          />
          <button type="button" onClick={applyCoords} disabled={!parseCoords(coordsInput)}
            className="px-3 py-2 rounded-xl bg-green-700 text-white text-xs font-bold disabled:opacity-40">
            Ir →
          </button>
        </div>
      )}
      {search === 'pluscode' && (
        <div className="flex flex-col gap-1">
          <div className="flex gap-2">
            <input value={plusCodeInput}
              onChange={e => { setPlusCodeInput(e.target.value); setPlusCodeError('') }}
              onKeyDown={e => e.key === 'Enter' && applyPlusCode()}
              placeholder="Ex: 7RXJ+GH Siderópolis" autoFocus
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-500"
            />
            <button type="button" onClick={applyPlusCode} disabled={!plusCodeInput.trim()}
              className="px-3 py-2 rounded-xl bg-green-700 text-white text-xs font-bold disabled:opacity-40">
              Ir →
            </button>
          </div>
          {plusCodeError && <p className="text-xs text-red-400">{plusCodeError}</p>}
        </div>
      )}

      {/* Mapa */}
      <div className="relative rounded-xl overflow-hidden border border-gray-200">
        <style>{`
          .sugerir-map .leaflet-container { cursor: crosshair !important; }
          .sugerir-map .leaflet-grab { cursor: crosshair !important; }
          .sugerir-map .leaflet-dragging .leaflet-grab { cursor: grabbing !important; }
        `}</style>
        <div className="sugerir-map" style={{ height: 320 }}>
          <MapContainer center={center} zoom={zoom} className="w-full h-full" zoomControl>
            <TileLayer
              key={satellite ? 'sat' : 'street'}
              url={satellite ? TILE_SATELLITE : TILE_STREET}
              attribution={satellite ? '© Esri' : '© OpenStreetMap'}
            />
            <ClickHandler onSelect={(lat, lng) => { onSelect(lat, lng); setFlyTarget(null) }} />
            {selected && <Marker position={[selected.lat, selected.lng]} icon={pinIcon} />}
            {flyTarget && <FlyTo lat={flyTarget.lat} lng={flyTarget.lng} zoom={flyTarget.zoom} />}
          </MapContainer>
        </div>

        {/* Alvo central (quando não tem seleção) */}
        {!selected && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[999]">
            <svg width="36" height="36" viewBox="0 0 36 36" className="opacity-25">
              <line x1="18" y1="0" x2="18" y2="36" stroke="#111827" strokeWidth="1.5"/>
              <line x1="0" y1="18" x2="36" y2="18" stroke="#111827" strokeWidth="1.5"/>
              <circle cx="18" cy="18" r="5" fill="none" stroke="#111827" strokeWidth="1.5"/>
            </svg>
          </div>
        )}

        {/* Coordenadas / hint */}
        <div className="absolute bottom-2 left-0 right-0 flex justify-center z-[1000] pointer-events-none px-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${
            selected ? 'bg-green-700/90 text-white' : 'bg-black/40 text-white'
          }`}>
            {selected
              ? `📍 ${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`
              : 'Toque no mapa para marcar o local'}
          </span>
        </div>
      </div>
    </div>
  )
}
