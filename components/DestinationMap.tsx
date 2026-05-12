'use client'

import dynamic from 'next/dynamic'
import type { PlaceWithDistance } from '@/types'

interface Props {
  places: PlaceWithDistance[]
  centerLat?: number
  centerLng?: number
}

// Leaflet não funciona no SSR — carrega só no client
const MapInner = dynamic(() => import('./DestinationMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 rounded-xl border border-gray-200 bg-gray-100 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Carregando mapa...</span>
    </div>
  ),
})

export default function DestinationMap({ places, centerLat, centerLng }: Props) {
  return <MapInner places={places} centerLat={centerLat} centerLng={centerLng} />
}
