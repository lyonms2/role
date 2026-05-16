'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getCommunityPlaces } from '@/lib/firestore'
import { haversineDistance } from '@/lib/geolocation'
import DestinationCard from '@/components/DestinationCard'
import CardSkeleton from '@/components/CardSkeleton'
import DestinationMap from '@/components/DestinationMap'
import type { PlaceWithDistance, PlaceCategory } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import { useRoteiro } from '@/lib/roteiro-context'

const FILTER_CATEGORIES: PlaceCategory[] = ['praia', 'cachoeira', 'trilha', 'serra', 'cidade_historica', 'parque']

async function enrichWithDistance(
  places: PlaceWithDistance[],
  lat: number,
  lng: number,
  radius: number
): Promise<PlaceWithDistance[]> {
  return places
    .map((p) => ({ ...p, distanceKm: Math.round(haversineDistance(lat, lng, p.lat, p.lng)) }))
    .filter((p) => p.distanceKm! <= radius)
    .sort((a, b) => a.distanceKm! - b.distanceKm!)
}

function ResultadosContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { destination, itemCount, clearRoteiro } = useRoteiro()
  const city = searchParams.get('city') || ''
  const lat = parseFloat(searchParams.get('lat') || '0')
  const lng = parseFloat(searchParams.get('lng') || '0')
  const radius = parseInt(searchParams.get('radius') || '100')

  const [communityPlaces, setCommunityPlaces] = useState<PlaceWithDistance[]>([])
  const [googlePlaces, setGooglePlaces] = useState<PlaceWithDistance[]>([])
  const [googleExpanded, setGoogleExpanded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<'blocked' | 'empty' | null>(null)
  const [showMap, setShowMap] = useState(searchParams.get('map') === '1')
  const [activeCategory, setActiveCategory] = useState<PlaceCategory | ''>((searchParams.get('category') as PlaceCategory) || '')

  const allPlaces = [...communityPlaces, ...googlePlaces]

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      setCommunityPlaces([])
      setGooglePlaces([])
      setGoogleExpanded(false)

      try {
        const [communityRaw, googleRaw] = await Promise.allSettled([
          getCommunityPlaces(activeCategory || undefined),
          lat && lng
            ? fetch(`/api/places?lat=${lat}&lng=${lng}&radius=${radius}&category=${activeCategory}`).then((r) => r.json())
            : Promise.resolve({ results: [] }),
        ])

        if (communityRaw.status === 'rejected') {
          const msg = String((communityRaw.reason as any)?.message || '')
          if (msg.includes('ERR_BLOCKED') || msg.includes('Failed to fetch') || msg.includes('network')) {
            setError('blocked')
            return
          }
        }

        // Community places
        let community: PlaceWithDistance[] =
          communityRaw.status === 'fulfilled' ? communityRaw.value : []
        if (lat && lng) community = await enrichWithDistance(community, lat, lng, radius)

        // Google places — remove dupes já na comunidade
        let google: PlaceWithDistance[] =
          googleRaw.status === 'fulfilled' ? (googleRaw.value.results || []) : []
        google = google.filter(
          (g) => !community.some((c) => haversineDistance(c.lat, c.lng, g.lat, g.lng) < 0.5)
        )

        // Drive time via OSRM para os primeiros 10 da lista completa
        const allForTime = [...community.slice(0, 5), ...google.slice(0, 5)]
        if (lat && lng && allForTime.length > 0) {
          try {
            const dests = allForTime.map((p) => `${p.lat},${p.lng}`).join('|')
            const res = await fetch(`/api/distance?origin=${lat},${lng}&destinations=${dests}`)
            const data = await res.json()
            const addTime = <T extends PlaceWithDistance>(arr: T[], offset: number): T[] =>
              arr.map((p, i) => ({ ...p, durationMin: data.results?.[offset + i]?.durationMin ?? undefined }))
            community = addTime(community, 0)
            google = addTime(google, community.length)
          } catch { /* OSRM indisponível */ }
        }

        // Clima para os primeiros 6 da comunidade
        if (community.length > 0) {
          const weatherResults = await Promise.allSettled(
            community.slice(0, 6).map((p) =>
              fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`).then((r) => r.json())
            )
          )
          community = community.map((p, i) => ({
            ...p,
            weather: weatherResults[i]?.status === 'fulfilled'
              ? (weatherResults[i] as PromiseFulfilledResult<any>).value
              : undefined,
          }))
        }

        setCommunityPlaces(community)
        setGooglePlaces(google)

        // Auto-expand Google se comunidade tiver < 3 lugares
        setGoogleExpanded(community.length < 3)

        if (community.length === 0 && google.length === 0) setError('empty')
      } catch (err: any) {
        const msg = String(err?.message || err)
        setError(msg.includes('ERR_BLOCKED') || msg.includes('Failed to fetch') ? 'blocked' : 'empty')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [lat, lng, radius, activeCategory])

  const totalCount = communityPlaces.length + googlePlaces.length

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* Banner roteiro ativo */}
      {destination && (
        <div className="w-full mb-4 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
          <span className="text-2xl">🗓️</span>
          <button onClick={() => router.push('/roteiro')} className="flex-1 min-w-0 text-left">
            <p className="text-sm font-bold text-orange-700">Roteiro em andamento</p>
            <p className="text-xs text-orange-500 truncate">
              {destination.name} · {itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''} adicionado${itemCount !== 1 ? 's' : ''}` : 'Sem itens ainda'}
            </p>
          </button>
          <span className="text-orange-400 text-sm font-bold flex-shrink-0 mr-1" onClick={() => router.push('/roteiro')}>→</span>
          <button
            onClick={clearRoteiro}
            className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-red-50 hover:text-red-400 transition-colors text-sm flex-shrink-0"
          >✕</button>
        </div>
      )}

      <div className="mb-5">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-3 transition-colors">
          ← Voltar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          Rolês perto de <span style={{ color: '#FF6B35' }}>{city || 'você'}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {loading
            ? 'Garimpando rolês por aí... 🔍'
            : error === 'blocked'
            ? 'Ops, conexão bloqueada'
            : `${totalCount} rolê${totalCount !== 1 ? 's' : ''} encontrado${totalCount !== 1 ? 's' : ''} em até ${radius} km`}
        </p>
      </div>

      {/* Filtros de categoria */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {FILTER_CATEGORIES.map((cat) => (
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
      {!error && allPlaces.length > 0 && (
        <button
          onClick={() => setShowMap((v) => !v)}
          className="mb-4 flex items-center gap-2 text-sm text-gray-600 border border-gray-200 rounded-xl px-4 py-2 bg-white hover:bg-gray-50"
        >
          🗺️ {showMap ? 'Esconder mapa' : 'Ver no mapa'}
        </button>
      )}

      {showMap && allPlaces.length > 0 && (
        <div className="mb-5">
          <DestinationMap places={allPlaces} centerLat={lat || undefined} centerLng={lng || undefined} />
        </div>
      )}

      {/* Conteúdo */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : error === 'blocked' ? (
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">🚫</div>
          <p className="font-bold text-gray-800 mb-1">Conexão bloqueada 🚫</p>
          <p className="text-sm text-gray-500 mb-4">
            Parece que seu bloqueador de anúncios tá impedindo o app de se conectar.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left text-sm text-amber-800">
            <ul className="list-disc list-inside space-y-1">
              <li>Desativa o uBlock / AdBlock pra esse site</li>
              <li>Ou abre em <strong>aba anônima</strong> sem extensões</li>
              <li>Ou acessa pelo celular (sem bloqueador)</li>
            </ul>
          </div>
        </div>
      ) : error === 'empty' ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-3">🔍</div>
          <p className="font-semibold text-gray-700">Eita, nenhum rolê por aqui!</p>
          <p className="text-sm text-gray-400 mt-1">
            Estica o raio de busca ou troca de categoria — tem coisa boa escondida!
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">

          {/* ── Seção Comunidade ── */}
          {communityPlaces.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-base font-bold text-gray-900">🌟 Descobertas da comunidade</h2>
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                  {communityPlaces.length}
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {communityPlaces.map((p) => (
                  <DestinationCard key={p.id} place={p} />
                ))}
              </div>
            </section>
          )}

          {/* ── Seção Google ── */}
          {googlePlaces.length > 0 && (
            <section>
              <button
                onClick={() => setGoogleExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
                  googleExpanded
                    ? 'bg-gray-50 border-gray-200'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">
                    {communityPlaces.length > 0 ? '🔍 Mais lugares encontrados' : '🔍 Lugares encontrados'}
                  </span>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">
                    {googlePlaces.length}
                  </span>
                </div>
                <span
                  className="text-gray-400 text-lg font-bold transition-transform duration-200"
                  style={{ display: 'inline-block', transform: googleExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ⌄
                </span>
              </button>

              {googleExpanded && (
                <div className="flex flex-col gap-4 mt-3">
                  {googlePlaces.map((p) => (
                    <DestinationCard key={p.id} place={p} />
                  ))}
                </div>
              )}
            </section>
          )}

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
