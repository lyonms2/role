'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useRoteiro, type EatSnap, type StaySnap, type EventSnap } from '@/lib/roteiro-context'
import type { RoleEvent } from '@/types'
import { useAuth } from '@/lib/auth-context'
import { getApprovedEats, getApprovedStays, getApprovedEvents, saveRoteiro, updateRoteiroItems } from '@/lib/firestore'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'
import PlaceDetailModal from '@/components/PlaceDetailModal'
import Pagination from '@/components/Pagination'
import ListItemSkeleton from '@/components/ListItemSkeleton'
import { haversineDistance } from '@/lib/geolocation'

type Tab = 'evento' | 'comer' | 'dormir'

type EatRow   = { id: string; name: string; city: string; category: string; priceRange: string; priceLevel?: string; rating?: number; reviewCount?: number; googlePlaceId?: string; address?: string; lat?: number; lng?: number; photoUrl?: string }
type StayRow  = { id: string; name: string; city: string; category: string; priceFrom?: number | null; priceLevel?: string; bookingUrl?: string | null; rating?: number; reviewCount?: number; googlePlaceId?: string; address?: string; lat?: number; lng?: number; photoUrl?: string }

type SortKey = 'rating' | 'distance' | 'price'

// ── Sub-componentes ──────────────────────────────────────────

