'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getApprovedPlaces, getPlacesByCategory } from '@/lib/firestore'
import { haversineDistance } from '@/lib/geolocation'
import DestinationCard from '@/components/DestinationCard'
import CardSkeleton from '@/components/CardSkeleton'
import DestinationMap from '@/components/DestinationMap'
import type { PlaceWithDistance, PlaceCategory } from '@/types'
import { CATEGORY_LABELS } from '@/types'

const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as PlaceCategory[]

function ResultadosContent() {
  const searchParams = useSearchParams()
  const city = searchParams.get('city') || ''
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '100')
  const categoryParam = searchParams.get('category') as PlaceCategory | null

  const [places, setPlaces] = useState<PlaceWithDistance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'blocked' | 'empty' | null>(null)
  const [showMap, setShowMap] = useState(false)
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | ''>(categoryParam || '')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        let raw = activeCategory
          ? await getPlacesByCategory(activeCategory)
          : await getApprovedPlaces()

        let enriched: PlaceWithDistance[] = raw

        if (lat && lng) {
          enriched = raw
            .map((p) => ({
              ...p,
              distanceKm: Math.round(haversineDistance(lat, lng, p.lat, p.lng)),
            }))
            .filter((p) => p.distanceKm! <= radius)
            .sort((a, b) => a.distanceKm! - b.distanceKm!)
        }

        if (enriched.length > 0 && lat && lng) {
          try {
            const destinations = enriched.slice(0, 10).map((p) => `${p.lat},${p.lng}`).join('|')
            const res = await fetch(`/api/distance?origin=${lat},${lng}&destinations=${destinations}`)
            const data = await res.json()
            enriched = enriched.map((p, i) => ({
              ...p,
              durationMin: data.results?.[i]?.durationMin ?? undefined,
            }))
          } catch {
            // OSRM indisponível — continua sem tempo de carro
          }
        }

        const weatherResults = await Promise.allSettled(
          enriched.slice(0, 6).map((p) =>
            fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`).then((r) => r.json())
          )
        )
        enriched = enriched.map((p, i) => ({
          ...p,
          weather: weatherResults[i]?.status === 'fulfilled' ? (weatherResults[i] as PromiseFulfilledResult<any>).value : undefined,
        }))

        setPlaces(enriched)
        if (enriched.length === 0) setError('empty')
      } catch (err: any) {
        const msg = String(err?.message || err)
        // ERR_BLOCKED_BY_CLIENT ou falha de rede → ad blocker ou sem conexão
        const isBlocked = msg.includes('ERR_BLOCKED') || msg.includes('Failed to fetch') || msg.includes('network')
        setError(isBlocked ? 'blocked' : 'empty')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lat, lng, radius, activeCategory])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">
          Rolês perto de <span style={{ color: '#FF6B35' }}>{city || 'você'}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading
            ? 'Buscando destinos...'
            : error === 'blocked'
            ? 'Erro de conexão'
            : `${places.length} destino${places.length !== 1 ? 's' : ''} encontrado${places.length !== 1 ? 's' : ''} em até ${radius} km`}
        </p>
      </div>

      {/* Filtros de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <button
          onClick={() => setActiveCategory('')}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
            activeCategory === '' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
          }`}
        >
          Todos
        </button>
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(activeCategory === cat ? '' : cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Toggle mapa */}
      {!error && places.length > 0 && (
        <button
          onClick={() => setShowMap((v) => !v)}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-xl px-4 py-2 bg-white hover:bg-gray-50"
        >
          🗺️ {showMap ? 'Esconder mapa' : 'Ver no mapa'}
        </button>
      )}

      {showMap && places.length > 0 && (
        <div className="mb-5">
          <DestinationMap places={places} centerLat={lat || undefined} centerLng={lng || undefined} />
        </div>
      )}

      {/* Lista / estados */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error === 'blocked' ? (
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">🚫</div>
          <p className="font-bold text-gray-800 mb-1">Conexão bloqueada</p>
          <p className="text-sm text-gray-500 mb-4">
            Seu bloqueador de anúncios está impedindo a conexão com o banco de dados.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-sm text-amber-800">
            <strong>Como resolver:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              <li>Desativa o uBlock / AdBlock para este site</li>
              <li>Ou abre em <strong>aba anônima</strong> sem extensões</li>
              <li>Ou no celular (sem bloqueador)</li>
            </ul>
          </div>
        </div>
      ) : error === 'empty' || places.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-semibold text-gray-700">Nenhum rolê encontrado</p>
          <p className="text-sm text-gray-400 mt-1">
            Tenta aumentar a distância ou mudar a categoria!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {places.map((p) => <DestinationCard key={p.id} place={p} />)}
        </div>
      )}
    </div>
  )
}

export default function ResultadosPage() {
  return (
    <Suspense fallback={
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="skeleton h-8 w-64 mb-5" />
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    }>
      <ResultadosContent />
    </Suspense>
  )
}
