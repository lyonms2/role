'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { haversineDistance } from '@/lib/geolocation'
import WeatherBadge from '@/components/WeatherBadge'
import type { WeatherData } from '@/types'

interface GooglePlace {
  googlePlaceId: string
  name: string
  city: string
  state: string
  lat: number
  lng: number
  description: string
  address: string
  rating: number
  reviewCount: number
  phone: string | null
  website: string | null
  googleMapsUri: string | null
  openNow: boolean | null
  weekdayDescriptions: string[]
  photos: { name: string; url: string }[]
  primaryType: string
}

interface EmergencyService {
  id: string
  name: string
  type: string
  address: string
  phone: string | null
  lat: number
  lng: number
  openNow: boolean | null
}

const TYPE_ICON: Record<string, string> = {
  hospital: '🏥',
  police: '👮',
  fire_station: '🚒',
  pharmacy: '💊',
}

export default function GooglePlacePage() {
  const { placeId } = useParams<{ placeId: string }>()
  const [place, setPlace] = useState<GooglePlace | null>(null)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [emergency, setEmergency] = useState<EmergencyService[]>([])
  const [loading, setLoading] = useState(true)
  const [activePhoto, setActivePhoto] = useState(0)
  const [showHours, setShowHours] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch(`/api/places/google?placeId=${placeId}`)
      const data = await res.json()
      if (data.place) {
        setPlace(data.place)
        fetch(`/api/weather?lat=${data.place.lat}&lng=${data.place.lng}`)
          .then((r) => r.json()).then(setWeather).catch(() => {})
        fetch(`/api/emergency?lat=${data.place.lat}&lng=${data.place.lng}`)
          .then((r) => r.json()).then((d) => setEmergency(d.services || [])).catch(() => {})
      }
      setLoading(false)
    }
    load()
  }, [placeId])

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="skeleton h-72 w-full rounded-xl mb-4" />
        <div className="skeleton h-8 w-2/3 mb-2" />
        <div className="skeleton h-5 w-1/2 mb-2" />
        <div className="skeleton h-5 w-3/4" />
      </div>
    )
  }

  if (!place) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-3">🔍</div>
        <p className="font-semibold text-gray-700">Esse rolê sumiu no mapa!</p>
        <Link href="/" className="text-orange-500 text-sm mt-2 inline-block">Voltar ao início</Link>
      </div>
    )
  }

  const mapsUrl = place.googleMapsUri
    || `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`

  // weekdayDescriptions começa na segunda (índice 0 = segunda)
  const jsDay = new Date().getDay() // 0=dom, 1=seg...
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1
  const todayHours = place.weekdayDescriptions[todayIndex] || null

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Foto principal ── */}
      <div className="relative h-72 bg-gray-100">
        {place.photos.length > 0 ? (
          <Image
            key={activePhoto}
            src={place.photos[activePhoto].url}
            alt={place.name}
            fill
            className="object-cover"
            sizes="100vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-7xl bg-gradient-to-b from-orange-50 to-orange-100">
            📍
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <Link
          href="/resultados"
          className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow"
        >
          ←
        </Link>

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
          <span className="bg-blue-500/90 text-white text-xs font-semibold px-2 py-1 rounded-full">
            🔍 Descoberto
          </span>
          {place.openNow !== null && (
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
              place.openNow ? 'bg-green-600/90 text-white' : 'bg-red-500/90 text-white'
            }`}>
              {place.openNow ? '✅ Aberto agora' : '🔴 Fechado'}
            </span>
          )}
        </div>
      </div>

      {/* ── Miniaturas ── */}
      {place.photos.length > 1 && (
        <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-white border-b border-gray-100">
          {place.photos.map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePhoto(i)}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                activePhoto === i ? 'border-orange-500 scale-105' : 'border-transparent opacity-70'
              }`}
            >
              <Image
                src={p.url}
                alt={`Foto ${i + 1}`}
                width={64}
                height={64}
                className="object-cover w-full h-full"
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      <div className="px-4 py-5 flex flex-col gap-5">

        {/* ── Título + rating ── */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{place.name}</h1>
          <p className="text-gray-500 mt-0.5">{place.city}{place.state ? `, ${place.state}` : ''}</p>
          {place.rating > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= Math.round(place.rating) ? 'text-yellow-400' : 'text-gray-200'}>★</span>
              ))}
              <span className="text-sm text-gray-500 ml-1">
                {place.rating.toFixed(1)} ({place.reviewCount.toLocaleString('pt-BR')} avaliações Google)
              </span>
            </div>
          )}
        </div>

        {/* ── Clima ── */}
        {weather && <WeatherBadge weather={weather} />}

        {/* ── Horários ── */}
        {todayHours && (
          <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowHours((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span>🕐</span>
                <span>{todayHours}</span>
              </div>
              <span className="text-gray-400 text-xs">{showHours ? '▲ fechar' : '▼ ver semana'}</span>
            </button>
            {showHours && place.weekdayDescriptions.length > 1 && (
              <div className="px-4 pb-3 flex flex-col gap-1 border-t border-gray-100">
                {place.weekdayDescriptions.map((d, i) => (
                  <p key={i} className={`text-xs py-0.5 ${i === todayIndex ? 'font-bold text-orange-500' : 'text-gray-500'}`}>
                    {d}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Descrição ── */}
        {place.description && (
          <p className="text-gray-700 leading-relaxed">{place.description}</p>
        )}

        {/* ── Contatos ── */}
        <div className="flex flex-col gap-2">
          {place.address && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <span className="mt-0.5 flex-shrink-0">📍</span>
              <span>{place.address}</span>
            </div>
          )}
          {place.phone && (
            <a href={`tel:${place.phone}`} className="flex items-center gap-2 text-sm text-blue-600 font-medium">
              <span>📞</span>
              <span>{place.phone}</span>
            </a>
          )}
          {place.website && (
            <a href={place.website} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 font-medium">
              <span>🌐</span>
              <span className="truncate">
                {place.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
              </span>
            </a>
          )}
        </div>

        {/* ── Botão Maps ── */}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-center block">
          Ver como chegar 🗺️
        </a>

        {/* ── Planejando o rolê ── */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Planejando o rolê? 🗓️</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: `/eventos?city=${place.city}&state=${place.state}`, emoji: '🎭', label: 'Shows & Eventos', color: 'bg-purple-50 border-purple-100' },
              { href: `/comer?city=${place.city}&state=${place.state}`, emoji: '🍽️', label: 'Onde Comer', color: 'bg-orange-50 border-orange-100' },
              { href: `/hospedar?city=${place.city}&state=${place.state}`, emoji: '🏡', label: 'Onde Dormir', color: 'bg-green-50 border-green-100' },
              { href: `/veiculos?city=${place.city}&state=${place.state}`, emoji: '🚗', label: 'Alugar Veículo', color: 'bg-blue-50 border-blue-100' },
            ].map((item) => (
              <a key={item.href} href={item.href}
                className={`${item.color} border rounded-xl p-3 flex items-center gap-2 hover:shadow-sm transition-shadow`}>
                <span className="text-2xl">{item.emoji}</span>
                <span className="text-sm font-semibold text-gray-700 leading-tight">{item.label}</span>
              </a>
            ))}
          </div>
        </section>

        {/* ── Segurança no rolê ── */}
        {emergency.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Segurança no rolê 🚨</h2>
            <div className="flex flex-col gap-2">
              {emergency.slice(0, 5).map((s) => {
                const distKm = Math.round(haversineDistance(place.lat, place.lng, s.lat, s.lng) * 10) / 10
                return (
                  <div key={s.id} className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                    <span className="text-2xl flex-shrink-0">{TYPE_ICON[s.type] || '🚑'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{s.name}</p>
                      <p className="text-xs text-gray-400 truncate">{s.address}</p>
                    </div>
                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                      <span className="text-sm font-bold text-gray-700">{distKm} km</span>
                      {s.openNow !== null && (
                        <span className={`text-xs font-medium ${s.openNow ? 'text-green-600' : 'text-red-500'}`}>
                          {s.openNow ? 'Aberto' : 'Fechado'}
                        </span>
                      )}
                      {s.phone && (
                        <a href={`tel:${s.phone}`} className="text-xs text-blue-500 font-medium mt-0.5">{s.phone}</a>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Avaliações Google ── */}
        {place.rating > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3">Avaliações ⭐</h2>
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`text-2xl ${i <= Math.round(place.rating) ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                ))}
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mb-0.5">{place.rating.toFixed(1)}</p>
              <p className="text-sm text-gray-500 mb-4">
                {place.reviewCount.toLocaleString('pt-BR')} avaliações no Google
              </p>
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-500 hover:bg-blue-600 transition-colors"
              >
                Ver reviews completas no Google Maps →
              </a>
            </div>
          </section>
        )}

      </div>
    </div>
  )
}