function AddBtn({ added, onToggle }: { added: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
        added
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-orange-500 text-white hover:bg-orange-600'
      }`}
    >
      {added ? '✓ Adicionado' : '+ Adicionar'}
    </button>
  )
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount?: number }) {
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <span className="text-yellow-400 text-xs">★</span>
      <span className="text-xs text-gray-600 font-medium">{rating.toFixed(1)}</span>
      {reviewCount !== undefined && (
        <span className="text-xs text-gray-400">({reviewCount.toLocaleString('pt-BR')})</span>
      )}
    </div>
  )
}

function EventItem({ event, added, onToggle }: { event: RoleEvent; added: boolean; onToggle: () => void }) {
  let dateStr = ''
  try {
    const d = (event.date as any)?.toDate ? (event.date as any).toDate() : new Date((event.date as any)?.seconds * 1000)
    dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
  } catch {}
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">🎭</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{event.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{event.venue || event.city}{dateStr ? ` · ${dateStr}` : ''}</p>
        {event.price && <p className="text-xs text-gray-400 mt-0.5">💲 {event.price}</p>}
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

function EatItem({ eat, added, onToggle, onDetail }: { eat: EatRow; added: boolean; onToggle: () => void; onDetail?: () => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">🍽️</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{eat.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{eat.category} · {eat.priceRange}</p>
        {eat.rating && <StarRating rating={eat.rating} reviewCount={eat.reviewCount} />}
        {eat.address && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {eat.address}</p>
        )}
        {eat.googlePlaceId && onDetail && (
          <button onClick={onDetail} className="text-xs text-orange-500 font-medium mt-0.5">Ver detalhes →</button>
        )}
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

function StayItem({ stay, added, onToggle, onDetail }: { stay: StayRow; added: boolean; onToggle: () => void; onDetail?: () => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0 mt-0.5">🏡</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{stay.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {stay.category}{stay.priceFrom ? ` · a partir de R$${stay.priceFrom}/noite` : ''}
        </p>
        {stay.rating && <StarRating rating={stay.rating} reviewCount={stay.reviewCount} />}
        {stay.address && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {stay.address}</p>
        )}
        {stay.googlePlaceId && onDetail && (
          <button onClick={onDetail} className="text-xs text-orange-500 font-medium mt-0.5">Ver detalhes →</button>
        )}
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

const PRICE_ORDER: Record<string, number> = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
}

function sortItems<T extends { rating?: number; lat?: number; lng?: number; priceLevel?: string; priceFrom?: number | null }>(
  items: T[], sort: SortKey, originLat: number, originLng: number
): T[] {
  return [...items].sort((a, b) => {
    if (sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0)
    if (sort === 'distance') {
      const da = a.lat != null && a.lng != null ? haversineDistance(originLat, originLng, a.lat, a.lng) : 9999
      const db = b.lat != null && b.lng != null ? haversineDistance(originLat, originLng, b.lat, b.lng) : 9999
      return da - db
    }
    if (sort === 'price') {
      const pa = a.priceFrom != null ? a.priceFrom : (PRICE_ORDER[a.priceLevel || ''] ?? 2) * 100
      const pb = b.priceFrom != null ? b.priceFrom : (PRICE_ORDER[b.priceLevel || ''] ?? 2) * 100
      return pa - pb
    }
    return 0
  })
}

function SortBar({ sort, onSort, showPrice }: { sort: SortKey; onSort: (s: SortKey) => void; showPrice: boolean }) {
  const opts: { key: SortKey; label: string }[] = [
    { key: 'rating', label: '⭐ Melhor avaliado' },
    { key: 'distance', label: '📍 Mais perto' },
    ...(showPrice ? [{ key: 'price' as SortKey, label: '💲 Mais barato' }] : []),
  ]
  return (
    <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
      {opts.map((o) => (
        <button
          key={o.key}
          onClick={() => onSort(o.key)}
          className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            sort === o.key
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-500 border-gray-200 hover:border-orange-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionLabel({ source }: { source: 'firestore' | 'google' }) {
  if (source !== 'google') return null
  return (
    <p className="text-xs text-gray-400 mb-2 text-center">
      📍 Sugestões do Google para a região
    </p>
  )
}

function EmptyTab({ city, type, href }: { city: string; type: string; href: string }) {
  return (
    <div className="text-center py-10">
      <div className="text-4xl mb-3">🔍</div>
      <p className="text-gray-600 font-semibold">Sem {type} em {city} ainda</p>
      <p className="text-gray-400 text-sm mt-1 mb-4">Seja o primeiro a sugerir!</p>
      <Link href={href} className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
        + Sugerir {type}
      </Link>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

function RoteiroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const updateId = searchParams.get('update')
  const { user } = useAuth()
  const { destination, events, eats, stays, toggleEvent, toggleEat, toggleStay, hasEvent, hasEat, hasStay, clearRoteiro, itemCount } = useRoteiro()

  const [tab, setTab] = useState<Tab>('evento')
  const [allEvents, setAllEvents] = useState<RoleEvent[]>([])
  const [allEats, setAllEats] = useState<EatRow[]>([])
  const [allStays, setAllStays] = useState<StayRow[]>([])
  const [eventsPage, setEventsPage] = useState(0)
  const [eatsSource, setEatsSource] = useState<'firestore' | 'google'>('firestore')
  const [staysSource, setStaysSource] = useState<'firestore' | 'google'>('firestore')
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  const [roteiroName, setRoteiroName] = useState('')
  const [showLogin, setShowLogin] = useState(false)
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null)
  const [sort, setSort] = useState<SortKey>('rating')
  const [eatsPage, setEatsPage] = useState(0)
  const [staysPage, setStaysPage] = useState(0)

  useEffect(() => {
    if (!destination) { setLoadingData(false); return }
    if (destination.source === 'event') setTab('comer')
    setRoteiroName(`Rolê em ${destination.city}`)
    setLoadingData(true)

    async function load() {
      const city = destination!.city
      const lat = destination!.lat
      const lng = destination!.lng

      const [fsEats, fsStays, fsEvents] = await Promise.all([
        getApprovedEats(city),
        getApprovedStays(city),
        getApprovedEvents(city),
      ])
      setAllEvents(fsEvents)

      if (fsEats.length > 0) {
        setAllEats(fsEats.map((e) => ({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange, rating: e.averageRating || undefined, reviewCount: e.reviewCount || undefined })))
        setEatsSource('firestore')
      } else {
        const r = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=eats`).then((res) => res.json()).catch(() => ({ results: [] }))
        setAllEats((r.results || []).map((e: any) => ({ ...e, city })))
        setEatsSource('google')
      }

      if (fsStays.length > 0) {
        setAllStays(fsStays.map((s) => ({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom, bookingUrl: s.bookingUrl, rating: s.averageRating || undefined, reviewCount: s.reviewCount || undefined })))
        setStaysSource('firestore')
      } else {
        const r = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=stays`).then((res) => res.json()).catch(() => ({ results: [] }))
        setAllStays((r.results || []).map((s: any) => ({ ...s, city })))
        setStaysSource('google')
      }

      setLoadingData(false)
    }

    load()
  }, [destination?.id])

  async function handleSave() {
    if (!user) { setShowLogin(true); return }
    if (!destination) return
    setSaving(true)
    setSaveError(false)
    try {
      const name = roteiroName || `Rolê em ${destination.city}`
      if (updateId) {
        await updateRoteiroItems(updateId, { name, destination, events, eats, stays })
      } else {
        await saveRoteiro({ userId: user.uid, name, destination, events, eats, stays })
      }
      setSaved(true)
      setTimeout(() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }, 1800)
    } catch (err) {
      console.error('[saveRoteiro]', err)
      setSaving(false)
      setSaveError(true)
    }
  }

  if (!destination) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🗺️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Seu roteiro está vazio</h1>
        <p className="text-gray-500 mb-6">Escolha um destino primeiro para montar seu roteiro.</p>
        <Link href="/" className="btn-primary inline-block">Descobrir destinos →</Link>
      </div>
    )
  }

  const backHref = destination.source === 'event'
    ? `/evento/${destination.id}`
    : destination.source === 'external' && destination.googlePlaceId
    ? `/destino/google/${destination.googlePlaceId}`
    : `/destino/${destination.id}`

  const fromEvent = destination.source === 'event'

  const TABS = [
    ...(!fromEvent ? [{ id: 'evento' as Tab, icon: '🎭', label: 'Eventos', count: events.length }] : []),
    { id: 'comer'  as Tab, icon: '🍽️', label: 'Comer',   count: eats.length },
    { id: 'dormir' as Tab, icon: '🏡', label: 'Dormir',  count: stays.length },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-40">

      {detailPlaceId && (
        <PlaceDetailModal placeId={detailPlaceId} onClose={() => setDetailPlaceId(null)} />
      )}

      {/* ── Hero do destino ── */}
      <div className="relative h-52 bg-gray-100">
        {destination.photoUrl ? (
          <Image src={destination.photoUrl} alt={destination.name} fill className="object-cover"
            sizes="100vw" unoptimized={destination.photoUrl.startsWith('/api/photo')} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-6xl">🗺️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
        {updateId ? (
          <button
            onClick={() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }}
            className="absolute top-4 left-4 bg-white/90 rounded-full px-3 h-9 flex items-center gap-1.5 text-gray-700 text-xs font-bold shadow hover:bg-gray-100 transition-colors"
          >
            ← Cancelar
          </button>
        ) : (
          <>
            <Link href={backHref} className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">←</Link>
            <button
              onClick={() => { clearRoteiro(); router.push('/') }}
              className="absolute top-4 right-4 bg-white/90 rounded-full px-3 h-9 flex items-center gap-1.5 text-red-500 text-xs font-bold shadow hover:bg-red-50 transition-colors"
            >
              🗑️ Desistir
            </button>
          </>
        )}
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white/70 text-xs mb-0.5">📍 Destino selecionado</p>
          <h1 className="text-white text-xl font-bold leading-tight">{destination.name}</h1>
          <p className="text-white/80 text-sm">{destination.city}, {destination.state}</p>
        </div>
      </div>

      {/* ── Nome editável ── */}
      <div className="px-4 pt-5 pb-1">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Nome do roteiro</label>
        <input
          type="text"
          value={roteiroName}
          onChange={(e) => setRoteiroName(e.target.value)}
          className="w-full text-xl font-bold text-gray-900 border-0 border-b-2 border-orange-200 focus:border-orange-500 focus:outline-none py-1 bg-transparent mt-1"
          placeholder="Ex: Finde em Floripa 🌊"
        />
      </div>


      {/* ── Tabs ── */}
      <div className="flex px-4 gap-2 py-4">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
              tab === t.id ? 'bg-orange-500 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
            {t.count > 0 && (
              <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold ${tab === t.id ? 'bg-white/25 text-white' : 'bg-orange-500 text-white'}`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Conteúdo da tab ── */}
      <div className="px-4">
        {loadingData ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => <ListItemSkeleton key={i} />)}
          </div>
        ) : tab === 'evento' ? (
          <>
            {/* Eventos já adicionados de outras cidades */}
            {events.filter((ev) => !allEvents.some((ae) => ae.id === ev.id)).map((ev) => {
              let dateStr = ''
              try {
                const d = (ev.date as any)?.toDate ? (ev.date as any).toDate() : new Date((ev.date as any)?.seconds * 1000)
                dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
              } catch {}
              return (
                <div key={ev.id} className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 mb-2">
                  <span className="text-xl flex-shrink-0">🎭</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{ev.name}</p>
                    <p className="text-xs text-gray-500">{ev.city}{dateStr ? ` · ${dateStr}` : ''}</p>
                  </div>
                  <button onClick={() => toggleEvent(ev)} className="flex-shrink-0 text-xs font-bold text-green-700 bg-green-100 border border-green-200 px-2 py-1 rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors">✓ Adicionado</button>
                </div>
              )
            })}
            {/* Eventos da cidade */}
            {allEvents.length === 0
              ? events.filter((ev) => !allEvents.some((ae) => ae.id === ev.id)).length === 0
                ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-3">🎭</div>
                    <p className="text-gray-600 font-semibold">Sem eventos em {destination.city} ainda</p>
                    <p className="text-gray-400 text-sm mt-1">Confira a agenda completa em Shows & Eventos</p>
                    <a
                      href="/anunciar?tipo=evento"
                      className="inline-block mt-4 bg-purple-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl hover:bg-purple-700 transition-colors"
                    >
                      📣 Anunciar um evento aqui
                    </a>
                  </div>
                )
                : <p className="text-center text-xs text-gray-400 mt-2 py-4">Sem outros eventos em {destination.city}</p>
              : <div className="flex flex-col gap-2 stagger">
                  {allEvents.slice(eventsPage * 5, (eventsPage + 1) * 5).map((ev) => (
                    <EventItem
                      key={ev.id}
                      event={ev}
                      added={hasEvent(ev.id)}
                      onToggle={() => toggleEvent({ id: ev.id, name: ev.name, city: ev.city, venue: ev.venue || '', date: ev.date, category: ev.category, photoUrl: ev.photoUrl, mapsLink: ev.mapsLink })}
                    />
                  ))}
                  <Pagination page={eventsPage} totalPages={Math.ceil(allEvents.length / 5)} onPrev={() => setEventsPage((p) => p - 1)} onNext={() => setEventsPage((p) => p + 1)} />
                </div>
            }
          </>
        ) : tab === 'comer' ? (
          allEats.length === 0
            ? <EmptyTab city={destination.city} type="restaurantes" href="/comer/sugerir" />
            : <>
                <SectionLabel source={eatsSource} />
                <SortBar sort={sort} onSort={(s) => { setSort(s); setEatsPage(0); setStaysPage(0) }} showPrice />
                <div className="flex flex-col gap-2 stagger">
                  {sortItems(allEats, sort, destination.lat, destination.lng).slice(eatsPage * 5, (eatsPage + 1) * 5).map((e) => (
                    <EatItem key={e.id} eat={e} added={hasEat(e.id)}
                      onToggle={() => toggleEat({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange, googlePlaceId: e.googlePlaceId, address: e.address, photoUrl: e.photoUrl, lat: e.lat, lng: e.lng })}
                      onDetail={e.googlePlaceId ? () => setDetailPlaceId(e.googlePlaceId!) : undefined} />
                  ))}
                  <Pagination page={eatsPage} totalPages={Math.ceil(allEats.length / 5)} onPrev={() => setEatsPage((p) => p - 1)} onNext={() => setEatsPage((p) => p + 1)} />
                </div>
              </>
        ) : (
          allStays.length === 0
            ? <EmptyTab city={destination.city} type="hospedagens" href="/hospedar/sugerir" />
            : <>
                <SectionLabel source={staysSource} />
                <SortBar sort={sort} onSort={(s) => { setSort(s); setEatsPage(0); setStaysPage(0) }} showPrice />
                <div className="flex flex-col gap-2 stagger">
                  {sortItems(allStays, sort, destination.lat, destination.lng).slice(staysPage * 5, (staysPage + 1) * 5).map((s) => (
                    <StayItem key={s.id} stay={s} added={hasStay(s.id)}
                      onToggle={() => toggleStay({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom ?? undefined, bookingUrl: s.bookingUrl ?? undefined, googlePlaceId: s.googlePlaceId, address: s.address, photoUrl: s.photoUrl, lat: s.lat, lng: s.lng })}
                      onDetail={s.googlePlaceId ? () => setDetailPlaceId(s.googlePlaceId!) : undefined} />
                  ))}
                  <Pagination page={staysPage} totalPages={Math.ceil(allStays.length / 5)} onPrev={() => setStaysPage((p) => p - 1)} onNext={() => setStaysPage((p) => p + 1)} />
                </div>
              </>
        )}
      </div>

      {/* ── Alugar Veículo ── */}
      {destination && (
        <div className="px-4 pb-4">
          <a
            href={`https://www.rentcars.com/pt-br/?${new URLSearchParams(process.env.NEXT_PUBLIC_RENTCARS_AFFILIATE_ID ? { partner: process.env.NEXT_PUBLIC_RENTCARS_AFFILIATE_ID, pickup_name: destination.city } : { pickup_name: destination.city })}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl overflow-hidden border border-blue-100 hover:shadow-md transition-shadow"
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-white font-extrabold text-base tracking-tight">rentcars</p>
                <p className="text-blue-200 text-xs">Compare e economize no aluguel</p>
              </div>
              <span className="bg-white/20 text-white text-xs font-semibold px-3 py-1.5 rounded-full">🚗 Ver opções →</span>
            </div>
            <div className="bg-white px-4 py-2">
              <p className="text-xs text-gray-500">Retire em <span className="font-semibold text-gray-700">{destination.city}</span> e chegue no rolê do seu jeito</p>
            </div>
          </a>
        </div>
      )}

      {/* ── Modal de login ── */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl w-full max-w-2xl p-6 text-center">
            <div className="text-4xl mb-3">🗓️</div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Salvar roteiro</h3>
            <p className="text-gray-500 text-sm mb-5">Entre com Google para salvar e acessar de qualquer dispositivo.</p>
            <button
              onClick={async () => {
                try { await signInWithPopup(auth, googleProvider) } catch {}
                setShowLogin(false)
              }}
              className="w-full btn-primary mb-3"
            >
              Entrar com Google
            </button>
            <button onClick={() => setShowLogin(false)} className="text-sm text-gray-400">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Barra flutuante ── */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 pb-2 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl p-4 flex items-center gap-3">
            <div className="flex-1 flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
              {events.length > 0 && <span className="text-gray-600">🎭 {events.length} evento{events.length !== 1 ? 's' : ''}</span>}
              {eats.length > 0 && <span className="text-gray-600">🍽️ {eats.length} lugar{eats.length !== 1 ? 'es' : ''}</span>}
              {stays.length > 0 && <span className="text-gray-600">🏡 {stays.length} hospedagem{stays.length !== 1 ? 's' : ''}</span>}
              {itemCount === 0 && <span className="text-gray-400 text-xs">Adicione itens ou salve só o destino</span>}
            </div>
            <div className="flex flex-col items-end gap-1">
              {saveError && (
                <p className="text-xs text-red-500 font-medium">Erro ao salvar. Tente novamente.</p>
              )}
              <button
                onClick={handleSave}
                disabled={saving || saved}
                className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all flex-shrink-0 ${
                  saved ? 'bg-green-500' : saving ? 'bg-orange-300 cursor-not-allowed' : saveError ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {saved ? '✅ Atualizado!' : saving ? 'Salvando...' : saveError ? '↺ Tentar novamente' : updateId ? '✅ Atualizar roteiro' : '🗓️ Salvar'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function RoteiroPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-4 py-16 text-center"><div className="skeleton h-52 w-full rounded-none mb-4" /><div className="skeleton h-8 w-48 mx-auto" /></div>}>
      <RoteiroContent />
    </Suspense>
  )
}
