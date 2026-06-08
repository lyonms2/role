'use client'

import { useEffect, useState } from 'react'

interface Props {
  destLat: number
  destLng: number
  destName: string
  mapsUrl: string
  onClose: () => void
  originLat?: number
  originLng?: number
  zIndex?: number
}

type Status = 'locating' | 'loading' | 'ready' | 'error'

export default function RouteModal({ destLat, destLng, destName, mapsUrl, onClose, originLat, originLng, zIndex = 110 }: Props) {
  const hasOrigin = originLat != null && originLng != null
  const [status, setStatus] = useState<Status>(hasOrigin ? 'loading' : 'locating')
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    async function loadEmbed(oLat: number, oLng: number) {
      setStatus('loading')
      try {
        const res = await fetch(
          `/api/maps-embed?originLat=${oLat}&originLng=${oLng}&destLat=${destLat}&destLng=${destLng}`
        )
        const data = await res.json()
        if (data.embedUrl) {
          setEmbedUrl(data.embedUrl)
          setStatus('ready')
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }

    if (hasOrigin) {
      loadEmbed(originLat!, originLng!)
    } else {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadEmbed(pos.coords.latitude, pos.coords.longitude),
        () => setStatus('error'),
        { timeout: 12000, enableHighAccuracy: false }
      )
    }
  }, [destLat, destLng, originLat, originLng])

  return (
    <div className="fixed inset-0 flex flex-col bg-black/60" style={{ zIndex }} onClick={onClose}>
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

        {/* Conteúdo */}
        <div className="relative flex-1 min-h-0">
          {status === 'locating' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3">
              <span className="text-4xl animate-bounce">📍</span>
              <p className="text-gray-600 font-medium text-sm">Localizando você...</p>
            </div>
          )}
          {status === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-3">
              <span className="text-4xl">🗺️</span>
              <p className="text-gray-600 font-medium text-sm">Carregando rota...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 gap-4 px-8 text-center">
              <span className="text-4xl">😕</span>
              <p className="text-gray-600 font-medium text-sm">
                Não conseguimos sua localização. Verifique a permissão de GPS nas configurações.
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-bold"
              >
                Abrir no Google Maps →
              </a>
            </div>
          )}
          {status === 'ready' && embedUrl && (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          )}
        </div>

        {/* Rodapé */}
        {status === 'ready' && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white">
            <p className="text-xs text-gray-400">Rota calculada pelo Google Maps</p>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold hover:bg-orange-600 transition-colors"
            >
              Navegar →
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
