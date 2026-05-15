'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { auth } from '@/lib/firebase'
import { signOut } from 'firebase/auth'
import { getReviewsByUser, getTipsByUser, getRoteirosByUser, deleteRoteiro, updateRoteiroDate, type SavedRoteiro } from '@/lib/firestore'
import { useAuth } from '@/lib/auth-context'
import type { Review, Tip } from '@/types'

// ── Calendário helpers ────────────────────────────────────────

const ROTEIRO_COLORS = ['#FF6B35', '#3b82f6', '#16a34a', '#9333ea', '#ec4899', '#f59e0b']

function toDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function formatDateStr(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function getCalendarCells(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay()
  const total = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= total; d++) cells.push(d)
  return cells
}

const TODAY = new Date().toISOString().slice(0, 10)
const DAY_HEADERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function PerfilPage() {
  const { user, loading } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [tips, setTips] = useState<Tip[]>([])
  const [roteiros, setRoteiros] = useState<SavedRoteiro[]>([])
  const [tab, setTab] = useState<'reviews' | 'tips' | 'roteiros'>('reviews')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [calMonth, setCalMonth] = useState(() => new Date())

  useEffect(() => {
    if (!user) { setReviews([]); setTips([]); return }
    Promise.all([
      getReviewsByUser(user.uid),
      getTipsByUser(user.uid),
      getRoteirosByUser(user.uid),
    ]).then(([revs, tps, rots]) => {
      setReviews(revs)
      setTips(tps)
      setRoteiros(rots)
    })
  }, [user])

  async function handleLogout() {
    await signOut(auth)
    setReviews([])
    setTips([])
  }

  async function handleDayTap(dateStr: string) {
    if (!selectedId) return
    const roteiro = roteiros.find((r) => r.id === selectedId)
    if (!roteiro) return
    if (roteiro.scheduledDate === dateStr) {
      await updateRoteiroDate(selectedId, null)
      setRoteiros((prev) => prev.map((r) => r.id === selectedId ? { ...r, scheduledDate: undefined } : r))
    } else {
      await updateRoteiroDate(selectedId, dateStr)
      setRoteiros((prev) => prev.map((r) => r.id === selectedId ? { ...r, scheduledDate: dateStr } : r))
    }
    setSelectedId(null)
  }

  async function handleDeleteRoteiro(id: string) {
    await deleteRoteiro(id)
    setRoteiros((prev) => prev.filter((r) => r.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  if (loading || !user) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <div className="skeleton h-20 w-20 rounded-full mx-auto mb-4" />
        <div className="skeleton h-6 w-40 mx-auto mb-2" />
        <div className="skeleton h-4 w-32 mx-auto" />
      </div>
    )
  }

  const verifiedCount = reviews.filter((r) => r.verified).length
  const isExplorer = verifiedCount >= 5

  return (
    <div className="max-w-md mx-auto px-4 py-6">
      {/* Cabeçalho do perfil */}
      <div className="card p-5 flex items-center gap-4 mb-5">
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.displayName || ''} width={60} height={60} className="rounded-full" />
        ) : (
          <div className="w-15 h-15 rounded-full bg-orange-100 flex items-center justify-center text-2xl">👤</div>
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 truncate">{user.displayName}</h2>
          <p className="text-sm text-gray-500 truncate">{user.email}</p>
          {isExplorer && (
            <span className="inline-flex items-center gap-1 mt-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
              🏅 Explorador verificado
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-500">Sair</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Rolês', value: reviews.length },
          { label: 'Verificadas', value: verifiedCount },
          { label: 'Dicas', value: tips.length },
        ].map((s) => (
          <div key={s.label} className="card p-3 text-center">
            <div className="text-2xl font-bold" style={{ color: '#FF6B35' }}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {reviews.length > 0 && (
        <p className="text-center text-sm text-gray-500 mb-4 font-medium">
          Você já deu <span style={{ color: '#FF6B35' }} className="font-bold">{reviews.length} rolê{reviews.length !== 1 ? 's' : ''}</span>! 🗺️
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-4 border border-gray-200 rounded-xl overflow-hidden">
        {([
          { id: 'roteiros', icon: '🗓️', label: 'Roteiros', count: roteiros.length },
          { id: 'reviews', icon: '⭐', label: 'Reviews', count: reviews.length },
          { id: 'tips', icon: '💡', label: 'Dicas', count: tips.length },
        ] as const).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {t.icon} {t.label} ({t.count})
          </button>
        ))}
      </div>

      {tab === 'roteiros' && (
        roteiros.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">🗓️</div>
            <p className="font-semibold text-gray-700">Nenhum roteiro salvo ainda</p>
            <p className="text-sm text-gray-400 mt-1 mb-4">Escolha um destino e monte seu primeiro rolê completo!</p>
            <a href="/" className="text-sm font-semibold text-orange-500 border border-orange-300 px-4 py-2 rounded-xl">
              Descobrir destinos →
            </a>
          </div>
        ) : (
          <div>
            {/* Instrução quando roteiro selecionado */}
            <div className={`mb-3 text-center text-xs font-semibold rounded-xl py-2 px-3 transition-all ${
              selectedId ? 'bg-orange-50 text-orange-500' : 'bg-gray-50 text-gray-400'
            }`}>
              {selectedId
                ? '📅 Toque uma data no calendário para agendar'
                : 'Selecione um roteiro para agendar no calendário'}
            </div>

            <div className="flex gap-3">

              {/* ── Lista de roteiros ── */}
              <div className="w-[130px] flex-shrink-0 flex flex-col gap-2">
                {roteiros.map((r, i) => {
                  const color = ROTEIRO_COLORS[i % ROTEIRO_COLORS.length]
                  const isSelected = selectedId === r.id
                  return (
                    <div key={r.id} className="relative">
                      <button
                        onClick={() => setSelectedId(isSelected ? null : r.id)}
                        className={`w-full text-left p-2.5 rounded-xl border-2 transition-all ${
                          isSelected ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-gray-100 bg-white'
                        }`}
                      >
                        <div className="flex items-start gap-1.5 mb-1">
                          <span className="mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <p className="text-xs font-bold text-gray-900 leading-tight line-clamp-2">{r.name}</p>
                        </div>
                        <p className="text-xs text-gray-400 truncate pl-4">{r.destination.city}</p>
                        {r.scheduledDate && (
                          <p className="text-xs font-semibold mt-1 pl-4" style={{ color }}>
                            📅 {formatDateStr(r.scheduledDate)}
                          </p>
                        )}
                        {r.eats.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5 pl-4">🍽️ {r.eats.length} · 🏡 {r.stays.length}</p>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteRoteiro(r.id)}
                        className="absolute top-1.5 right-1.5 text-gray-200 hover:text-red-400 text-xs transition-colors"
                      >
                        🗑️
                      </button>
                    </div>
                  )
                })}
              </div>

              {/* ── Calendário ── */}
              <div className="flex-1 min-w-0">
                {/* Navegação do mês */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base"
                  >
                    ‹
                  </button>
                  <p className="text-xs font-bold text-gray-700 capitalize">
                    {calMonth.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </p>
                  <button
                    onClick={() => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-bold text-base"
                  >
                    ›
                  </button>
                </div>

                {/* Cabeçalho dias */}
                <div className="grid grid-cols-7 mb-0.5">
                  {DAY_HEADERS.map((d, i) => (
                    <div key={i} className="text-center text-[10px] text-gray-400 font-semibold py-0.5">{d}</div>
                  ))}
                </div>

                {/* Células */}
                <div className="grid grid-cols-7 gap-0.5">
                  {getCalendarCells(calMonth.getFullYear(), calMonth.getMonth()).map((day, i) => {
                    if (!day) return <div key={i} />
                    const dateStr = toDateStr(calMonth.getFullYear(), calMonth.getMonth(), day)
                    const assignedIdx = roteiros.findIndex((r) => r.scheduledDate === dateStr)
                    const color = assignedIdx >= 0 ? ROTEIRO_COLORS[assignedIdx % ROTEIRO_COLORS.length] : null
                    const isToday = dateStr === TODAY
                    const isClickable = !!selectedId

                    return (
                      <button
                        key={i}
                        onClick={() => handleDayTap(dateStr)}
                        disabled={!isClickable && !color}
                        className={`aspect-square flex items-center justify-center rounded-lg text-[11px] font-medium transition-all ${
                          isToday && !color ? 'ring-1 ring-orange-400 text-orange-500 font-bold' : ''
                        } ${
                          color ? 'text-white' : isClickable ? 'text-gray-700 hover:bg-orange-100 cursor-pointer' : 'text-gray-500'
                        }`}
                        style={color ? { background: color } : {}}
                      >
                        {day}
                      </button>
                    )
                  })}
                </div>

                {/* Legenda */}
                {roteiros.some((r) => r.scheduledDate) && (
                  <div className="mt-3 flex flex-col gap-1">
                    {roteiros.filter((r) => r.scheduledDate).map((r, i) => (
                      <div key={r.id} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ROTEIRO_COLORS[roteiros.indexOf(r) % ROTEIRO_COLORS.length] }} />
                        <span className="text-[10px] text-gray-500 truncate">{r.name} — {formatDateStr(r.scheduledDate!)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )
      )}

      {tab === 'reviews' && (
        <div className="flex flex-col gap-3">
          {reviews.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhum rolê avaliado ainda. Que tal explorar? 🗺️</p>
          ) : reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map((i) => (
                    <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                {r.verified && <span className="text-xs text-green-600 font-semibold">✅ Verificado</span>}
              </div>
              {r.text && <p className="text-sm text-gray-700 mt-1">{r.text}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 'tips' && (
        <div className="flex flex-col gap-3">
          {tips.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-6">Nenhuma dica ainda. A galera tá esperando a sua! 💡</p>
          ) : tips.map((t) => (
            <div key={t.id} className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-sm text-gray-800">💡 {t.text}</p>
              <p className="text-xs text-gray-400 mt-1">❤️ {t.likes} curtidas</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
