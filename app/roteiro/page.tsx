'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useRoteiro, type EventSnap, type EatSnap, type StaySnap } from '@/lib/roteiro-context'
import { useAuth } from '@/lib/auth-context'
import { getApprovedEvents, getApprovedEats, getApprovedStays, saveRoteiro } from '@/lib/firestore'
import { auth, googleProvider } from '@/lib/firebase'
import { signInWithPopup } from 'firebase/auth'

type Tab = 'eventos' | 'comer' | 'dormir'

// Tipos locais mais flexíveis (Firestore + Google)
type EventRow = { id: string; name: string; city: string; venue: string; date: any; category: string }
type EatRow   = { id: string; name: string; city: string; category: string; priceRange: string }
type StayRow  = { id: string; name: string; city: string; category: string; priceFrom?: number | null; bookingUrl?: string | null }

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

function EventItem({ event, added, onToggle }: { event: EventRow; added: boolean; onToggle: () => void }) {
  const date = event.date?.toDate?.() ?? null
  const dateStr = date
    ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    : null
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl flex-shrink-0">🎭</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{event.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {[dateStr, event.venue].filter(Boolean).join(' · ')}
        </p>
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

function EatItem({ eat, added, onToggle }: { eat: EatRow; added: boolean; onToggle: () => void }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl flex-shrink-0">🍽️</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{eat.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">{eat.category} · {eat.priceRange}</p>
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

function StayItem({ stay, added, onToggle }: { stay: StayRow; added: boolean; onToggle: () => void }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${added ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
      <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl flex-shrink-0">🏡</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{stay.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {stay.category}{stay.priceFrom ? ` · a partir de R$${stay.priceFrom}` : ''}
        </p>
      </div>
      <AddBtn added={added} onToggle={onToggle} />
    </div>
  )
}

function SectionLabel({ source }: { source: 'firestore' | 'google' }) {
  if (source === 'google') {
    return (
      <p className="text-xs text-gray-400 mb-2 text-center">
        📍 Sugestões do Google para a região — adicione ao seu roteiro
      </p>
    )
  }
  return null
}

// ── Página principal ─────────────────────────────────────────

export default function RoteiroPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { destination, events, eats, stays, toggleEvent, toggleEat, toggleStay, hasEvent, hasEat, hasStay, clearRoteiro, itemCount } = useRoteiro()

  const [tab, setTab] = useState<Tab>('eventos')
  const [allEvents, setAllEvents] = useState<EventRow[]>([])
  const [allEats, setAllEats] = useState<EatRow[]>([])
  const [allStays, setAllStays] = useState<StayRow[]>([])
  const [eventsSource, setEventsSource] = useState<'firestore' | 'google'>('firestore')
  const [eatsSource, setEatsSource] = useState<'firestore' | 'google'>('firestore')
  const [staysSource, setStaysSource] = useState<'firestore' | 'google'>('firestore')
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [roteiroName, setRoteiroName] = useState('')
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => {
    if (!destination) { setLoadingData(false); return }
    setRoteiroName(`Rolê em ${destination.city}`)
    setLoadingData(true)

    async function load() {
      const city = destination!.city
      const lat = destination!.lat
      const lng = destination!.lng

      const [fsEvents, fsEats, fsStays] = await Promise.all([
        getApprovedEvents(city),
        getApprovedEats(city),
        getApprovedStays(city),
      ])

      // Eventos
      if (fsEvents.length > 0) {
        setAllEvents(fsEvents.map((e) => ({ id: e.id, name: e.name, city: e.city, venue: e.venue, date: e.date, category: e.category })))
        setEventsSource('firestore')
      } else {
        const r = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=events`).then((res) => res.json()).catch(() => ({ results: [] }))
        setAllEvents((r.results || []).map((e: any) => ({ ...e, city })))
        setEventsSource('google')
      }

      // Comer
      if (fsEats.length > 0) {
        setAllEats(fsEats.map((e) => ({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange })))
        setEatsSource('firestore')
      } else {
        const r = await fetch(`/api/nearby?lat=${lat}&lng=${lng}&type=eats`).then((res) => res.json()).catch(() => ({ results: [] }))
        setAllEats((r.results || []).map((e: any) => ({ ...e, city })))
        setEatsSource('google')
      }

      // Dormir
      if (fsStays.length > 0) {
        setAllStays(fsStays.map((s) => ({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom, bookingUrl: s.bookingUrl })))
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
    try {
      await saveRoteiro({ userId: user.uid, name: roteiroName || `Rolê em ${destination.city}`, destination, events, eats, stays })
      setSaved(true)
      setTimeout(() => { clearRoteiro(); router.push('/perfil?tab=roteiros') }, 1800)
    } catch {
      setSaving(false)
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

  const backHref = destination.source === 'external' && destination.googlePlaceId
    ? `/destino/google/${destination.googlePlaceId}`
    : `/destino/${destination.id}`

  const TABS = [
    { id: 'eventos' as Tab, icon: '🎭', label: 'Eventos', count: events.length, total: allEvents.length },
    { id: 'comer' as Tab, icon: '🍽️', label: 'Comer', count: eats.length, total: allEats.length },
    { id: 'dormir' as Tab, icon: '🏡', label: 'Dormir', count: stays.length, total: allStays.length },
  ]

  return (
    <div className="max-w-2xl mx-auto pb-40">

      {/* ── Hero do destino ── */}
      <div className="relative h-52 bg-gray-100">
        {destination.photoUrl ? (
          <Image src={destination.photoUrl} alt={destination.name} fill className="object-cover"
            sizes="100vw" unoptimized={destination.photoUrl.startsWith('/api/photo')} />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-6xl">🗺️</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-black/10" />
        <Link href={backHref} className="absolute top-4 left-4 bg-white/90 rounded-full w-9 h-9 flex items-center justify-center text-gray-700 shadow">←</Link>
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
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
          </div>
        ) : tab === 'eventos' ? (
          allEvents.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-semibold">Sem eventos em {destination.city} ainda</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Seja o primeiro a sugerir!</p>
              <Link href="/eventos/sugerir" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">+ Sugerir evento</Link>
            </div>
          ) : (
            <>
              <SectionLabel source={eventsSource} />
              <div className="flex flex-col gap-2">
                {allEvents.map((e) => (
                  <EventItem key={e.id} event={e} added={hasEvent(e.id)}
                    onToggle={() => toggleEvent({ id: e.id, name: e.name, city: e.city, venue: e.venue, date: e.date, category: e.category })} />
                ))}
              </div>
            </>
          )
        ) : tab === 'comer' ? (
          allEats.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-semibold">Sem restaurantes em {destination.city} ainda</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Seja o primeiro a sugerir!</p>
              <Link href="/comer/sugerir" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">+ Sugerir restaurante</Link>
            </div>
          ) : (
            <>
              <SectionLabel source={eatsSource} />
              <div className="flex flex-col gap-2">
                {allEats.map((e) => (
                  <EatItem key={e.id} eat={e} added={hasEat(e.id)}
                    onToggle={() => toggleEat({ id: e.id, name: e.name, city: e.city, category: e.category, priceRange: e.priceRange })} />
                ))}
              </div>
            </>
          )
        ) : (
          allStays.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🔍</div>
              <p className="text-gray-600 font-semibold">Sem hospedagens em {destination.city} ainda</p>
              <p className="text-gray-400 text-sm mt-1 mb-4">Seja o primeiro a sugerir!</p>
              <Link href="/hospedar/sugerir" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">+ Sugerir hospedagem</Link>
            </div>
          ) : (
            <>
              <SectionLabel source={staysSource} />
              <div className="flex flex-col gap-2">
                {allStays.map((s) => (
                  <StayItem key={s.id} stay={s} added={hasStay(s.id)}
                    onToggle={() => toggleStay({ id: s.id, name: s.name, city: s.city, category: s.category, priceFrom: s.priceFrom ?? undefined, bookingUrl: s.bookingUrl ?? undefined })} />
                ))}
              </div>
            </>
          )
        )}
      </div>

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
              {itemCount === 0 && (
                <span className="text-gray-400 text-xs">Salvar só o destino ou adicione itens</span>
              )}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || saved}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all flex-shrink-0 ${
                saved ? 'bg-green-500' : saving ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600'
              }`}
            >
              {saved ? '✅ Salvo!' : saving ? 'Salvando...' : '🗓️ Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
