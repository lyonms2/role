import Link from 'next/link'
import Image from 'next/image'
import type { PlaceWithDistance } from '@/types'
import { CATEGORY_EMOJIS } from '@/types'
import WeatherBadge from './WeatherBadge'

interface Props {
  place: PlaceWithDistance
}

function StarRating({ value }: { value: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-sm ${i <= Math.round(value) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
      ))}
      <span className="text-xs text-gray-500 ml-1">{value > 0 ? value.toFixed(1) : 'Seja o primeiro!'}</span>
    </span>
  )
}

export default function DestinationCard({ place }: Props) {
  const emoji = CATEGORY_EMOJIS[place.category] || '📍'
  const isExternal = place.source === 'external'
  const isCommunity = place.source === 'community'
  const externalHref = (place as any).googleMapsUri
    || (place.googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}` : undefined)

  const internalHref = isExternal && (place as any).googlePlaceId
    ? `/destino/google/${(place as any).googlePlaceId}`
    : `/destino/${place.id}`

  const cardClass = 'card block hover:shadow-md transition-shadow'

  const inner = (
    <>
      {/* Foto */}
      <div className="relative h-44 bg-gray-100">
        {place.photoUrl ? (
          <Image
            src={place.photoUrl}
            alt={place.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 640px"
            unoptimized={place.photoUrl.startsWith('/api/photo')}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-5xl">
            {emoji}
          </div>
        )}
        {isCommunity ? (
          <span className="absolute top-2 left-2 bg-amber-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            🌟 Comunidade
          </span>
        ) : isExternal ? (
          <span className="absolute top-2 left-2 bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
            🔍 Descoberto
          </span>
        ) : place.verifiedReviewCount > 0 ? (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
            ✅ Verificado
          </span>
        ) : null}
        <span className="absolute top-2 right-2 bg-white/90 text-xs font-medium px-2 py-1 rounded-full">
          {emoji} {place.category.replace('_', ' ')}
        </span>
      </div>

      {/* Infos */}
      <div className="p-4 flex flex-col gap-2">
        <div>
          <h3 className="font-bold text-gray-900 text-lg leading-tight">{place.name}</h3>
          <p className="text-sm text-gray-500">{place.city}, {place.state}</p>
        </div>

        <div className="flex items-center justify-between flex-wrap gap-2">
          <StarRating value={place.averageRating} />
          {place.weather && <WeatherBadge weather={place.weather} compact />}
        </div>

        {(place.distanceKm != null || place.durationMin != null) && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            {place.distanceKm != null && <span>📍 {place.distanceKm} km <span className="text-gray-400 text-xs">(linha reta)</span></span>}
            {place.durationMin != null && (
              <span>🚗 {place.durationMin >= 60
                ? `${Math.floor(place.durationMin / 60)}h${place.durationMin % 60 > 0 ? `${place.durationMin % 60}min` : ''}`
                : `${place.durationMin} min`}
              </span>
            )}
          </div>
        )}

        {isExternal && (
          <p className="text-xs text-blue-500 font-medium">Ver detalhes, fotos e avaliações →</p>
        )}
      </div>
    </>
  )

  return (
    <Link href={internalHref} className={cardClass}>
      {inner}
    </Link>
  )
}
