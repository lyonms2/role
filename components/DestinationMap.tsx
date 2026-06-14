'use client'

import dynamic from 'next/dynamic'
import type { PlaceWithDistance } from '@/types'

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

const MapInner = dynamic(() => import('./DestinationMapLeaflet'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Carregando mapa...</span>
    </div>
  ),
})

export default function DestinationMap({ places, centerLat, centerLng, onOriginChange, originLat, originLng, radiusKm, mapClassName, onEventClick }: Props) {
  return <MapInner places={places} centerLat={centerLat} centerLng={centerLng} onOriginChange={onOriginChange} originLat={originLat} originLng={originLng} radiusKm={radiusKm} mapClassName={mapClassName} onEventClick={onEventClick} />
}
