'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getCommunityPlaces, getApprovedEvents } from '@/lib/firestore'
import { getOptimizedUrl } from '@/lib/cloudinary'
import { haversineDistance } from '@/lib/geolocation'
import DestinationCard from '@/components/DestinationCard'
import DestinationMap from '@/components/DestinationMap'
import Lightbox from '@/components/Lightbox'
import CardSkeleton from '@/components/CardSkeleton'
import Pagination from '@/components/Pagination'
import type { PlaceWithDistance, PlaceCategory, RoleEvent } from '@/types'
import { CATEGORY_LABELS } from '@/types'
import { useRoteiro } from '@/lib/roteiro-context'
import type { EventSnap } from '@/lib/roteiro-context'

type GpsState = 'idle' | 'locating' | 'error'

interface Prediction {
  description: string
  place_id: string
  lat: number
  lng: number
}

const FILTER_CATEGORIES: PlaceCategory[] = ['praia', 'cachoeira', 'trilha', 'serra', 'cidade_historica', 'parque']
const RADII = [50, 100, 150, 200]

const EVENT_ICONS: Record<string, string> = {
  show: '🎤', festival: '🎪', feira: '🏪', esportivo: '⚽', cultural: '🎭', teatro: '🎬',
}

function formatEventDate(ts: any): string {
  try {
    const d = ts?.toDate ? ts.toDate() : new Date((ts?.seconds ?? 0) * 1000)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10`,
      { headers: { 'User-Agent': 'role-app/1.0' } }
    )
    const data = await res.json()
    const addr = data.address || {}
    const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
    const state = addr.state_code || addr.ISO3166_2_lvl4?.replace('BR-', '') || ''
    return city ? `${city}${state ? `, ${state}` : ''}` : 'Minha localização'
  } catch { return 'Minha localização' }
}

function normName(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim()
}

function isDupe(a: PlaceWithDistance, b: PlaceWithDistance): boolean {
  if (a.googlePlaceId && b.googlePlaceId && a.googlePlaceId === b.googlePlaceId) return true
  const dist = haversineDistance(a.lat, a.lng, b.lat, b.lng)
  if (dist < 0.3) return true
  if (normName(a.name) === normName(b.name) && dist < 5) return true
  return false
}

function dedupList(list: PlaceWithDistance[]): PlaceWithDistance[] {
  const out: PlaceWithDistance[] = []
  for (const p of list) {
    if (!out.some((s) => isDupe(s, p))) out.push(p)
  }
  return out
}

async function enrichWithDistance(places: PlaceWithDistance[], lat: number, lng: number, radius: number): Promise<PlaceWithDistance[]> {
  const enriched = places.map((p) => {
    if (p.lat === 0 && p.lng === 0) return p
    return { ...p, distanceKm: Math.round(haversineDistance(lat, lng, p.lat, p.lng)) }
  })
  return enriched
    .filter((p) => p.distanceKm === undefined || p.distanceKm <= radius)
    .sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999))
}

// clearTime: ponto personalizado ativo → zera durationMin pois o tempo pertence à origem principal
function sortPlaces(places: PlaceWithDistance[], sort: string, origin: { lat: number; lng: number } | null, clearTime = false): PlaceWithDistance[] {
  const list = origin
    ? places.map((p) => ({
        ...p,
        distanceKm: Math.round(haversineDistance(origin.lat, origin.lng, p.lat, p.lng)),
        ...(clearTime ? { durationMin: undefined } : {}),
      }))
    : [...places]
  if (sort === 'rating') return list.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
  return list.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999))
}

export default function HomePage() {
  const router = useRouter()
  const { destination, itemCount, clearRoteiro, toggleEvent, hasEvent } = useRoteiro()

  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [radius, setRadius] = useState(100)
  const [category, setCategory] = useState<PlaceCategory | ''>('')
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')
  const [setOriginMode, setSetOriginMode] = useState(false)

  const [showOriginPicker, setShowOriginPicker] = useState(false)
  const [showCitySearch, setShowCitySearch] = useState(false)
  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [city, setCity] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [selectedPrediction, setSelectedPrediction] = useState<{ lat: number; lng: number } | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [communityPlaces, setCommunityPlaces] = useState<PlaceWithDistance[]>([])
  const [googlePlaces, setGooglePlaces] = useState<PlaceWithDistance[]>([])
  const [cityEvents, setCityEvents] = useState<RoleEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [googleExpanded, setGoogleExpanded] = useState(false)
  const [eventsExpanded, setEventsExpanded] = useState(true)
  const [lightbox, setLightbox] = useState<string[] | null>(null)
  const [commPage, setCommPage] = useState(0)
  const [googlePage, setGooglePage] = useState(0)
  const [eventsPage, setEventsPage] = useState(0)

  useEffect(() => {
    if (city.length < 3) { setPredictions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(city)}`)
      const data = await res.json()
      setPredictions(data.predictions || [])
    }, 400)
  }, [city])

  useEffect(() => {
    if (!origin) return
    async function load() {
      setLoading(true)
      setCommunityPlaces([])
      setGooglePlaces([])
      setCityEvents([])
      setCommPage(0); setGooglePage(0); setEventsPage(0)

      const { lat, lng, label } = origin!
      const cityName = label.split(',')[0].trim()

      getApprovedEvents(cityName).then((evs) => {
        const now = new Date()
        const future = evs.filter((e) => {
          try { const d = e.date?.toDate ? e.date.toDate() : new Date((e.date as any)?.seconds * 1000); return d >= now } catch { return true }
        })
        setCityEvents(future)
        setEventsExpanded(future.length > 0)
      }).catch(() => {})

      try {
        const [communityRaw, googleRaw] = await Promise.allSettled([
          getCommunityPlaces(category || undefined),
          fetch(`/api/places?lat=${lat}&lng=${lng}&radius=${radius}&category=${category}`).then((r) => r.json()),
        ])

        let community: PlaceWithDistance[] = communityRaw.status === 'fulfilled' ? communityRaw.value : []
        community = await enrichWithDistance(community, lat, lng, radius)

        let google: PlaceWithDistance[] = googleRaw.status === 'fulfilled' ? (googleRaw.value.results || []) : []
        google = dedupList(google)
        google = google.filter((g) => !community.some((c) => isDupe(c, g)))

        const allForTime = [...community.slice(0, 5), ...google.slice(0, 5)]
        if (allForTime.length > 0) {
          try {
            const dests = allForTime.map((p) => `${p.lat},${p.lng}`).join('|')
            const data = await fetch(`/api/distance?origin=${lat},${lng}&destinations=${dests}`).then((r) => r.json())
            const addTime = <T extends PlaceWithDistance>(arr: T[], offset: number): T[] =>
              arr.map((p, i) => ({ ...p, durationMin: data.results?.[offset + i]?.durationMin ?? undefined }))
            community = addTime(community, 0)
            google = addTime(google, community.length)
          } catch {}
        }

        if (community.length > 0) {
          const weatherResults = await Promise.allSettled(
            community.slice(0, 6).map((p) => fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`).then((r) => r.json()))
          )
          community = community.map((p, i) => ({
            ...p,
            weather: weatherResults[i]?.status === 'fulfilled' ? (weatherResults[i] as PromiseFulfilledResult<any>).value : undefined,
          }))
        }

        setCommunityPlaces(community)
        setGooglePlaces(google)
        setGoogleExpanded(community.length < 3)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [origin, radius, category])

  async function handleGps() {
    setGpsState('locating')
    if (!navigator.geolocation) { setGpsState('error'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        const label = await reverseGeocode(lat, lng)
        setOrigin({ lat, lng, label })
        setGpsState('idle')
        setShowOriginPicker(false)
      },
      () => setGpsState('error'),
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!city || !selectedPrediction) return
    setOrigin({ lat: selectedPrediction.lat, lng: selectedPrediction.lng, label: city })
    setShowOriginPicker(false)
    setShowCitySearch(false)
    setCity(''); setPredictions([]); setSelectedPrediction(null)
  }

  const originCoords = origin ? { lat: origin.lat, lng: origin.lng } : null
  const sortedCommunity = sortPlaces(communityPlaces, sortBy, originCoords)
  const sortedGoogle = sortPlaces(googlePlaces, sortBy, originCoords)
  const allPlaces = [...sortedCommunity, ...sortedGoogle]
  const totalCount = allPlaces.length

  return (
    <div className="flex flex-col pb-24">

      {lightbox && <Lightbox photos={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── Barra de filtros (sticky abaixo do navbar, só com origem definida) ── */}
      {origin && <div className="sticky z-20 bg-white border-b border-gray-100 shadow-sm px-3 pt-2.5 pb-2 flex flex-col gap-2" style={{ top: 56 }}>

        {/* Linha 1: origem + raio */}
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setShowOriginPicker(true)}
            className="flex-1 flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-left min-w-0"
          >
            <span className="text-orange-500 flex-shrink-0 text-base">📍</span>
            <span className="text-sm font-semibold text-gray-700 truncate">
              {origin ? origin.label : 'De onde você sai?'}
            </span>
            <span className="text-gray-400 text-xs flex-shrink-0 ml-auto">▾</span>
          </button>
          <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {RADII.map((r) => (
              <button
                key={r}
                onClick={() => setRadius(r)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  radius === r ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Linha 2: categorias + dist/top + saída personalizada */}
        <div className="flex gap-1.5 items-center overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {FILTER_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => { if (category !== cat) { setCategory(cat); setCommPage(0); setGooglePage(0) } }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === cat ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {CATEGORY_LABELS[cat]}
            </button>
          ))}
          {origin && (
            <>
              <div className="flex-shrink-0 h-4 w-px bg-gray-200 mx-0.5" />
              <button
                onClick={() => setSortBy('distance')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  sortBy === 'distance' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                📍 Dist.
              </button>
              <button
                onClick={() => setSortBy('rating')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  sortBy === 'rating' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                ⭐ Top
              </button>
              <div className="flex-shrink-0 h-4 w-px bg-gray-200 mx-0.5" />
              <button
                onClick={() => setSetOriginMode((v) => !v)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  setOriginMode ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                🏠 Saída
              </button>
            </>
          )}
        </div>
      </div>}

      {/* ── Tela inicial (sem origem) ── */}
      {!origin && !setOriginMode && (
        <div className="flex flex-col items-center gap-5 px-5 pt-8 pb-6">
          <div className="text-center">
            <div className="text-5xl mb-3">🗺️</div>
            <h1 className="text-xl font-bold text-gray-900 mb-1">Descubra rolês perto de você</h1>
            <p className="text-sm text-gray-400">Escolha o ponto de partida para ver os melhores destinos</p>
          </div>

          {/* Raio de busca */}
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-500 mb-2 text-center">Raio de busca</p>
            <div className="flex gap-2">
              {RADII.map((r) => (
                <button
                  key={r}
                  onClick={() => setRadius(r)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    radius === r ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-500 border-gray-100 bg-white'
                  }`}
                >
                  {r} km
                </button>
              ))}
            </div>
          </div>

          {/* Tipo de rolê (obrigatório) */}
          <div className="w-full">
            <p className="text-xs font-semibold text-gray-500 mb-2 text-center">Tipo de rolê</p>
            <div className="grid grid-cols-2 gap-2">
              {FILTER_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                    category === cat
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'text-gray-600 border-gray-100 bg-white hover:border-orange-200'
                  }`}
                >
                  {CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          {/* GPS */}
          <button
            onClick={handleGps}
            disabled={!category || gpsState === 'locating'}
            className="w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl text-white font-bold text-base shadow-sm transition-all"
            style={{ background: !category ? '#d1d5db' : gpsState === 'locating' ? '#9ca3af' : 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}
          >
            {gpsState === 'locating' ? '⏳ Localizando...' : '📍 Usar minha localização atual'}
          </button>
          {gpsState === 'error' && (
            <p className="text-xs text-red-500">Permita o acesso à localização ou escolha outra opção</p>
          )}

          <div className="flex items-center gap-3 w-full">
            <div className="h-px bg-gray-100 flex-1" />
            <span className="text-xs text-gray-400 flex-shrink-0">ou</span>
            <div className="h-px bg-gray-100 flex-1" />
          </div>

          {/* Ponto no mapa */}
          <button
            onClick={() => category && setSetOriginMode(true)}
            className={`w-full flex items-center justify-center gap-3 py-4 px-5 rounded-2xl font-bold text-base border-2 transition-all ${
              category ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-gray-100 text-gray-400 bg-gray-50'
            }`}
          >
            🗺️ Escolher ponto no mapa
          </button>

          {/* Busca por cidade — expansível inline */}
          {!showCitySearch ? (
            <button
              onClick={() => setShowCitySearch(true)}
              className="text-sm text-gray-400 underline underline-offset-2"
            >
              ou buscar por cidade
            </button>
          ) : (
            <form onSubmit={handleManualSubmit} className="w-full flex flex-col gap-3">
              <div className="relative">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setSelectedPrediction(null) }}
                  placeholder="Ex: Florianópolis, SC"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  autoFocus
                  autoComplete="off"
                />
                {predictions.length > 0 && (
                  <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                    {predictions.map((p) => (
                      <li
                        key={p.place_id}
                        onClick={() => {
                          setPredictions([])
                          setShowCitySearch(false)
                          setShowOriginPicker(false)
                          setCity('')
                          setSelectedPrediction(null)
                          setOrigin({ lat: p.lat, lng: p.lng, label: p.description })
                        }}
                        className="px-4 py-3 cursor-pointer hover:bg-orange-50 text-sm border-b last:border-0 border-gray-100"
                      >
                        📍 {p.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowCitySearch(false); setCity(''); setPredictions([]); setSelectedPrediction(null) }}
                  className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-gray-500"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!city || !selectedPrediction || !category}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: !city || !selectedPrediction || !category ? '#d1d5db' : '#FF6B35' }}
                >
                  Ver rolês →
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Mapa (modo toque sem origem, ou com origem) ── */}
      {(origin || setOriginMode) && (
        <div className="relative flex-shrink-0" style={{ height: setOriginMode && !origin ? 'calc(100dvh - 112px)' : 260 }}>
          <DestinationMap
            places={allPlaces}
            centerLat={origin?.lat}
            centerLng={origin?.lng}
            onOriginChange={setOriginMode ? (lat, lng) => {
              setSetOriginMode(false)
              setSortBy('distance')
              setOrigin({ lat, lng, label: 'Ponto personalizado' })
              reverseGeocode(lat, lng).then((label) =>
                setOrigin((prev) => (prev?.lat === lat && prev?.lng === lng ? { lat, lng, label } : prev))
              )
            } : undefined}
            originLat={origin?.lat}
            originLng={origin?.lng}
            mapClassName="w-full h-full"
          />
          {setOriginMode && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-blue-600/95 backdrop-blur-sm text-white text-xs font-semibold px-4 py-3">
              <span>🗺️ Toque no mapa para marcar seu ponto de partida</span>
              <button
                onClick={() => setSetOriginMode(false)}
                className="ml-auto flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Lista (só aparece após selecionar origem) ── */}
      {origin && (
        <div className="flex flex-col gap-6 px-4 pt-4">

          {/* Roteiro ativo */}
          {destination && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
              <span className="text-xl">🗓️</span>
              <button onClick={() => router.push('/roteiro')} className="flex-1 min-w-0 text-left">
                <p className="text-xs font-bold text-orange-700">Roteiro em andamento</p>
                <p className="text-xs text-orange-500 truncate">
                  {destination.name} · {itemCount > 0 ? `${itemCount} iten${itemCount !== 1 ? 's' : ''}` : 'Sem itens'}
                </p>
              </button>
              <button onClick={() => router.push('/roteiro')} className="text-orange-400 font-bold flex-shrink-0">→</button>
              <button onClick={clearRoteiro} className="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-400 text-sm flex-shrink-0">✕</button>
            </div>
          )}

          {/* Contagem */}
          {!loading && (
            <p className="text-sm text-gray-500">
              {totalCount === 0 && cityEvents.length === 0
                ? 'Nenhum rolê encontrado — tenta aumentar o raio'
                : <><span className="font-bold text-gray-800">{totalCount}</span> rolê{totalCount !== 1 ? 's' : ''} em até {radius} km de <span className="text-orange-500 font-semibold">{origin.label}</span></>
              }
            </p>
          )}

          {/* Skeletons */}
          {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}

          {/* Comunidade */}
          {!loading && sortedCommunity.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-bold text-gray-900">🌟 Descobertas da comunidade</h2>
                <span className="text-xs font-semibold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{sortedCommunity.length}</span>
              </div>
              <div className="flex flex-col gap-4">
                {sortedCommunity.slice(commPage * 5, (commPage + 1) * 5).map((p) => (
                  <DestinationCard key={p.id} place={p} />
                ))}
                <Pagination page={commPage} totalPages={Math.ceil(sortedCommunity.length / 5)} onPrev={() => setCommPage((p) => p - 1)} onNext={() => setCommPage((p) => p + 1)} />
              </div>
            </section>
          )}

          {/* Google Places */}
          {!loading && sortedGoogle.length > 0 && (
            <section>
              <button
                onClick={() => setGoogleExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
                  googleExpanded ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">
                    {sortedCommunity.length > 0 ? '🔍 Mais lugares' : '🔍 Lugares encontrados'}
                  </span>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-600 rounded-full px-2 py-0.5">{sortedGoogle.length}</span>
                </div>
                <span className="text-gray-400 text-lg font-bold" style={{ display: 'inline-block', transform: googleExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
              </button>
              {googleExpanded && (
                <div className="flex flex-col gap-4 mt-3">
                  {sortedGoogle.slice(googlePage * 5, (googlePage + 1) * 5).map((p) => (
                    <DestinationCard key={p.id} place={p} />
                  ))}
                  <Pagination page={googlePage} totalPages={Math.ceil(sortedGoogle.length / 5)} onPrev={() => setGooglePage((p) => p - 1)} onNext={() => setGooglePage((p) => p + 1)} />
                </div>
              )}
            </section>
          )}

          {/* Eventos */}
          {!loading && cityEvents.length > 0 && (
            <section>
              <button
                onClick={() => setEventsExpanded((v) => !v)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border transition-colors ${
                  eventsExpanded ? 'bg-purple-50 border-purple-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-gray-700">🎭 Eventos na região</span>
                  <span className="text-xs font-semibold bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">{cityEvents.length}</span>
                </div>
                <span className="text-gray-400 text-lg font-bold" style={{ display: 'inline-block', transform: eventsExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>⌄</span>
              </button>
              {eventsExpanded && (
                <div className="flex flex-col gap-3 mt-3">
                  {cityEvents.slice(eventsPage * 5, (eventsPage + 1) * 5).map((ev) => {
                    const snap: EventSnap = { id: ev.id, name: ev.name, city: ev.city, venue: ev.venue, date: ev.date, category: ev.category, photoUrl: ev.photoUrl, mapsLink: ev.mapsLink }
                    const added = hasEvent(ev.id)
                    return (
                      <div key={ev.id} className={`rounded-2xl border overflow-hidden ${added ? 'border-purple-300 bg-purple-50' : 'border-gray-100 bg-white'}`}>
                        {ev.photoUrl && (
                          <button onClick={() => setLightbox([ev.photoUrl!])} className="relative h-28 w-full block cursor-zoom-in focus:outline-none">
                            <img src={getOptimizedUrl(ev.photoUrl!, 640)} alt={ev.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            <span className="absolute bottom-2 left-3 bg-purple-600/90 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                              {EVENT_ICONS[ev.category] || '🎭'} {ev.category}
                            </span>
                          </button>
                        )}
                        <div className="px-3 py-3 flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-900 text-sm">{ev.name}</p>
                            <p className="text-xs text-gray-500">📍 {ev.venue}</p>
                            <p className="text-xs text-purple-700 font-semibold">📅 {formatEventDate(ev.date)}</p>
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              {ev.ticketUrl && (
                                <a href={ev.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white bg-purple-600 px-2.5 py-1 rounded-lg">Ingressos →</a>
                              )}
                              <a href={`/evento/${ev.id}`} className="text-xs font-semibold text-purple-500">Ver evento →</a>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleEvent(snap)}
                            className={`flex-shrink-0 mt-0.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                              added ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-orange-500 text-white hover:bg-orange-600'
                            }`}
                          >
                            {added ? '✓ No roteiro' : '+ Roteiro'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                  <Pagination page={eventsPage} totalPages={Math.ceil(cityEvents.length / 5)} onPrev={() => setEventsPage((p) => p - 1)} onNext={() => setEventsPage((p) => p + 1)} />
                </div>
              )}
            </section>
          )}

        </div>
      )}

      {/* ── Origin picker (modal fixo) ── */}
      {showOriginPicker && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end z-50"
          onClick={() => setShowOriginPicker(false)}
        >
          <div
            className="bg-white w-full max-w-2xl mx-auto rounded-t-3xl p-5 pb-10"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-bold text-gray-900 mb-4">De onde você vai sair?</h2>

            <button
              onClick={handleGps}
              disabled={gpsState === 'locating'}
              className="w-full flex items-center gap-3 py-4 px-5 rounded-2xl text-white font-bold text-sm mb-3"
              style={{ background: gpsState === 'locating' ? '#9ca3af' : 'linear-gradient(135deg, #FF6B35, #f97316)' }}
            >
              {gpsState === 'locating' ? '⏳ Localizando...' : '📍 Usar minha localização atual'}
            </button>
            {gpsState === 'error' && (
              <p className="text-xs text-red-500 text-center mb-3">Permita o acesso à localização nas configurações</p>
            )}

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-100" />
              <span className="text-xs text-gray-400">ou busque a cidade</span>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            <form onSubmit={handleManualSubmit}>
              <div className="relative mb-3">
                <input
                  type="text"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setSelectedPrediction(null) }}
                  placeholder="Ex: Florianópolis, SC"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  autoFocus
                  autoComplete="off"
                />
                {predictions.length > 0 && (
                  <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                    {predictions.map((p) => (
                      <li
                        key={p.place_id}
                        onClick={() => {
                          setPredictions([])
                          setShowCitySearch(false)
                          setShowOriginPicker(false)
                          setCity('')
                          setSelectedPrediction(null)
                          setOrigin({ lat: p.lat, lng: p.lng, label: p.description })
                        }}
                        className="px-4 py-3 cursor-pointer hover:bg-orange-50 text-sm border-b last:border-0 border-gray-100"
                      >
                        📍 {p.description}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2 mb-4">
                {RADII.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadius(r)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                      radius === r ? 'bg-orange-500 text-white border-orange-500' : 'text-gray-500 border-gray-100'
                    }`}
                  >
                    {r}km
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!city || !selectedPrediction}
                className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all"
                style={{ background: !city || !selectedPrediction ? '#d1d5db' : '#FF6B35' }}
              >
                🗺️ Ver rolês no mapa
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
