'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCommunityPlaces, getApprovedEvents } from '@/lib/firestore'
import { getOptimizedUrl } from '@/lib/cloudinary'
import { haversineDistance } from '@/lib/geolocation'
import DestinationCard from '@/components/DestinationCard'
import DestinationMap from '@/components/DestinationMap'
import Lightbox from '@/components/Lightbox'
import CardSkeleton from '@/components/CardSkeleton'
import Pagination from '@/components/Pagination'
import type { PlaceWithDistance, PlaceCategory, RoleEvent } from '@/types'
import { useRoteiro } from '@/lib/roteiro-context'

import type { EventSnap } from '@/lib/roteiro-context'
import { useAuth } from '@/lib/auth-context'

type GpsState = 'idle' | 'locating' | 'error'
type MainCategoryId = 'ar_livre' | 'lazer' | 'cultura' | 'eventos'
type SubCategoryId = 'praia' | 'cachoeira' | 'trilha' | 'serra' | 'parque' | 'zoo' | 'diversoes' | 'mirante' | 'museu' | 'patrimonio' | 'teatro' | 'eventos'
type FilterCategory = SubCategoryId | ''

interface Prediction {
  description: string
  place_id: string
  lat: number
  lng: number
}

const RADII = [3, 5, 8, 10]

const MAIN_CATEGORIES: { id: MainCategoryId; emoji: string; label: string; bg: string; border: string; active: string }[] = [
  { id: 'ar_livre',  emoji: '🌿', label: 'Ao Ar Livre', bg: 'bg-green-50',  border: 'border-green-200',  active: 'border-green-500 bg-green-100' },
  { id: 'lazer',     emoji: '🎉', label: 'Lazer',        bg: 'bg-yellow-50', border: 'border-yellow-200', active: 'border-yellow-500 bg-yellow-100' },
  { id: 'cultura',   emoji: '🎭', label: 'Cultura',      bg: 'bg-purple-50', border: 'border-purple-200', active: 'border-purple-500 bg-purple-100' },
  { id: 'eventos',   emoji: '🎪', label: 'Eventos',      bg: 'bg-red-50',    border: 'border-red-200',    active: 'border-red-500 bg-red-100' },
]

const SUBCATEGORIES: Record<MainCategoryId, { id: SubCategoryId; emoji: string; label: string }[]> = {
  ar_livre: [
    { id: 'praia',    emoji: '🏖️', label: 'Praia' },
    { id: 'cachoeira',emoji: '💧', label: 'Cachoeira' },
    { id: 'trilha',   emoji: '🥾', label: 'Trilha' },
    { id: 'serra',    emoji: '⛰️', label: 'Serra & Montanha' },
  ],
  lazer: [
    { id: 'parque',   emoji: '🌳', label: 'Parque' },
    { id: 'zoo',      emoji: '🦁', label: 'Zoo & Aquário' },
    { id: 'diversoes',emoji: '🎡', label: 'Parque de Diversões' },
    { id: 'mirante',  emoji: '🔭', label: 'Mirante' },
  ],
  cultura: [
    { id: 'museu',     emoji: '🏛️', label: 'Museu' },
    { id: 'patrimonio',emoji: '⛪', label: 'Patrimônio Histórico' },
    { id: 'teatro',    emoji: '🎨', label: 'Teatro & Arte' },
  ],
  eventos: [],
}

const SUB_TO_FIRESTORE: Record<string, PlaceCategory> = {
  praia: 'praia', cachoeira: 'cachoeira', trilha: 'trilha', serra: 'serra',
  parque: 'parque', zoo: 'parque', diversoes: 'parque', mirante: 'natureza',
  museu: 'cidade_historica', patrimonio: 'cidade_historica', teatro: 'cidade_historica',
}

