'use client'

import { useEffect, useRef } from 'react'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Loader } = require('@googlemaps/js-api-loader')
import type { PlaceWithDistance } from '@/types'

interface Props {
  places: PlaceWithDistance[]
  centerLat?: number
  centerLng?: number
}

export default function DestinationMap({ places, centerLat, centerLng }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return

    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
      version: 'weekly',
      libraries: ['places'],
    })

    loader.load().then(async () => {
      const { Map, Marker, InfoWindow } = (window as any).google.maps

      const center = centerLat && centerLng
        ? { lat: centerLat, lng: centerLng }
        : { lat: places[0].lat, lng: places[0].lng }

      const map = new Map(mapRef.current, {
        center,
        zoom: 8,
        styles: [{ featureType: 'poi', stylers: [{ visibility: 'off' }] }],
      })

      const infoWindow = new InfoWindow()

      places.forEach((place) => {
        const marker = new Marker({
          position: { lat: place.lat, lng: place.lng },
          map,
          title: place.name,
          icon: {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
              `<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="16" fill="#FF6B35" stroke="white" stroke-width="2"/>
                <text x="18" y="23" text-anchor="middle" font-size="16">📍</text>
              </svg>`
            )}`,
            scaledSize: new (window as any).google.maps.Size(36, 36),
          },
        })

        marker.addListener('click', () => {
          infoWindow.setContent(`
            <div style="font-family:sans-serif;padding:4px">
              <strong>${place.name}</strong><br/>
              <span style="color:#6b7280;font-size:12px">${place.city}, ${place.state}</span>
              ${place.distanceKm ? `<br/><span style="font-size:12px">🚗 ${place.distanceKm} km</span>` : ''}
            </div>
          `)
          infoWindow.open(map, marker)
        })
      })
    })
  }, [places, centerLat, centerLng])

  return <div ref={mapRef} className="w-full h-72 rounded-xl overflow-hidden border border-gray-200" />
}
