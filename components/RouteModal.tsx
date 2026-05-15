'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  destLat: number
  destLng: number
  destName: string
  mapsUrl: string
  onClose: () => void
}

type Status = 'locating' | 'routing' | 'ready' | 'error'

export default function RouteModal({ destLat, destLng, destName, mapsUrl, onClose }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('locating')
  const [info, setInfo] = useState<{ distance: string; duration: string } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    let map: any = null

    async function init() {
      // 1. Localização do usuário
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 12000, enableHighAccuracy: false })
      )
      const userLat = pos.coords.latitude
      const userLng = pos.coords.longitude

      setStatus('routing')

      // 2. Rota via OSRM
      const routeRes = await fetch(
        `/api/route?fromLat=${userLat}&fromLng=${userLng}&toLat=${destLat}&toLng=${destLng}`
      )
      const routeData = await routeRes.json()

      // 3. Inicializa Leaflet (import dinâmico para evitar SSR)
      const L = (await import('leaflet')).default
      if (!mapRef.current) return

      // Fix ícones padrão do Leaflet no Next.js
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

      // Marcador do usuário (azul)
      const userIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([userLat, userLng], { icon: userIcon }).addTo(map).bindPopup('Você está aqui')

      // Marcador do destino (laranja)
      const destIcon = L.divIcon({
        className: '',
        html: `<div style="width:16px;height:16px;background:#f97316;border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      })
      L.marker([destLat, destLng], { icon: destIcon }).addTo(map).bindPopup(destName).openPopup()

      // Rota ou linha reta de fallback
      if (routeData.geometry) {
        const routeLayer = L.geoJSON(routeData.geometry, {
          style: { color: '#f97316', weight: 5, opacity: 0.85 },
        }).addTo(map)
        map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] })

        if (routeData.distance && routeData.duration) {
          const km = (routeData.distance / 1000).toFixed(0)
          const totalMin = Math.round(routeData.duration / 60)
          const h = Math.floor(totalMin / 60)
          const m = totalMin % 60
          setInfo({
            distance: `${km} km`,
            duration: h > 0 ? `${h}h ${m}min` : `${totalMin} min`,
          })
        }
      } else {
        // Sem rota: linha pontilhada reta
        L.polyline([[userLat, userLng], [destLat, destLng]], {
          color: '#f97316', weight: 3, dashArray: '8 6', opacity: 0.7,
        }).addTo(map)
        map.fitBounds([[userLat, userLng], [destLat, destLng]], { padding: [50, 50] })
      }

      setStatus('ready')
    }

    init().catch(() => setStatus('error'))

    return () => { map?.remove() }
  }, [destLat, destLng, destName])

  const STATUS_LABEL: Record<Status, { emoji: string; text: string }> = {
    locating: { emoji: '📍', text: 'Localizando você...' },
    routing:  { emoji: '🗺️', text: 'Calculando rota...' },
    ready:    { emoji: '',   text: '' },
    error:    { emoji: '😕', text: 'Não foi possível usar sua localização' },
  }

  return (
    <div className="fixed inset-0 z-[110] flex flex-col bg-black/60" onClick={onClose}>
      <div
        className="bg-white flex flex-col mt-12 rounded-t-3xl overflow-hidden flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900 text-base">Como chegar</h3>
            <p className="text-xs text-gray-400 truncate max-w-[220px]">📍 {destName}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Mapa */}
        <div className="relative flex-1 min-h-0">
          {status !== 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 gap-3">
              <span className="text-4xl">{STATUS_LABEL[status].emoji}</span>
              <p className="text-gray-600 font-medium text-sm">{STATUS_LABEL[status].text}</p>
              {status === 'error' && (
                <p className="text-gray-400 text-xs px-8 text-center">
                  Permita o acesso à localização nas configurações do celular
                </p>
              )}
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>

        {/* Rodapé */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-gray-100 flex items-center gap-3 bg-white">
          <div className="flex-1 min-w-0">
            {info ? (
              <>
                <p className="text-sm font-bold text-gray-900">🚗 {info.duration} · {info.distance}</p>
                <p className="text-xs text-gray-400">de estimativa de carro</p>
              </>
            ) : (
              <p className="text-sm text-gray-400">
                {status === 'error' ? 'Sem rota disponível' : 'Calculando...'}
              </p>
            )}
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
          >
            Abrir no Maps →
          </a>
        </div>
      </div>
    </div>
  )
}