const SUB_LABELS: Record<string, string> = {
  praia: '🏖️ Praia', cachoeira: '💧 Cachoeira', trilha: '🥾 Trilha', serra: '⛰️ Serra & Montanha',
  parque: '🌳 Parque', zoo: '🦁 Zoo & Aquário', diversoes: '🎡 Diversões', mirante: '🔭 Mirante',
  museu: '🏛️ Museu', patrimonio: '⛪ Patrimônio', teatro: '🎨 Teatro & Arte', eventos: '🎪 Eventos',
}

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
      { headers: { 'User-Agent': 'letsapp/1.0' } }
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
  const { user } = useAuth()
  const { destination, itemCount, clearRoteiro, toggleEvent, hasEvent } = useRoteiro()

  const [step, setStep] = useState<'category' | 'subcategory' | 'radius' | 'origin'>('category')
  const [mainCategory, setMainCategory] = useState<MainCategoryId | ''>('')
  const [origin, setOrigin] = useState<{ lat: number; lng: number; label: string } | null>(null)
  const [radius, setRadius] = useState(5)
  const [category, setCategory] = useState<FilterCategory>('')
  const [sortBy, setSortBy] = useState<'distance' | 'rating'>('distance')
  const [view, setView] = useState<'map' | 'list'>('map')
  const [setOriginMode, setSetOriginMode] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const [editingOrigin, setEditingOrigin] = useState(false)
  const [showCitySearch, setShowCitySearch] = useState(false)
  const [gpsState, setGpsState] = useState<GpsState>('idle')
  const [city, setCity] = useState('')
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [communityPlaces, setCommunityPlaces] = useState<PlaceWithDistance[]>([])
  const [googlePlaces, setGooglePlaces] = useState<PlaceWithDistance[]>([])
  const [cityEvents, setCityEvents] = useState<RoleEvent[]>([])
  const [communityOnly, setCommunityOnly] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleExpanded, setGoogleExpanded] = useState(false)
  const [eventsExpanded, setEventsExpanded] = useState(true)
  const [lightbox, setLightbox] = useState<string[] | null>(null)
  const [commPage, setCommPage] = useState(0)
  const [googlePage, setGooglePage] = useState(0)
  const [eventsPage, setEventsPage] = useState(0)

  // Restaura estado da busca ao voltar de uma página de detalhe
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('letsapp_search')
      if (!saved) return
      const s = JSON.parse(saved)
      if (s.origin?.lat && s.origin?.lng) setOrigin(s.origin)
      if (RADII.includes(s.radius)) setRadius(s.radius)
      if (s.category !== undefined) setCategory(s.category)
      if (s.mainCategory) setMainCategory(s.mainCategory)
      if (s.view === 'map' || s.view === 'list') setView(s.view)
      if (s.sortBy === 'distance' || s.sortBy === 'rating') setSortBy(s.sortBy)
    } catch {}
  }, [])

  // Persiste estado da busca no sessionStorage
  useEffect(() => {
    if (!origin) return
    try {
      sessionStorage.setItem('letsapp_search', JSON.stringify({ origin, radius, category, mainCategory, view, sortBy }))
    } catch {}
  }, [origin, radius, category, mainCategory, view, sortBy])

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
      const firestoreCategory: PlaceCategory | undefined = category && category !== 'eventos' ? SUB_TO_FIRESTORE[category] : undefined

      getApprovedEvents(cityName).then(async (evs) => {
        const now = new Date()
        const future = evs.filter((e) => {
          try { const d = e.date?.toDate ? e.date.toDate() : new Date((e.date as any)?.seconds * 1000); return d >= now } catch { return true }
        })
        const withCoords = future.filter((e) => e.lat && e.lng)
        if (withCoords.length > 0) {
          try {
            const dests = withCoords.map((e) => `${e.lat},${e.lng}`).join('|')
            const data = await fetch(`/api/distance?origin=${lat},${lng}&destinations=${dests}`).then((r) => r.json())
            const withDur = future.map((ev) => {
              const idx = withCoords.findIndex((e) => e.id === ev.id)
              return idx >= 0 ? { ...ev, durationMin: data.results?.[idx]?.durationMin ?? undefined } : ev
            })
            setCityEvents(withDur)
          } catch { setCityEvents(future) }
        } else {
          setCityEvents(future)
        }
        setEventsExpanded(true)
      }).catch(() => {})

      try {
        const [communityRaw, googleRaw] = await Promise.allSettled([
          getCommunityPlaces(firestoreCategory),
          category === 'eventos'
            ? Promise.resolve({ results: [] })
            : fetch(`/api/places?lat=${lat}&lng=${lng}&radius=${radius}&category=${category}`).then((r) => r.json()),
        ])

        let community: PlaceWithDistance[] = communityRaw.status === 'fulfilled' ? communityRaw.value : []
        community = await enrichWithDistance(community, lat, lng, radius)

        let google: PlaceWithDistance[] = googleRaw.status === 'fulfilled' ? (googleRaw.value.results || []) : []
        google = dedupList(google)
        google = google.filter((g) => !community.some((c) => isDupe(c, g)))

        const commForTime = community.slice(0, 20)
        const gooForTime = google.slice(0, 20)
        const allForTime = [...commForTime, ...gooForTime]
        if (allForTime.length > 0) {
          try {
            const dests = allForTime.map((p) => `${p.lat},${p.lng}`).join('|')
            const data = await fetch(`/api/distance?origin=${lat},${lng}&destinations=${dests}`).then((r) => r.json())
            const addRouteData = <T extends PlaceWithDistance>(arr: T[], offset: number, sent: number): T[] =>
              arr.map((p, i) => ({
                ...p,
                durationMin: i < sent ? (data.results?.[offset + i]?.durationMin ?? undefined) : undefined,
              }))
            community = addRouteData(community, 0, commForTime.length)
            google = addRouteData(google, commForTime.length, gooForTime.length)
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
        setEditingOrigin(false)
      },
      () => setGpsState('error'),
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  function closeCitySearch() {
    setEditingOrigin(false)
    setCity(''); setPredictions([])
  }

  const firstName = user?.displayName?.split(' ')[0] ?? ''

  function handleCategorySelect(catId: MainCategoryId) {
    setMainCategory(catId)
    if (catId === 'eventos') {
      setCategory('eventos')
      setStep('radius')
    } else {
      setStep('subcategory')
    }
  }

  function handleSubcategorySelect(subId: SubCategoryId) {
    setCategory(subId)
    setStep('radius')
  }

  function goBack() {
    if (step === 'subcategory') { setStep('category') }
    else if (step === 'radius') { setStep(mainCategory === 'eventos' ? 'category' : 'subcategory') }
    else if (step === 'origin') { setStep('radius') }
  }

  const originCoords = origin ? { lat: origin.lat, lng: origin.lng } : null
  const sortedCommunity = sortPlaces(communityPlaces, sortBy, originCoords)
    .filter((p) => p.distanceKm === undefined || p.distanceKm <= radius)
  const sortedGoogle = sortPlaces(googlePlaces, sortBy, originCoords)
    .filter((p) => p.distanceKm === undefined || p.distanceKm <= radius)
  const allPlaces = communityOnly ? [...sortedCommunity] : [...sortedCommunity, ...sortedGoogle]
  const totalCount = allPlaces.length

  const mapPlaces = category === 'eventos'
    ? cityEvents
        .filter((e) => e.lat && e.lng)
        .map((e) => {
          const toD = (ts: any) => ts?.toDate ? ts.toDate() : new Date((ts?.seconds ?? 0) * 1000)
          const fmt = (ts: any) => toD(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
          const fmtDate = (ts: any) => toD(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
          const sameDay = e.endDate && toD(e.date).toDateString() === toD(e.endDate).toDateString()
          const subtitle = e.endDate
            ? sameDay
              ? `📅 ${fmtDate(e.date)} · ${fmt(e.date)} – ${fmt(e.endDate)}`
              : `📅 ${fmtDate(e.date)} – ${fmtDate(e.endDate)}`
            : `📅 ${fmtDate(e.date)} · ${fmt(e.date)}`
          return {
            id: e.id,
            name: e.name,
            city: e.city,
            state: e.state,
            category: 'natureza' as const,
            description: e.description,
            lat: e.lat!,
            lng: e.lng!,
            averageRating: 0,
            reviewCount: 0,
            verifiedReviewCount: 0,
            status: 'approved' as const,
            createdAt: e.createdAt,
            source: 'event' as const,
            subtitle,
            durationMin: e.durationMin,
          }
        })
    : allPlaces

  return (
    <div className="flex flex-col">

      {lightbox && <Lightbox photos={lightbox} onClose={() => setLightbox(null)} />}

      {/* ── Barra de filtros (sticky abaixo do navbar, só com origem definida) ── */}
      {origin && <div className="sticky z-20 bg-white border-b border-gray-100 shadow-sm" style={{ top: 0 }}>
      <div className="max-w-2xl mx-auto px-3 pt-2 pb-2 flex flex-col gap-1.5">

        {/* Linha 1: onde — origem + raio + visualização */}
        <div className="flex gap-2 items-center">
          {editingOrigin ? (
            <div className="flex-1 relative min-w-0">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Digite a cidade..."
                className="w-full bg-orange-50 border border-orange-300 rounded-xl px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none"
                autoFocus
                autoComplete="off"
              />
              <button onClick={closeCitySearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs px-1">✕</button>
              {predictions.length > 0 && (
                <ul className="absolute z-30 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                  {predictions.map((p) => (
                    <li
                      key={p.place_id}
                      onClick={() => { setOrigin({ lat: p.lat, lng: p.lng, label: p.description }); closeCitySearch() }}
                      className="px-4 py-3 cursor-pointer hover:bg-orange-50 text-sm border-b last:border-0 border-gray-100"
                    >
                      📍 {p.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setCity(origin?.label ?? ''); setEditingOrigin(true) }}
              className="flex-1 flex items-center gap-2 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 text-left min-w-0"
            >
              <span className="text-orange-500 flex-shrink-0">📍</span>
              <span className="text-sm font-semibold text-gray-700 truncate">{origin?.label}</span>
              <span className="text-gray-400 text-xs flex-shrink-0 ml-auto">▾</span>
            </button>
          )}
          <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            {RADII.map((r) => (
              <button key={r} onClick={() => setRadius(r)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${radius === r ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                {r}
              </button>
            ))}
          </div>
          <div className="flex gap-0.5 bg-gray-100 rounded-xl p-1 flex-shrink-0">
            <button onClick={() => setView('map')} title="Mapa"
              className={`px-2 py-1 rounded-lg text-sm transition-all ${view === 'map' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>🗺️</button>
            <button onClick={() => setView('list')} title="Lista"
              className={`px-2 py-1 rounded-lg text-sm transition-all ${view === 'list' ? 'bg-white shadow-sm' : 'text-gray-400'}`}>📋</button>
            <button onClick={() => { setSetOriginMode((v) => !v); setView('map') }} title="Marcar ponto no mapa"
              className={`px-2 py-1 rounded-lg text-sm transition-all ${setOriginMode ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400'}`}>✚</button>
          </div>
          {/* Toggle filtros */}
          <button
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-100 text-gray-500 text-sm"
            title="Filtros"
          >
            {mainCategory ? MAIN_CATEGORIES.find((c) => c.id === mainCategory)?.emoji : '🔍'}
            <span className="text-xs">{filtersOpen ? '▴' : '▾'}</span>
          </button>
          {/* Toggle ordenação (só na lista) */}
          {view === 'list' && (
            <button
              onClick={() => setSortOpen((v) => !v)}
              className="flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-xl bg-gray-100 text-gray-500 text-sm"
              title="Ordenação"
            >
              ⇅<span className="text-xs">{sortOpen ? '▴' : '▾'}</span>
            </button>
          )}
        </div>

        {/* Linhas 2/3/4 — colapsáveis */}
        {filtersOpen && (<>

        {/* Linha 2: grupos principais */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setOrigin(null); setStep('category'); setCategory(''); setMainCategory(''); setFiltersOpen(false) }}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold"
            title="Voltar ao início"
          >
            ←
          </button>
          {MAIN_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setMainCategory(cat.id)
                if (cat.id === 'eventos') { setCategory('eventos'); setCommPage(0); setGooglePage(0); setFiltersOpen(false) }
              }}
              className={`flex-1 flex flex-col items-center py-1.5 rounded-xl border-2 transition-all ${
                mainCategory === cat.id ? cat.active : `${cat.bg} ${cat.border}`
              }`}
            >
              <span className="text-base leading-none">{cat.emoji}</span>
              <span className="text-[10px] font-semibold leading-tight mt-0.5 text-gray-600 whitespace-nowrap">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Linha 3: subcategorias do grupo selecionado — centralizadas */}
        {mainCategory && mainCategory !== 'eventos' && (
          <div className="flex flex-wrap gap-2 justify-center">
            {SUBCATEGORIES[mainCategory].map((sub) => (
              <button key={sub.id}
                onClick={() => { setCategory(sub.id); setCommPage(0); setGooglePage(0); setFiltersOpen(false) }}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  category === sub.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {sub.emoji} {sub.label}
              </button>
            ))}
          </div>
        )}

        </>)}

        {/* Ordenação — colapsável, centralizada, só na lista */}
        {view === 'list' && sortOpen && (
          <div className="flex gap-2 items-center justify-center">
            <button onClick={() => setSortBy('distance')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sortBy === 'distance' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              📍 Distância
            </button>
            <button onClick={() => setSortBy('rating')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${sortBy === 'rating' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              ⭐ Melhor avaliado
            </button>
            <div className="h-4 w-px bg-gray-200" />
            <button onClick={() => setCommunityOnly((v) => !v)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${communityOnly ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
              👥 Comunidade
            </button>
          </div>
        )}
      </div></div>}

      {/* ── Wizard de busca (sem origem) ── */}
      {!origin && !setOriginMode && (
        <div className="max-w-2xl mx-auto w-full flex flex-col items-center gap-6 px-5 pt-8 pb-8">

          {/* Step 1 — categoria principal */}
          {step === 'category' && (
            <>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {firstName ? `Olá, ${firstName}! 👋` : 'Olá! 👋'}
                </h1>
                <p className="text-sm text-gray-500">O que você está afim de fazer hoje?</p>
              </div>
              <div className="w-full grid grid-cols-2 gap-3">
                {MAIN_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`flex flex-col items-center gap-3 py-6 rounded-2xl border-2 transition-all active:scale-95 ${cat.bg} ${cat.border}`}
                  >
                    <span className="text-4xl">{cat.emoji}</span>
                    <span className="text-sm font-bold text-gray-700">{cat.label}</span>
                  </button>
                ))}
              </div>
              <Link href="/sugerir" className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm text-gray-400 bg-gray-50 border border-gray-100 hover:bg-orange-50 hover:border-orange-200 hover:text-orange-500 transition-colors">
                ➕ Conhece um lugar bacana? <span className="font-bold">Sugerir</span>
              </Link>
            </>
          )}

          {/* Step 2 — subcategoria */}
          {step === 'subcategory' && mainCategory && mainCategory !== 'eventos' && (
            <>
              <div className="w-full flex items-center gap-2">
                <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base">←</button>
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-400">Você escolheu</p>
                  <p className="text-base font-bold text-gray-800">
                    {MAIN_CATEGORIES.find((c) => c.id === mainCategory)?.emoji}{' '}
                    {MAIN_CATEGORIES.find((c) => c.id === mainCategory)?.label}
                  </p>
                </div>
                <div className="w-9" />
              </div>
              <p className="text-sm text-gray-600 font-medium -mt-3">O que especificamente?</p>
              <div className="w-full grid grid-cols-2 gap-3">
                {SUBCATEGORIES[mainCategory].map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => handleSubcategorySelect(sub.id)}
                    className="flex flex-col items-center gap-2 py-5 rounded-2xl border-2 border-gray-100 bg-white transition-all active:scale-95 hover:border-orange-300 hover:bg-orange-50"
                  >
                    <span className="text-3xl">{sub.emoji}</span>
                    <span className="text-sm font-semibold text-gray-700">{sub.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3 — raio */}
          {step === 'radius' && (
            <>
              <div className="w-full flex items-center gap-2">
                <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base">←</button>
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-400">{SUB_LABELS[category] || MAIN_CATEGORIES.find((c) => c.id === mainCategory)?.label}</p>
                  <p className="text-base font-bold text-gray-800">Qual distância você quer ir?</p>
                </div>
                <div className="w-9" />
              </div>
              <div className="w-full grid grid-cols-2 gap-3">
                {RADII.map((r) => (
                  <button
                    key={r}
                    onClick={() => { setRadius(r); setStep('origin') }}
                    className={`py-5 rounded-2xl text-lg font-bold border-2 transition-all active:scale-95 ${
                      radius === r ? 'bg-orange-500 text-white border-orange-500 shadow-md' : 'text-gray-600 border-gray-100 bg-white hover:border-orange-300 hover:bg-orange-50'
                    }`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 4 — origem */}
          {step === 'origin' && (
            <>
              <div className="w-full flex items-center gap-2">
                <button onClick={goBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base">←</button>
                <div className="flex-1 text-center">
                  <p className="text-xs text-gray-400">Até {radius} km · {SUB_LABELS[category] || MAIN_CATEGORIES.find((c) => c.id === mainCategory)?.label}</p>
                  <p className="text-base font-bold text-gray-800">De onde você parte?</p>
                </div>
                <div className="w-9" />
              </div>

              <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                {/* GPS */}
                <button
                  onClick={handleGps}
                  disabled={gpsState === 'locating'}
                  className="w-full flex items-center gap-3 py-4 px-4 border-b border-gray-100 hover:bg-orange-50 active:bg-orange-100 transition-all text-left"
                >
                  <span className="text-2xl flex-shrink-0">📍</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight text-gray-800">
                      {gpsState === 'locating' ? 'Localizando...' : 'Usar minha localização'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">GPS do dispositivo</p>
                  </div>
                  <span className="font-bold text-lg flex-shrink-0 text-orange-400">›</span>
                </button>
                {gpsState === 'error' && (
                  <p className="text-xs text-red-500 text-center px-4 py-2 bg-red-50">Permita o acesso à localização ou escolha outra opção</p>
                )}

                {/* Mapa */}
                <button
                  onClick={() => setSetOriginMode(true)}
                  className="w-full flex items-center gap-3 py-4 px-4 border-b border-gray-100 hover:bg-blue-50 active:bg-blue-100 transition-all text-left"
                >
                  <span className="text-2xl flex-shrink-0">🗺️</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight text-gray-800">Escolher no mapa</p>
                    <p className="text-xs text-gray-400 mt-0.5">Toque para marcar o ponto</p>
                  </div>
                  <span className="font-bold text-lg flex-shrink-0 text-blue-400">›</span>
                </button>

                {/* Cidade */}
                {!showCitySearch ? (
                  <button
                    onClick={() => setShowCitySearch(true)}
                    className="w-full flex items-center gap-3 py-4 px-4 hover:bg-gray-50 transition-all text-left"
                  >
                    <span className="text-2xl flex-shrink-0">🔍</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight text-gray-800">Buscar por cidade</p>
                      <p className="text-xs text-gray-400 mt-0.5">Digite o nome da cidade</p>
                    </div>
                    <span className="font-bold text-lg flex-shrink-0 text-gray-400">›</span>
                  </button>
                ) : (
                  <div className="p-4 flex flex-col gap-2">
                    <div className="relative">
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Ex: Florianópolis, SC"
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400"
                        autoFocus
                        autoComplete="off"
                      />
                      {predictions.length > 0 && (
                        <ul className="absolute z-10 top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                          {predictions.map((p) => (
                            <li
                              key={p.place_id}
                              onClick={() => { setOrigin({ lat: p.lat, lng: p.lng, label: p.description }); setCity(''); setPredictions([]); setShowCitySearch(false) }}
                              className="px-4 py-3 cursor-pointer hover:bg-orange-50 text-sm border-b last:border-0 border-gray-100"
                            >
                              📍 {p.description}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowCitySearch(false); setCity(''); setPredictions([]) }}
                      className="text-xs text-gray-400 underline underline-offset-2 self-center"
                    >
                      cancelar
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      )}

      {/* ── Mapa (modo toque sem origem, ou com origem no modo mapa) ── */}
      {(origin || setOriginMode) && (view === 'map' || setOriginMode) && (
        <div className="relative flex-shrink-0" style={{ height: origin ? 'calc(100dvh - 170px)' : 'calc(100dvh - 116px)' }}>
          <DestinationMap
            places={mapPlaces}
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
            radiusKm={origin ? radius : undefined}
            mapClassName="w-full h-full"
          />
          {/* Instrução modo toque */}
          {setOriginMode && (
            <div className="absolute bottom-0 left-0 right-0 flex items-center gap-3 bg-blue-600/95 backdrop-blur-sm text-white text-xs font-semibold px-4 py-3 z-10">
              <span>🗺️ Toque no mapa para marcar seu ponto de partida</span>
              <button
                onClick={() => setSetOriginMode(false)}
                className="ml-auto flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-lg px-2.5 py-1 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
          {/* Botão flutuante Ver lista */}
          {origin && !setOriginMode && (
            <div className="absolute bottom-5 left-0 right-0 flex justify-center items-center gap-3 z-10 pointer-events-none">
              {!loading && totalCount > 0 && (
                <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-md pointer-events-auto">
                  {totalCount} rolê{totalCount !== 1 ? 's' : ''}
                </div>
              )}
              <button
                onClick={() => setView('list')}
                className="bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg pointer-events-auto"
              >
                Ver lista →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Lista (só aparece após selecionar origem) ── */}
      {origin && view === 'list' && (
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
          {!loading && totalCount > 0 && (
            <div>
              <p className="text-sm text-gray-500">
                <span className="font-bold text-gray-800">{totalCount}</span> rolê{totalCount !== 1 ? 's' : ''} em até {radius} km de <span className="text-orange-500 font-semibold">{origin.label}</span>
              </p>
              {sortedGoogle.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Lugares da comunidade aparecem todos. Os do Google são limitados aos mais relevantes.
                </p>
              )}
            </div>
          )}

          {/* Skeletons */}
          {loading && Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}

          {/* Comunidade */}
          {!loading && sortedCommunity.length > 0 && category !== 'eventos' && (
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
          {!loading && sortedGoogle.length > 0 && category !== 'eventos' && !communityOnly && (
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

          {/* Empty state — sem lugares no raio */}
          {!loading && totalCount === 0 && category !== 'eventos' && (
            <div className="flex flex-col items-center text-center gap-3 py-10 px-4">
              <span className="text-5xl">🔍</span>
              <div>
                <p className="font-bold text-gray-800 text-base">Nenhum lugar encontrado</p>
                <p className="text-sm text-gray-400 mt-1">
                  Não achamos{category ? ` ${SUB_LABELS[category]?.toLowerCase().replace(/^\S+ /, '')}` : ' nada'} em até {radius} km de <span className="font-semibold text-gray-600">{origin?.label.split(',')[0]}</span>.
                </p>
              </div>
              {RADII.filter((r) => r > radius).length > 0 && (
                <div className="flex flex-col gap-2 w-full max-w-xs mt-1">
                  <p className="text-xs text-gray-400">Tentar com raio maior:</p>
                  <div className="flex gap-2 justify-center">
                    {RADII.filter((r) => r > radius).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRadius(r)}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                      >
                        {r} km
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Lugares da comunidade aparecem todos — a limitação é só do Google Places.
                  </p>
                </div>
              )}
              <Link
                href="/sugerir"
                className="mt-2 text-xs text-orange-500 font-semibold underline underline-offset-2"
              >
                Conhece um lugar aqui? Sugira! →
              </Link>
            </div>
          )}

          {/* CTA Eventos */}
          {!loading && category === 'eventos' && (
            <div className="rounded-2xl overflow-hidden border border-purple-100" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #fdf4ff 100%)' }}>
              <div className="px-5 py-6 flex flex-col items-center text-center gap-3">
                <span className="text-4xl">🎭</span>
                <div>
                  <p className="font-bold text-gray-900 text-base">
                    {cityEvents.length === 0 ? `Nenhum evento em ${origin?.label.split(',')[0]}` : 'Tem um evento para divulgar?'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Anuncie seu show, feira ou festival e alcance quem está explorando a região.</p>
                </div>
                <a
                  href="/perfil"
                  className="mt-1 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 100%)' }}
                >
                  📣 Divulgar meu evento
                </a>
              </div>
            </div>
          )}

        </div>
      )}


    </div>
  )
}
