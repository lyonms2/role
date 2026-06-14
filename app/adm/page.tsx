'use client'

import { useEffect, useState } from 'react'
import Pagination from '@/components/Pagination'
import Lightbox from '@/components/Lightbox'
import { useAuth } from '@/lib/auth-context'
import {
  getReports, dismissReport, deleteReviewAndReport, type ReviewReport,
  getPendingSuggestions, approveSuggestion, rejectSuggestion,
  getAdvertiserRequests, approveAdvertiserRequest, rejectAdvertiserRequest, type AdvertiserRequest,
  getApprovedEvents, deleteEvent, deleteExpiredEvents,
  getApprovedEats, deleteEat,
  getApprovedStays, deleteStay,
  getRecentAdminReviews, adminDeleteReview, type AdminReview,
  getAdminSharedRoteiros, deleteSharedRoteiro, type SharedRoteiro,
  getAdminStats, type AdminStats,
  getAdminGrowthStats, type AdminGrowthStats,
  createRejectionNotification,
  addEvent,
} from '@/lib/firestore'
import { Timestamp } from 'firebase/firestore'
import type { ScrapedEvent } from '@/app/api/adm/scrape-eventos/route'
import type { ScrapedSymplaEvent } from '@/app/api/adm/scrape-sympla/route'
import { isEventExpired } from '@/lib/events'
import type { Suggestion, RoleEvent, Eat, Stay } from '@/types'
import { getOptimizedUrl } from '@/lib/cloudinary'
import YouTubeEmbed from '@/components/YouTubeEmbed'

const ADMIN_EMAIL = 'leonardomorenodasilva3@gmail.com'

export default function AdmPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<'sugestoes' | 'denuncias' | 'anuncios' | 'publicados' | 'numeros' | 'importar'>('anuncios')
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const [reports, setReports] = useState<ReviewReport[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [adRequests, setAdRequests] = useState<AdvertiserRequest[]>([])
  const [events, setEvents] = useState<RoleEvent[]>([])
  const [eats, setEats] = useState<Eat[]>([])
  const [stays, setStays] = useState<Stay[]>([])
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null)
  const [growthStats, setGrowthStats] = useState<AdminGrowthStats | null>(null)
  const [loadingGrowth, setLoadingGrowth] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [sugPage, setSugPage] = useState(0)
  const [repPage, setRepPage] = useState(0)
  const [adPage, setAdPage] = useState(0)
  const [contentSub, setContentSub] = useState<'eventos' | 'eats' | 'stays' | 'avaliacoes' | 'roteiros'>('eventos')
  const [contentPage, setContentPage] = useState(0)
  const [adminReviews, setAdminReviews] = useState<AdminReview[]>([])
  const [adminSharedRoteiros, setAdminSharedRoteiros] = useState<SharedRoteiro[]>([])
  const [loadingUserContent, setLoadingUserContent] = useState(false)
  const [userContentLoaded, setUserContentLoaded] = useState<Record<string, boolean>>({})
  const [rejectModal, setRejectModal] = useState<{
    itemName: string
    userId: string | null
    notifType: 'suggestion_rejected' | 'request_rejected'
    onConfirm: (reason: string) => Promise<void>
  } | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  // Import de eventos
  const [importEstado, setImportEstado] = useState('RS')
  const [importFonte, setImportFonte] = useState<'minhaentrada' | 'sympla'>('minhaentrada')
  const [cardCidades, setCardCidades] = useState<Record<string, string>>({})
  const [cardCategorias, setCardCategorias] = useState<Record<string, string>>({})
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')
  const [importEvents, setImportEvents] = useState<ScrapedEvent[]>([])
  const [importSymplaEvents, setImportSymplaEvents] = useState<ScrapedSymplaEvent[]>([])
  const [importFilter, setImportFilter] = useState('')
  const [publishingId, setPublishingId] = useState<string | null>(null)
  const [publishedUrls, setPublishedUrls] = useState<Set<string>>(new Set())
  const [manualAddr, setManualAddr] = useState<Record<string, string>>({})
  const [geocoding, setGeocoding] = useState<Record<string, boolean>>({})
  const [resolvedLoc, setResolvedLoc] = useState<Record<string, { lat: number; lng: number; mapsLink: string; formattedAddress: string } | null>>({})
  const [endDates, setEndDates] = useState<Record<string, string>>({})
  const [descriptions, setDescriptions] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    Promise.all([
      getReports(), getPendingSuggestions(), getAdvertiserRequests(),
      getApprovedEvents(), getApprovedEats(), getApprovedStays(),
      getAdminStats(),
    ])
      .then(([reps, sugs, ads, evs, ets, sts, stats]) => {
        setReports(reps); setSuggestions(sugs); setAdRequests(ads)
        setEvents(evs); setEats(ets); setStays(sts)
        setAdminStats(stats)
      })
      .finally(() => setFetching(false))
  }, [user])

  useEffect(() => {
    if (tab !== 'numeros' || growthStats || loadingGrowth) return
    setLoadingGrowth(true)
    getAdminGrowthStats().then(setGrowthStats).finally(() => setLoadingGrowth(false))
  }, [tab, growthStats, loadingGrowth])

  async function handleDismiss(r: ReviewReport) {
    setActing(r.id)
    await dismissReport(r.id)
    setReports((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  async function handleDeleteReview(r: ReviewReport) {
    setActing(r.id)
    await deleteReviewAndReport(r.id, r)
    setReports((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  async function handleDeleteEvent(ev: RoleEvent) {
    setActing(ev.id)
    await deleteEvent(ev.id, ev.photoUrl)
    setEvents((prev) => prev.filter((x) => x.id !== ev.id))
    setActing(null)
  }

  async function handleDeleteExpired() {
    setActing('__expired__')
    const count = await deleteExpiredEvents()
    if (count > 0) setEvents((prev) => prev.filter((ev) => !isEventExpired(ev)))
    setActing(null)
  }

  async function handleDeleteEat(eat: Eat) {
    setActing(eat.id)
    await deleteEat(eat.id, eat.photoUrl, (eat as any).photos)
    setEats((prev) => prev.filter((x) => x.id !== eat.id))
    setActing(null)
  }

  async function handleDeleteStay(stay: Stay) {
    setActing(stay.id)
    await deleteStay(stay.id, stay.photoUrl, (stay as any).photos)
    setStays((prev) => prev.filter((x) => x.id !== stay.id))
    setActing(null)
  }

  async function handleApprove(s: Suggestion) {
    setActing(s.id)
    await approveSuggestion(s)
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
    setActing(null)
  }

  async function handleReject(s: Suggestion) {
    setActing(s.id)
    await rejectSuggestion(s.id, (s as any).photos)
    setSuggestions((prev) => prev.filter((x) => x.id !== s.id))
    setActing(null)
  }

  function openRejectModal(
    itemName: string,
    userId: string | null,
    notifType: 'suggestion_rejected' | 'request_rejected',
    onConfirm: (reason: string) => Promise<void>
  ) {
    setRejectReason('')
    setRejectModal({ itemName, userId, notifType, onConfirm })
  }

  async function confirmReject() {
    if (!rejectModal) return
    setRejecting(true)
    try {
      await rejectModal.onConfirm(rejectReason)
      if (rejectModal.userId && rejectReason.trim()) {
        await createRejectionNotification(rejectModal.userId, rejectModal.notifType, rejectModal.itemName, rejectReason.trim())
      }
    } finally {
      setRejecting(false)
      setRejectModal(null)
    }
  }

  async function handleLoadUserContent(sub: 'avaliacoes' | 'roteiros') {
    if (userContentLoaded[sub]) return
    setLoadingUserContent(true)
    try {
      if (sub === 'avaliacoes') {
        const reviews = await getRecentAdminReviews()
        setAdminReviews(reviews)
      } else {
        const roteiros = await getAdminSharedRoteiros()
        setAdminSharedRoteiros(roteiros)
      }
      setUserContentLoaded((prev) => ({ ...prev, [sub]: true }))
    } finally {
      setLoadingUserContent(false)
    }
  }

  async function handleDeleteAdminReview(r: AdminReview) {
    setActing(r.id)
    await adminDeleteReview(r)
    setAdminReviews((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  async function handleDeleteAdminSharedRoteiro(r: SharedRoteiro) {
    setActing(r.id)
    await deleteSharedRoteiro(r.id)
    setAdminSharedRoteiros((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  const paidRequests = adRequests.filter(r => r.type === 'evento' || (r as any).plan !== 'free')
  const freeRequests = adRequests.filter(r => (r as any).plan === 'free' && r.type !== 'evento')

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">Carregando…</div>

  if (!user || user.email !== ADMIN_EMAIL) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <p className="font-bold text-gray-800">Acesso restrito</p>
        <p className="text-sm text-gray-400 mt-1">Você não tem permissão para acessar esta área.</p>
      </div>
    )
  }

  return (
    <>
    {lightbox && (
      <Lightbox
        photos={lightbox.photos}
        startIndex={lightbox.index}
        onClose={() => setLightbox(null)}
      />
    )}
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Painel Admin</h1>
          <p className="text-xs text-gray-400">LetsApp — moderação de conteúdo</p>
        </div>
      </div>

      {/* Abas — linha 1: ações pendentes */}
      <div className="flex gap-0 mb-1 border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setTab('anuncios')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 ${tab === 'anuncios' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          <span className="text-base leading-none">📣</span>
          <span>Anúncios{paidRequests.length > 0 ? ` (${paidRequests.length})` : ''}</span>
        </button>
        <button onClick={() => setTab('sugestoes')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 ${tab === 'sugestoes' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          <span className="text-base leading-none">📝</span>
          <span>Sugestões{(suggestions.length + freeRequests.length) > 0 ? ` (${suggestions.length + freeRequests.length})` : ''}</span>
        </button>
        <button onClick={() => setTab('denuncias')}
          className={`flex-1 py-2.5 text-xs font-semibold transition-colors flex flex-col items-center gap-0.5 ${tab === 'denuncias' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          <span className="text-base leading-none">🚩</span>
          <span>Denúncias{reports.length > 0 ? ` (${reports.length})` : ''}</span>
        </button>
      </div>
      {/* Abas — linha 2: navegação */}
      <div className="flex gap-0 mb-4 border border-gray-200 rounded-xl overflow-hidden">
        <button onClick={() => setTab('publicados')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'publicados' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          🗂️ Publicados
        </button>
        <button onClick={() => setTab('numeros')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'numeros' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          📊 Números
        </button>
        <button onClick={() => setTab('importar')}
          className={`flex-1 py-2 text-xs font-semibold transition-colors ${tab === 'importar' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          🔄 Importar
        </button>
      </div>

      {tab === 'numeros' ? (
        <div className="flex flex-col gap-5">
          {/* Pendências */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Aguardando ação</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => setTab('anuncios')} className="bg-blue-50 rounded-2xl p-4 text-center hover:bg-blue-100 transition-colors">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : paidRequests.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                  {fetching ? '–' : paidRequests.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Anúncios</p>
              </button>
              <button onClick={() => setTab('sugestoes')} className="bg-orange-50 rounded-2xl p-4 text-center hover:bg-orange-100 transition-colors">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : (suggestions.length + freeRequests.length) > 0 ? 'text-orange-500' : 'text-gray-400'}`}>
                  {fetching ? '–' : suggestions.length + freeRequests.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Sugestões</p>
              </button>
              <button onClick={() => setTab('denuncias')} className="bg-red-50 rounded-2xl p-4 text-center hover:bg-red-100 transition-colors">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : reports.length > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {fetching ? '–' : reports.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Denúncias</p>
              </button>
            </div>
          </section>

          {/* Conteúdo publicado */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Conteúdo publicado</p>
            <div className="grid grid-cols-3 gap-3">
              <button onClick={() => { setTab('publicados'); setContentSub('eventos') }} className="bg-purple-50 rounded-2xl p-4 text-center hover:bg-purple-100 transition-colors">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : 'text-purple-600'}`}>
                  {fetching ? '–' : events.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Eventos</p>
                {!fetching && (() => { const n = events.filter(isEventExpired).length; return n > 0 ? <p className="text-[10px] text-amber-500 mt-0.5">{n} expirado{n !== 1 ? 's' : ''}</p> : null })()}
              </button>
              <button onClick={() => { setTab('publicados'); setContentSub('eats') }} className="bg-orange-50 rounded-2xl p-4 text-center hover:bg-orange-100 transition-colors">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : 'text-orange-500'}`}>
                  {fetching ? '–' : eats.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Restaurantes</p>
              </button>
              <button onClick={() => { setTab('publicados'); setContentSub('stays') }} className="bg-green-50 rounded-2xl p-4 text-center hover:bg-green-100 transition-colors">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : 'text-green-600'}`}>
                  {fetching ? '–' : stays.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Hospedagens</p>
              </button>
            </div>
          </section>

          {/* Comunidade */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Comunidade</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${(fetching || adminStats === null) ? 'text-gray-300' : 'text-indigo-600'}`}>
                  {(fetching || adminStats === null) ? '–' : adminStats.sharedRoteiros}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Roteiros compartilhados</p>
              </div>
              <div className="bg-indigo-50 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${(fetching || adminStats === null) ? 'text-gray-300' : 'text-indigo-600'}`}>
                  {(fetching || adminStats === null) ? '–' : adminStats.roteiros}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Roteiros pessoais</p>
              </div>
              <div className="bg-yellow-50 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${(fetching || adminStats === null) ? 'text-gray-300' : 'text-yellow-600'}`}>
                  {(fetching || adminStats === null) ? '–' : adminStats.reviews}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Avaliações</p>
              </div>
              <div className="bg-teal-50 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${(fetching || adminStats === null) ? 'text-gray-300' : 'text-teal-600'}`}>
                  {(fetching || adminStats === null) ? '–' : adminStats.places}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Destinos aprovados</p>
              </div>
            </div>
          </section>

          {/* Totais de anúncios */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Anúncios (histórico)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : 'text-blue-600'}`}>
                  {fetching ? '–' : adRequests.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Solicitações totais</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${fetching ? 'text-gray-300' : 'text-blue-600'}`}>
                  {fetching ? '–' : events.length + eats.length + stays.length}
                </p>
                <p className="text-xs text-gray-500 mt-1 font-medium">Itens no ar</p>
              </div>
            </div>
          </section>

          {/* Crescimento — reviews por semana */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Crescimento (últimas 8 semanas)</p>
            {loadingGrowth ? (
              <div className="flex flex-col gap-2">
                {[1,2,3].map(i => <div key={i} className="h-8 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : growthStats ? (
              <>
                {/* Totais por tipo */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {[
                    { label: '📍 Destinos',    count: growthStats.reviewTotals.places,  color: 'bg-blue-50 text-blue-700' },
                    { label: '🎭 Eventos',     count: growthStats.reviewTotals.events,  color: 'bg-purple-50 text-purple-700' },
                    { label: '🍽️ Restaurantes', count: growthStats.reviewTotals.eats,    color: 'bg-orange-50 text-orange-700' },
                    { label: '🏡 Hospedagens', count: growthStats.reviewTotals.stays,   color: 'bg-green-50 text-green-700' },
                    { label: '🗓️ Roteiros',   count: growthStats.reviewTotals.roteiros, color: 'bg-indigo-50 text-indigo-700' },
                    { label: '👥 Usuários',    count: growthStats.totalUsers,            color: 'bg-teal-50 text-teal-700' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                      <p className="text-xl font-black">{count}</p>
                      <p className="text-[10px] font-medium mt-0.5 leading-tight">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Gráfico de barras semanal */}
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-semibold text-gray-500 mb-3">Avaliações por semana</p>
                  {(() => {
                    const max = Math.max(...growthStats.weeklyReviews.map(w => w.count), 1)
                    return (
                      <div className="flex items-end gap-1.5 h-24">
                        {growthStats.weeklyReviews.map((w, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[9px] text-gray-500 font-semibold">{w.count > 0 ? w.count : ''}</span>
                            <div
                              className="w-full rounded-t-md bg-orange-400 transition-all"
                              style={{ height: `${Math.max((w.count / max) * 72, w.count > 0 ? 4 : 0)}px` }}
                            />
                            <span className="text-[8px] text-gray-400 text-center leading-tight">{w.label}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Erro ao carregar métricas.</p>
            )}
          </section>

          {/* Top usuários */}
          <section>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Top usuários por pontuação</p>
            {loadingGrowth ? (
              <div className="flex flex-col gap-2">
                {[1,2,3,4,5].map(i => <div key={i} className="h-10 rounded-xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : growthStats && growthStats.topUsers.length > 0 ? (
              <div className="flex flex-col gap-2">
                {growthStats.topUsers.map((u, i) => (
                  <div key={u.userId} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-3 py-2">
                    <span className="text-sm font-black text-gray-300 w-5 text-right flex-shrink-0">#{i + 1}</span>
                    {u.photo
                      ? <img src={u.photo} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600 flex-shrink-0">{u.name.charAt(0).toUpperCase()}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                      {u.rankLabel && <p className="text-xs text-gray-400">{u.rankLabel}</p>}
                    </div>
                    <span className="text-sm font-black text-orange-500 flex-shrink-0">{u.score} pts</span>
                  </div>
                ))}
              </div>
            ) : !loadingGrowth ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum usuário com pontuação ainda.</p>
            ) : null}
          </section>
        </div>
      ) : fetching ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-gray-100 overflow-hidden">
              <div className="skeleton h-14 w-full rounded-none" />
              <div className="p-4 flex flex-col gap-2.5">
                <div className="skeleton h-4 w-3/4" />
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-4 w-full" />
              </div>
              <div className="px-4 pb-4 flex gap-2">
                <div className="skeleton h-10 flex-1 rounded-xl" />
                <div className="skeleton h-10 flex-[2] rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'anuncios' ? (
        paidRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-gray-700">Nenhum anúncio pendente</p>
            <p className="text-sm text-gray-400 mt-1">Quando alguém enviar, aparece aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 stagger">
            {paidRequests.slice(adPage * 5, (adPage + 1) * 5).map((req) => {
              const isActing = acting === req.id
              const date = (req as any).createdAt?.toDate?.()
              const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              const typeEmoji = req.type === 'evento' ? '🎭' : req.type === 'comer' ? '🍽️' : '🏡'
              const typeLabel = req.type === 'evento' ? 'Evento' : req.type === 'comer' ? 'Restaurante/Bar' : 'Hospedagem'
              const typeColor = req.type === 'evento' ? 'purple' : req.type === 'comer' ? 'orange' : 'green'
              const headerBg = typeColor === 'purple' ? 'bg-purple-50' : typeColor === 'orange' ? 'bg-orange-50' : 'bg-green-50'
              const labelColor = typeColor === 'purple' ? 'text-purple-600' : typeColor === 'orange' ? 'text-orange-600' : 'text-green-600'
              const borderColor = typeColor === 'purple' ? 'border-purple-100' : typeColor === 'orange' ? 'border-orange-100' : 'border-green-100'
              return (
                <div key={req.id} className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
                  {/* Header */}
                  <div className={`${headerBg} px-4 py-3 flex items-start justify-between gap-3`}>
                    <div>
                      <p className={`text-xs font-bold ${labelColor} uppercase tracking-wide`}>{typeEmoji} {typeLabel}</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{req.name}</p>
                      <p className="text-xs text-gray-500">📍 {req.city}, {req.state} · {req.category}</p>
                    </div>
                    {dateStr && <p className="text-xs text-gray-400 flex-shrink-0">{dateStr}</p>}
                  </div>

                  {/* Foto do evento */}
                  {req.type === 'evento' && req.photoUrl && (
                    <button
                      onClick={() => setLightbox({ photos: [req.photoUrl!], index: 0 })}
                      className="w-full h-40 bg-gray-100 overflow-hidden block focus:outline-none cursor-zoom-in">
                      <img src={getOptimizedUrl(req.photoUrl, 800)} alt="Folder do evento" className="w-full h-full object-cover hover:opacity-90 transition-opacity" loading="lazy" />
                    </button>
                  )}

                  {/* Fotos comer/hospedar */}
                  {(req.type === 'comer' || req.type === 'hospedar') && req.photos && req.photos.length > 0 && (
                    <div className="flex gap-1 px-3 pt-3 overflow-x-auto">
                      {req.photos.map((url: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setLightbox({ photos: req.photos!, index: i })}
                          className="flex-shrink-0 focus:outline-none cursor-zoom-in">
                          <img src={getOptimizedUrl(url, 192)} alt="" className="h-24 w-24 object-cover rounded-xl hover:opacity-80 transition-opacity" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Detalhes do negócio */}
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-1">
                    <p className="text-sm text-gray-700">{req.description}</p>
                    {req.type === 'evento' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {req.mapsLink && <a href={req.mapsLink} target="_blank" rel="noopener noreferrer" className="text-purple-500 font-semibold">🗺️ Ver local →</a>}
                        {req.date && <span>📅 {req.date}</span>}
                        {req.recurrence && <span className="text-purple-600 font-semibold">🔁 {req.recurrence === 'weekly' ? 'Toda semana' : req.recurrence === 'monthly_date' ? 'Todo mês (mesmo dia)' : 'Todo mês (mesmo dia da semana)'}</span>}
                        {req.price && <span>💲 {req.price}</span>}
                        {req.ticketUrl && <a href={req.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-purple-500 font-semibold">🎟️ Ingressos →</a>}
                      </div>
                    )}
                    {req.type === 'comer' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {req.priceRange && <span>💲 {req.priceRange}</span>}
                        {req.mapsLink && <a href={req.mapsLink} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-semibold">🗺️ Ver no mapa →</a>}
                        {req.socialLink && <a href={req.socialLink} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-semibold">📱 Rede social →</a>}
                      </div>
                    )}
                    {req.type === 'hospedar' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {req.priceFrom && <span>💲 A partir de R$ {req.priceFrom}/noite</span>}
                        {req.mapsLink && <a href={req.mapsLink} target="_blank" rel="noopener noreferrer" className="text-green-500 font-semibold">🗺️ Ver no mapa →</a>}
                        {req.bookingUrl && <a href={req.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 font-semibold">🏨 Reservar →</a>}
                        {req.socialLink && <a href={req.socialLink} target="_blank" rel="noopener noreferrer" className="text-green-500 font-semibold">📱 Rede social →</a>}
                      </div>
                    )}
                  </div>

                  {/* Contato */}
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Contato</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-700">
                      <span>👤 {req.contactName}</span>
                      <span>✉️ {req.contactEmail}</span>
                      {req.contactPhone && <span>📱 {req.contactPhone}</span>}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => openRejectModal(req.name, req.userId ?? null, 'request_rejected', async (reason) => {
                        setActing(req.id)
                        await rejectAdvertiserRequest(req.id, req.photoUrl, req.photos)
                        setAdRequests((prev) => prev.filter((x) => x.id !== req.id))
                        setActing(null)
                      })}
                      disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : '❌ Rejeitar'}
                    </button>
                    <button
                      onClick={async () => {
                        setActing(req.id)
                        await approveAdvertiserRequest(req)
                        setAdRequests((prev) => prev.filter((x) => x.id !== req.id))
                        if (req.type === 'evento') getApprovedEvents().then(setEvents)
                        else if (req.type === 'comer') getApprovedEats().then(setEats)
                        else if (req.type === 'hospedar') getApprovedStays().then(setStays)
                        setActing(null)
                      }}
                      disabled={!!isActing}
                      className="flex-[2] py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isActing ? 'Publicando…' : '✅ Aprovar'}
                    </button>
                  </div>
                </div>
              )
            })}
            <Pagination page={adPage} totalPages={Math.ceil(paidRequests.length / 5)} onPrev={() => setAdPage((p) => p - 1)} onNext={() => setAdPage((p) => p + 1)} />
          </div>
        )
      ) : tab === 'sugestoes' ? (
        suggestions.length === 0 && freeRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-semibold text-gray-700">Nenhuma sugestão pendente</p>
            <p className="text-sm text-gray-400 mt-1">Tudo em dia por aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 stagger">
            {/* Free comer/hospedar suggestions */}
            {freeRequests.map((req) => {
              const isActing = acting === req.id
              const date = (req as any).createdAt?.toDate?.()
              const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              const typeEmoji = req.type === 'comer' ? '🍽️' : '🏡'
              const typeLabel = req.type === 'comer' ? 'Restaurante/Bar' : 'Hospedagem'
              const headerBg = req.type === 'comer' ? 'bg-orange-50' : 'bg-green-50'
              const labelColor = req.type === 'comer' ? 'text-orange-600' : 'text-green-600'
              const borderColor = req.type === 'comer' ? 'border-orange-100' : 'border-green-100'
              return (
                <div key={req.id} className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>
                  <div className={`${headerBg} px-4 py-3 flex items-start justify-between gap-3`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-bold ${labelColor} uppercase tracking-wide`}>{typeEmoji} {typeLabel}</p>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sugestão gratuita</span>
                      </div>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{req.name}</p>
                      <p className="text-xs text-gray-500">📍 {req.city}, {req.state} · {req.category}</p>
                    </div>
                    {dateStr && <p className="text-xs text-gray-400 flex-shrink-0">{dateStr}</p>}
                  </div>
                  {req.photos && req.photos.length > 0 && (
                    <div className="flex gap-1 px-3 pt-3 overflow-x-auto">
                      {req.photos.map((url: string, i: number) => (
                        <button key={i} onClick={() => setLightbox({ photos: req.photos!, index: i })} className="flex-shrink-0 focus:outline-none cursor-zoom-in">
                          <img src={getOptimizedUrl(url, 192)} alt="" className="h-24 w-24 object-cover rounded-xl hover:opacity-80 transition-opacity" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-3 border-b border-gray-100 flex flex-col gap-1">
                    <p className="text-sm text-gray-700">{req.description}</p>
                    {req.type === 'comer' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {req.priceRange && <span>💲 {req.priceRange}</span>}
                        {req.mapsLink && <a href={req.mapsLink} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-semibold">🗺️ Ver no mapa →</a>}
                        {req.socialLink && <a href={req.socialLink} target="_blank" rel="noopener noreferrer" className="text-orange-500 font-semibold">📱 Rede social →</a>}
                      </div>
                    )}
                    {req.type === 'hospedar' && (
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                        {req.priceFrom && <span>💲 A partir de R$ {req.priceFrom}/noite</span>}
                        {req.mapsLink && <a href={req.mapsLink} target="_blank" rel="noopener noreferrer" className="text-green-500 font-semibold">🗺️ Ver no mapa →</a>}
                        {req.bookingUrl && <a href={req.bookingUrl} target="_blank" rel="noopener noreferrer" className="text-green-500 font-semibold">🏨 Reservar →</a>}
                        {req.socialLink && <a href={req.socialLink} target="_blank" rel="noopener noreferrer" className="text-green-500 font-semibold">📱 Rede social →</a>}
                      </div>
                    )}
                  </div>
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quem enviou</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-700">
                      {req.contactName && <span>👤 {req.contactName}</span>}
                      {req.contactEmail && <span>✉️ {req.contactEmail}</span>}
                      {req.contactPhone && <span>📱 {req.contactPhone}</span>}
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => openRejectModal(req.name, req.userId ?? null, 'request_rejected', async () => {
                        setActing(req.id)
                        await rejectAdvertiserRequest(req.id, req.photoUrl, req.photos)
                        setAdRequests((prev) => prev.filter((x) => x.id !== req.id))
                        setActing(null)
                      })}
                      disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : '❌ Rejeitar'}
                    </button>
                    <button
                      onClick={async () => {
                        setActing(req.id)
                        await approveAdvertiserRequest(req)
                        setAdRequests((prev) => prev.filter((x) => x.id !== req.id))
                        if (req.type === 'comer') getApprovedEats().then(setEats)
                        else if (req.type === 'hospedar') getApprovedStays().then(setStays)
                        setActing(null)
                      }}
                      disabled={!!isActing}
                      className="flex-[2] py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isActing ? 'Publicando…' : '✅ Aprovar'}
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Separator when both sections have items */}
            {freeRequests.length > 0 && suggestions.length > 0 && (
              <div className="flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">destinos</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
            )}

            {/* Destination suggestions */}
            {suggestions.slice(sugPage * 5, (sugPage + 1) * 5).map((s) => {
              const isActing = acting === s.id
              const date = (s as any).createdAt?.toDate?.()
              const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                  <div className="bg-orange-50 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Nova sugestão</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{s.name}</p>
                      <p className="text-xs text-gray-500">📍 {s.city}, {s.state} · {s.category}</p>
                    </div>
                    {dateStr && <p className="text-xs text-gray-400 flex-shrink-0">{dateStr}</p>}
                  </div>
                  {(s as any).photos?.length > 0 && (
                    <div className="flex gap-2 px-4 pt-3 overflow-x-auto">
                      {(s as any).photos.map((url: string, i: number) => (
                        <button
                          key={i}
                          onClick={() => setLightbox({ photos: (s as any).photos, index: i })}
                          className="flex-shrink-0 focus:outline-none">
                          <img src={getOptimizedUrl(url, 192)} alt="" className="h-24 w-24 object-cover rounded-xl hover:opacity-80 transition-opacity cursor-zoom-in" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm text-gray-700">{s.description}</p>
                    {(s as any).mapsLink && (
                      <a href={(s as any).mapsLink} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 font-semibold mt-2 inline-block">📍 Ver no Maps →</a>
                    )}
                    {(s as any).videoUrl && (
                      <a href={(s as any).videoUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-red-500 font-semibold mt-1 ml-3 inline-block">🎬 Ver vídeo →</a>
                    )}
                  </div>
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Quem enviou</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-700">
                      {(s as any).contactName && <span>👤 {(s as any).contactName}</span>}
                      {(s as any).contactEmail && <span>✉️ {(s as any).contactEmail}</span>}
                      {(s as any).contactPhone && <span>📱 {(s as any).contactPhone}</span>}
                      {!(s as any).contactName && s.suggestedBy && s.suggestedBy !== 'anon' && (
                        <span className="text-gray-400">UID: {s.suggestedBy}</span>
                      )}
                      {!(s as any).contactName && (!s.suggestedBy || s.suggestedBy === 'anon') && (
                        <span className="text-gray-400 italic">Anônimo</span>
                      )}
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => openRejectModal(s.name, s.suggestedBy !== 'anon' ? s.suggestedBy : null, 'suggestion_rejected', async () => handleReject(s))}
                      disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : '❌ Rejeitar'}
                    </button>
                    <button
                      onClick={() => handleApprove(s)}
                      disabled={!!isActing}
                      className="flex-[2] py-2 rounded-xl text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {isActing ? 'Aprovando…' : '✅ Aprovar'}
                    </button>
                  </div>
                </div>
              )
            })}
            {suggestions.length > 0 && (
              <Pagination page={sugPage} totalPages={Math.ceil(suggestions.length / 5)} onPrev={() => setSugPage((p) => p - 1)} onNext={() => setSugPage((p) => p + 1)} />
            )}
          </div>
        )
      ) : (
        tab === 'publicados' ? (
        <div>
          {/* Sub-tabs: scroll horizontal */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
            {([
              { sub: 'eventos',    label: '🎭 Eventos',      count: events.length,               color: 'bg-gray-700 text-white',   inactive: 'bg-gray-100 text-gray-600',  load: false },
              { sub: 'eats',       label: '🍽️ Rest.',        count: eats.length,                 color: 'bg-orange-500 text-white', inactive: 'bg-gray-100 text-gray-600',  load: false },
              { sub: 'stays',      label: '🏡 Hosped.',      count: stays.length,                color: 'bg-green-600 text-white',  inactive: 'bg-gray-100 text-gray-600',  load: false },
              { sub: 'avaliacoes', label: '⭐ Avaliações',   count: adminReviews.length,          color: 'bg-yellow-500 text-white', inactive: 'bg-gray-100 text-gray-600',  load: true  },
              { sub: 'roteiros',   label: '🗓️ Roteiros',     count: adminSharedRoteiros.length,   color: 'bg-indigo-600 text-white', inactive: 'bg-gray-100 text-gray-600',  load: true  },
            ] as const).map(({ sub, label, count, color, inactive, load }) => (
              <button key={sub}
                onClick={() => { setContentSub(sub as any); setContentPage(0); if (load) handleLoadUserContent(sub as any) }}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${contentSub === sub ? color : inactive}`}>
                {label}{(count > 0 || userContentLoaded[sub]) ? ` (${count})` : ''}
              </button>
            ))}
          </div>

          {/* Lista de eventos */}
          {contentSub === 'eventos' && (() => {
            const expiredCount = events.filter(isEventExpired).length
            return events.length === 0
              ? <p className="text-center text-gray-400 py-10">Nenhum evento publicado.</p>
              : <div className="flex flex-col gap-3">
                  {expiredCount > 0 && (
                    <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                      <p className="text-xs text-amber-700 font-semibold">
                        {expiredCount} evento{expiredCount > 1 ? 's' : ''} expirado{expiredCount > 1 ? 's' : ''}
                      </p>
                      <button
                        onClick={handleDeleteExpired}
                        disabled={acting === '__expired__'}
                        className="text-xs font-bold text-red-600 hover:text-red-800 disabled:opacity-40"
                      >
                        {acting === '__expired__' ? 'Limpando…' : '🗑️ Limpar todos'}
                      </button>
                    </div>
                  )}
                  {events.slice(contentPage * 10, (contentPage + 1) * 10).map((ev) => {
                    const expired = isEventExpired(ev)
                    return (
                      <div key={ev.id} className={`bg-white rounded-xl border p-3 flex items-center gap-3 ${expired ? 'border-amber-200 opacity-60' : 'border-gray-100'}`}>
                        {ev.photoUrl && <img src={getOptimizedUrl(ev.photoUrl, 96)} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-gray-800 truncate">{ev.name}</p>
                            {expired && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full flex-shrink-0">Expirado</span>}
                          </div>
                          <p className="text-xs text-gray-400">📍 {ev.city}, {ev.state}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(ev)}
                          disabled={acting === ev.id}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 flex-shrink-0">
                          {acting === ev.id ? '…' : '🗑️ Excluir'}
                        </button>
                      </div>
                    )
                  })}
                  <Pagination page={contentPage} totalPages={Math.ceil(events.length / 10)} onPrev={() => setContentPage((p) => p - 1)} onNext={() => setContentPage((p) => p + 1)} />
                </div>
          })()}

          {/* Lista de restaurantes */}
          {contentSub === 'eats' && (
            eats.length === 0
              ? <p className="text-center text-gray-400 py-10">Nenhum restaurante publicado.</p>
              : <div className="flex flex-col gap-3">
                  {eats.slice(contentPage * 10, (contentPage + 1) * 10).map((eat) => (
                    <div key={eat.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                      {eat.photoUrl && <img src={getOptimizedUrl(eat.photoUrl, 96)} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{eat.name}</p>
                        <p className="text-xs text-gray-400">📍 {eat.city}, {eat.state}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteEat(eat)}
                        disabled={acting === eat.id}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 flex-shrink-0">
                        {acting === eat.id ? '…' : '🗑️ Excluir'}
                      </button>
                    </div>
                  ))}
                  <Pagination page={contentPage} totalPages={Math.ceil(eats.length / 10)} onPrev={() => setContentPage((p) => p - 1)} onNext={() => setContentPage((p) => p + 1)} />
                </div>
          )}

          {/* Lista de hospedagens */}
          {contentSub === 'stays' && (
            stays.length === 0
              ? <p className="text-center text-gray-400 py-10">Nenhuma hospedagem publicada.</p>
              : <div className="flex flex-col gap-3">
                  {stays.slice(contentPage * 10, (contentPage + 1) * 10).map((stay) => (
                    <div key={stay.id} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
                      {stay.photoUrl && <img src={getOptimizedUrl(stay.photoUrl, 96)} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" loading="lazy" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{stay.name}</p>
                        <p className="text-xs text-gray-400">📍 {stay.city}, {stay.state}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteStay(stay)}
                        disabled={acting === stay.id}
                        className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40 flex-shrink-0">
                        {acting === stay.id ? '…' : '🗑️ Excluir'}
                      </button>
                    </div>
                  ))}
                  <Pagination page={contentPage} totalPages={Math.ceil(stays.length / 10)} onPrev={() => setContentPage((p) => p - 1)} onNext={() => setContentPage((p) => p + 1)} />
                </div>
          )}

          {/* Avaliações de usuários */}
          {contentSub === 'avaliacoes' && (
            loadingUserContent ? (
              <div className="flex flex-col gap-3">
                {[1,2,3,4,5].map((i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : adminReviews.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Nenhuma avaliação encontrada.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {adminReviews.slice(contentPage * 15, (contentPage + 1) * 15).map((r) => {
                  const typeLabel = r.type === 'place' ? '🏛️ Destino' : r.type === 'event' ? '🎭 Evento' : r.type === 'eat' ? '🍽️ Restaurante' : r.type === 'stay' ? '🏡 Hospedagem' : '🗓️ Roteiro'
                  const typeColor = r.type === 'place' ? 'text-blue-600 bg-blue-50' : r.type === 'event' ? 'text-purple-600 bg-purple-50' : r.type === 'eat' ? 'text-orange-600 bg-orange-50' : r.type === 'stay' ? 'text-green-600 bg-green-50' : 'text-indigo-600 bg-indigo-50'
                  const date = (r.createdAt as any)?.toDate?.()
                  const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${typeColor}`}>{typeLabel}</span>
                          {r.targetName && <p className="text-xs text-gray-500 truncate">{r.targetName}</p>}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {dateStr && <span className="text-[10px] text-gray-400">{dateStr}</span>}
                          <button
                            onClick={() => handleDeleteAdminReview(r)}
                            disabled={acting === r.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">
                            {acting === r.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {r.userPhoto
                          ? <img src={r.userPhoto} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                          : <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[9px] text-orange-600 font-bold flex-shrink-0">{r.userName?.charAt(0).toUpperCase() || '?'}</span>
                        }
                        <span className="text-xs font-semibold text-gray-700 truncate">{r.userName}</span>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {[1,2,3,4,5].map((s) => <span key={s} className={`text-xs ${s <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>)}
                        </div>
                      </div>
                      {r.text && <p className="text-xs text-gray-600 line-clamp-2">{r.text}</p>}
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-1 mt-2 overflow-x-auto">
                          {r.photos.map((url, i) => (
                            <button key={i} onClick={() => setLightbox({ photos: r.photos!, index: i })} className="flex-shrink-0 focus:outline-none">
                              <img src={getOptimizedUrl(url, 96)} alt="" className="h-12 w-12 object-cover rounded-lg hover:opacity-80 transition-opacity cursor-zoom-in" loading="lazy" />
                            </button>
                          ))}
                        </div>
                      )}
                      {r.videoUrl && <YouTubeEmbed videoUrl={r.videoUrl} className="mt-2" />}
                    </div>
                  )
                })}
                <Pagination page={contentPage} totalPages={Math.ceil(adminReviews.length / 15)} onPrev={() => setContentPage((p) => p - 1)} onNext={() => setContentPage((p) => p + 1)} />
              </div>
            )
          )}

          {/* Roteiros compartilhados */}
          {contentSub === 'roteiros' && (
            loadingUserContent ? (
              <div className="flex flex-col gap-3">
                {[1,2,3].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
              </div>
            ) : adminSharedRoteiros.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Nenhum roteiro compartilhado.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {adminSharedRoteiros.slice(contentPage * 15, (contentPage + 1) * 15).map((r) => {
                  const date = (r.sharedAt as any)?.toDate?.()
                  const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
                  return (
                    <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{r.name}</p>
                          <p className="text-xs text-gray-400">{r.destination.city || r.destination.name}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {dateStr && <span className="text-[10px] text-gray-400">{dateStr}</span>}
                          <button
                            onClick={() => handleDeleteAdminSharedRoteiro(r)}
                            disabled={acting === r.id}
                            className="text-xs font-semibold text-red-500 hover:text-red-700 disabled:opacity-40">
                            {acting === r.id ? '…' : '🗑️'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {r.authorPhotoUrl
                          ? <img src={r.authorPhotoUrl} alt="" className="w-4 h-4 rounded-full object-cover flex-shrink-0" />
                          : <span className="w-4 h-4 rounded-full bg-orange-100 flex items-center justify-center text-[9px] text-orange-600 font-bold flex-shrink-0">{r.authorName?.charAt(0).toUpperCase() || '?'}</span>
                        }
                        <span className="text-xs text-gray-500 truncate">{r.authorName}</span>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {r.events.length > 0 && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded-full">{r.events.length} evento{r.events.length !== 1 ? 's' : ''}</span>}
                        {r.eats.length > 0 && <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">{r.eats.length} restaurante{r.eats.length !== 1 ? 's' : ''}</span>}
                        {r.stays.length > 0 && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">{r.stays.length} hospedagem{r.stays.length !== 1 ? 's' : ''}</span>}
                        {r.copyCount > 0 && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">📋 {r.copyCount}x copiado</span>}
                        {(r.averageRating || 0) > 0 && <span className="text-[10px] bg-yellow-50 text-yellow-600 px-1.5 py-0.5 rounded-full">★ {r.averageRating!.toFixed(1)}</span>}
                      </div>
                    </div>
                  )
                })}
                <Pagination page={contentPage} totalPages={Math.ceil(adminSharedRoteiros.length / 15)} onPrev={() => setContentPage((p) => p - 1)} onNext={() => setContentPage((p) => p + 1)} />
              </div>
            )
          )}
        </div>
      ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-semibold text-gray-700">Nenhuma denúncia pendente</p>
            <p className="text-sm text-gray-400 mt-1">Tudo limpo por aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 stagger">
            {reports.slice(repPage * 5, (repPage + 1) * 5).map((r) => {
              const date = r.createdAt?.toDate?.()
              const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              const isActing = acting === r.id
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide">
                        {(r as any).reviewType === 'sharedRoteiro' ? '🗓️ Roteiro denunciado' : '🚩 Avaliação denunciada'}
                      </p>
                      {(() => {
                        const href = (r as any).roteiroId
                          ? `/ver/${(r as any).roteiroId}`
                          : r.googlePlaceId
                          ? `/destino/google/${r.googlePlaceId}`
                          : r.placeId ? `/destino/${r.placeId}` : null
                        const label = (r as any).roteiroId ? `${r.placeName || 'Roteiro'}` : `📍 ${r.placeName}`
                        return r.placeName || (r as any).roteiroId ? (
                          href ? (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 mt-0.5 group">
                              <span className="text-sm font-semibold text-gray-800 group-hover:text-red-600 transition-colors">{label}</span>
                              <span className="text-xs text-red-400 group-hover:text-red-600">→</span>
                            </a>
                          ) : (
                            <p className="text-sm font-semibold text-gray-800 mt-0.5">{label}</p>
                          )
                        ) : null
                      })()}
                      {dateStr && <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">Denunciado por</p>
                      <p className="text-xs font-semibold text-gray-700">{r.reportedByName}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {(r.reviewUserName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{(r as any).reviewType === 'sharedRoteiro' ? 'Autor do roteiro' : 'Autor da avaliação'}</p>
                        <p className="text-sm font-semibold text-gray-800">{r.reviewUserName || '—'}</p>
                        {(r as any).reviewType !== 'sharedRoteiro' && (
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((s) => (
                              <span key={s} className={`text-xs ${s <= r.reviewRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    {r.reviewText && (
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2 italic">"{r.reviewText}"</p>
                    )}
                  </div>
                  <div className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => handleDismiss(r)} disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : '✓ Ignorar'}
                    </button>
                    <button onClick={() => handleDeleteReview(r)} disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : (r as any).reviewType === 'sharedRoteiro' ? '🗑️ Excluir roteiro' : '🗑️ Excluir avaliação'}
                    </button>
                  </div>
                </div>
              )
            })}
            <Pagination page={repPage} totalPages={Math.ceil(reports.length / 5)} onPrev={() => setRepPage((p) => p - 1)} onNext={() => setRepPage((p) => p + 1)} />
          </div>
        )
      )}

      {/* ── Tab: Importar eventos ── */}
      {tab === 'importar' && (
        <div className="flex flex-col gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs font-bold text-green-800 mb-1">🔄 Importar do Minha Entrada</p>
            <p className="text-xs text-green-700">Busca eventos publicados em minhaentrada.com.br. Revise e publique com 1 clique.</p>
          </div>

          {/* Filtros */}
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Fonte</label>
                <select value={importFonte} onChange={(e) => { setImportFonte(e.target.value as any); setImportEvents([]); setImportSymplaEvents([]) }}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  <option value="minhaentrada">Minha Entrada</option>
                  <option value="sympla">Sympla</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Estado</label>
                <select value={importEstado} onChange={(e) => setImportEstado(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm">
                  {['AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'].map(uf => (
                    <option key={uf} value={uf}>{uf}</option>
                  ))}
                </select>
              </div>
            </div>
            <button
              onClick={async () => {
                setImportLoading(true)
                setImportError('')
                setImportEvents([])
                setImportSymplaEvents([])
                setPublishedUrls(new Set())
                setCardCidades({})
                setCardCategorias({})
                setDescriptions({})
                try {
                  if (importFonte === 'sympla') {
                    const res = await fetch(`/api/adm/scrape-sympla?estado=${importEstado}`)
                    const data = await res.json()
                    if (data.error) { setImportError(data.error); return }
                    setImportSymplaEvents(data.events)
                    const cidades: Record<string, string> = {}
                    data.events.forEach((ev: any) => { if (ev.city) cidades[ev.ticketUrl] = ev.city })
                    setCardCidades(cidades)
                    if (data.events.length === 0) setImportError('Nenhum evento encontrado para esse estado.')
                  } else {
                    const res = await fetch(`/api/adm/scrape-eventos?estado=${importEstado}`)
                    const data = await res.json()
                    if (data.error) { setImportError(data.error); return }
                    setImportEvents(data.events)
                    const cidades: Record<string, string> = {}
                    data.events.forEach((ev: any) => { if (ev.city) cidades[ev.ticketUrl] = ev.city })
                    setCardCidades(cidades)
                    if (data.events.length === 0) setImportError('Nenhum evento encontrado para esse estado.')
                  }
                } catch {
                  setImportError('Erro ao buscar eventos.')
                } finally {
                  setImportLoading(false)
                }
              }}
              disabled={importLoading}
              className="w-full py-3 rounded-xl font-bold text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {importLoading ? '🔄 Buscando...' : '🔍 Buscar eventos'}
            </button>
            {importError && <p className="text-xs text-red-500 text-center">{importError}</p>}
          </div>

          {/* Lista de eventos scraped */}
          {importEvents.length > 0 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-500 font-semibold">{importEvents.length} evento{importEvents.length !== 1 ? 's' : ''} encontrado{importEvents.length !== 1 ? 's' : ''} em {importEstado}</p>
              {importEvents.map((ev) => {
                const published = publishedUrls.has(ev.ticketUrl) || events.some((e) => e.ticketUrl === ev.ticketUrl)
                const isPublishing = publishingId === ev.ticketUrl
                return (
                  <div key={ev.ticketUrl} className={`border rounded-xl overflow-hidden ${published ? 'border-green-200 bg-green-50 opacity-60' : 'border-gray-200 bg-white'}`}>
                    {ev.photoUrl ? (
                      <img src={ev.photoUrl} alt={ev.name} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-purple-50 flex items-center justify-center text-5xl">🎭</div>
                    )}
                    <div className="p-3">
                      <p className="font-bold text-sm text-gray-900 leading-tight">{ev.name}</p>
                      {ev.dateStr && <p className="text-xs text-purple-600 font-semibold mt-1">📅 {ev.dateStr}</p>}
                      {(ev.venueName || ev.venue) && <p className="text-xs text-gray-500 mt-0.5">📍 {ev.venueName || ev.venue}</p>}
                      {(() => {
                        const loc = resolvedLoc[ev.ticketUrl]
                        const hasMaps = loc ?? (ev.mapsLink && ev.lat)
                        if (hasMaps) {
                          const link = loc?.mapsLink ?? ev.mapsLink
                          const lat = loc?.lat ?? ev.lat
                          const lng = loc?.lng ?? ev.lng
                          const label = loc?.formattedAddress ?? (lat ? `${lat.toFixed(4)}, ${lng?.toFixed(4)}` : 'Ver localização')
                          return (
                            <a href={link} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-green-600 hover:underline mt-0.5 block">
                              🗺️ {label}
                            </a>
                          )
                        }
                        return (
                          <div className="mt-1.5 flex flex-col gap-1">
                            <p className="text-xs text-red-400">⚠️ Sem coordenadas — informe o endereço:</p>
                            <div className="flex gap-1">
                              <input
                                type="text"
                                placeholder="Endereço ou lat, lng"
                                value={manualAddr[ev.ticketUrl] ?? ''}
                                onChange={(e) => setManualAddr((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && manualAddr[ev.ticketUrl]?.trim()) e.currentTarget.blur()
                                }}
                                className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400"
                              />
                              <button
                                disabled={!manualAddr[ev.ticketUrl]?.trim() || geocoding[ev.ticketUrl]}
                                onClick={async () => {
                                  const addr = manualAddr[ev.ticketUrl]?.trim()
                                  if (!addr) return
                                  setGeocoding((prev) => ({ ...prev, [ev.ticketUrl]: true }))
                                  try {
                                    const res = await fetch(`/api/adm/geocode?address=${encodeURIComponent(addr)}`)
                                    const data = await res.json()
                                    if (data.lat) {
                                      setResolvedLoc((prev) => ({ ...prev, [ev.ticketUrl]: data }))
                                    } else {
                                      alert(data.error ?? 'Endereço não encontrado')
                                    }
                                  } catch {
                                    alert('Erro ao geocodificar')
                                  } finally {
                                    setGeocoding((prev) => ({ ...prev, [ev.ticketUrl]: false }))
                                  }
                                }}
                                className="text-xs font-semibold px-2 py-1 rounded-lg bg-purple-600 text-white disabled:opacity-40"
                              >
                                {geocoding[ev.ticketUrl] ? '...' : 'Localizar'}
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                      <textarea
                        rows={3}
                        placeholder="Descrição (opcional)..."
                        value={descriptions[ev.ticketUrl] ?? ev.description ?? ''}
                        onChange={(e) => setDescriptions((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-400 resize-y mt-1"
                      />
                      <a href={ev.ticketUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 block">
                        🔗 Ver no Minha Entrada
                      </a>
                    </div>
                    <div className="px-3 pb-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Cidade</label>
                          <input
                            type="text"
                            placeholder="Ex: Criciúma"
                            value={cardCidades[ev.ticketUrl] ?? ''}
                            onChange={(e) => setCardCidades((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Categoria</label>
                          <select
                            value={cardCategorias[ev.ticketUrl] ?? 'show'}
                            onChange={(e) => setCardCategorias((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-400"
                          >
                            <option value="show">🎤 Show</option>
                            <option value="festival">🎪 Festival</option>
                            <option value="feira">🛍️ Feira</option>
                            <option value="esportivo">⚽ Esportivo</option>
                            <option value="cultural">🎨 Cultural</option>
                            <option value="teatro">🎭 Teatro</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Encerra em:</label>
                        <input
                          type="date"
                          value={endDates[ev.ticketUrl] ?? ''}
                          onChange={(e) => setEndDates((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400"
                        />
                        {endDates[ev.ticketUrl] && (
                          <button onClick={() => setEndDates((prev) => { const n = { ...prev }; delete n[ev.ticketUrl]; return n })}
                            className="text-gray-400 hover:text-red-400 text-sm">✕</button>
                        )}
                      </div>
                      <button
                        disabled={published || isPublishing || !cardCidades[ev.ticketUrl]?.trim()}
                        onClick={async () => {
                          setPublishingId(ev.ticketUrl)
                          try {
                            const date = ev.dateISO ? Timestamp.fromDate(new Date(ev.dateISO)) : Timestamp.now()
                            const endDateVal = endDates[ev.ticketUrl]
                            const endDate = endDateVal ? Timestamp.fromDate(new Date(`${endDateVal}T23:59:59`)) : undefined
                            await addEvent({
                              name: ev.name,
                              city: cardCidades[ev.ticketUrl]?.trim() ?? '',
                              state: importEstado,
                              venue: ev.venueName || ev.venue,
                              description: descriptions[ev.ticketUrl] ?? ev.description ?? '',
                              date,
                              ...(endDate ? { endDate } : {}),
                              price: '',
                              category: (cardCategorias[ev.ticketUrl] ?? 'show') as any,
                              photoUrl: ev.photoUrl,
                              ticketUrl: ev.ticketUrl,
                              ...(resolvedLoc[ev.ticketUrl]?.mapsLink ?? ev.mapsLink ? { mapsLink: resolvedLoc[ev.ticketUrl]?.mapsLink ?? ev.mapsLink } : {}),
                              ...(resolvedLoc[ev.ticketUrl]?.lat ?? ev.lat != null ? { lat: resolvedLoc[ev.ticketUrl]?.lat ?? ev.lat! } : {}),
                              ...(resolvedLoc[ev.ticketUrl]?.lng ?? ev.lng != null ? { lng: resolvedLoc[ev.ticketUrl]?.lng ?? ev.lng! } : {}),
                              plan: 'free',
                              status: 'approved',
                              averageRating: 0,
                              reviewCount: 0,
                              suggestedBy: user!.uid,
                            })
                            setPublishedUrls((prev) => new Set(prev).add(ev.ticketUrl))
                          } catch {
                            alert('Erro ao publicar evento.')
                          } finally {
                            setPublishingId(null)
                          }
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                          published ? 'bg-green-100 text-green-700' : isPublishing ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {published ? '✅ Publicado!' : isPublishing ? 'Publicando...' : '🚀 Publicar no Letsapp'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Lista de eventos Sympla */}
          {importSymplaEvents.length > 0 && (() => {
            const filtered = importFilter.trim()
              ? importSymplaEvents.filter((ev) => ev.name.toLowerCase().includes(importFilter.toLowerCase()))
              : importSymplaEvents
            return (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Filtrar por nome..."
                  value={importFilter}
                  onChange={(e) => setImportFilter(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-purple-400"
                />
                {importFilter && <button onClick={() => setImportFilter('')} className="text-gray-400 hover:text-red-400 text-sm">✕</button>}
              </div>
              <p className="text-xs text-gray-500 font-semibold">{filtered.length} de {importSymplaEvents.length} evento{importSymplaEvents.length !== 1 ? 's' : ''} — Sympla {importEstado}</p>
              {filtered.map((ev) => {
                const published = publishedUrls.has(ev.ticketUrl) || events.some((e) => e.ticketUrl === ev.ticketUrl)
                const isPublishing = publishingId === ev.ticketUrl
                return (
                  <div key={ev.ticketUrl} className={`border rounded-xl overflow-hidden ${published ? 'border-green-200 bg-green-50 opacity-60' : 'border-gray-200 bg-white'}`}>
                    {ev.photoUrl ? (
                      <img src={ev.photoUrl} alt={ev.name} className="w-full h-48 object-cover" />
                    ) : (
                      <div className="w-full h-48 bg-purple-50 flex items-center justify-center text-5xl">🎭</div>
                    )}
                    <div className="p-3">
                      <p className="font-bold text-sm text-gray-900 leading-tight">{ev.name}</p>
                      {ev.dateStr && <p className="text-xs text-purple-600 font-semibold mt-1">📅 {ev.dateStr}</p>}
                      {ev.venueName && <p className="text-xs text-gray-500 mt-0.5">📍 {ev.venueName}{ev.venueAddress ? ` — ${ev.venueAddress}` : ''}</p>}
                      {ev.mapsLink ? (
                        <a href={ev.mapsLink} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline mt-0.5 block">
                          🗺️ {ev.lat?.toFixed(4)}, {ev.lng?.toFixed(4)}
                        </a>
                      ) : (
                        <div className="mt-1.5 flex flex-col gap-1">
                          <p className="text-xs text-red-400">⚠️ Sem coordenadas — informe o endereço:</p>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              placeholder="Endereço ou lat, lng"
                              value={manualAddr[ev.ticketUrl] ?? ''}
                              onChange={(e) => setManualAddr((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                              className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400"
                            />
                            <button
                              disabled={!manualAddr[ev.ticketUrl]?.trim() || geocoding[ev.ticketUrl]}
                              onClick={async () => {
                                const addr = manualAddr[ev.ticketUrl]?.trim()
                                if (!addr) return
                                setGeocoding((prev) => ({ ...prev, [ev.ticketUrl]: true }))
                                try {
                                  const res = await fetch(`/api/adm/geocode?address=${encodeURIComponent(addr)}`)
                                  const data = await res.json()
                                  if (data.lat) setResolvedLoc((prev) => ({ ...prev, [ev.ticketUrl]: data }))
                                  else alert(data.error ?? 'Endereço não encontrado')
                                } catch { alert('Erro ao geocodificar') }
                                finally { setGeocoding((prev) => ({ ...prev, [ev.ticketUrl]: false })) }
                              }}
                              className="text-xs font-semibold px-2 py-1 rounded-lg bg-purple-600 text-white disabled:opacity-40"
                            >{geocoding[ev.ticketUrl] ? '...' : 'Localizar'}</button>
                          </div>
                        </div>
                      )}
                      <a href={ev.ticketUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline mt-1 block">🔗 Ver no Sympla</a>
                    </div>
                    <div className="px-3 pb-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Cidade</label>
                          <input
                            type="text"
                            placeholder="Ex: Florianópolis"
                            value={cardCidades[ev.ticketUrl] ?? ev.city}
                            onChange={(e) => setCardCidades((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-400"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-0.5 block">Categoria</label>
                          <select
                            value={cardCategorias[ev.ticketUrl] ?? 'show'}
                            onChange={(e) => setCardCategorias((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                            className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-400"
                          >
                            <option value="show">🎤 Show</option>
                            <option value="festival">🎪 Festival</option>
                            <option value="feira">🛍️ Feira</option>
                            <option value="esportivo">⚽ Esportivo</option>
                            <option value="cultural">🎨 Cultural</option>
                            <option value="teatro">🎭 Teatro</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 whitespace-nowrap">Encerra em:</label>
                        <input
                          type="date"
                          value={endDates[ev.ticketUrl] ?? (ev.endDateISO ? ev.endDateISO.slice(0, 10) : '')}
                          onChange={(e) => setEndDates((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                          className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-purple-400"
                        />
                        {endDates[ev.ticketUrl] && (
                          <button onClick={() => setEndDates((prev) => { const n = { ...prev }; delete n[ev.ticketUrl]; return n })}
                            className="text-gray-400 hover:text-red-400 text-sm">✕</button>
                        )}
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Descrição (opcional)..."
                        value={descriptions[ev.ticketUrl] ?? ''}
                        onChange={(e) => setDescriptions((prev) => ({ ...prev, [ev.ticketUrl]: e.target.value }))}
                        className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-400 resize-y"
                      />
                      <button
                        disabled={published || isPublishing || !(cardCidades[ev.ticketUrl] ?? ev.city)?.trim()}
                        onClick={async () => {
                          setPublishingId(ev.ticketUrl)
                          try {
                            const date = Timestamp.fromDate(new Date(ev.dateISO))
                            const endDateVal = endDates[ev.ticketUrl] ?? (ev.endDateISO ? ev.endDateISO.slice(0, 10) : '')
                            const endDate = endDateVal ? Timestamp.fromDate(new Date(`${endDateVal}T23:59:59`)) : undefined
                            const loc = resolvedLoc[ev.ticketUrl]
                            await addEvent({
                              name: ev.name,
                              city: (cardCidades[ev.ticketUrl] ?? ev.city).trim(),
                              state: ev.state || importEstado,
                              venue: ev.venueName,
                              description: descriptions[ev.ticketUrl] ?? '',
                              date,
                              ...(endDate ? { endDate } : {}),
                              price: '',
                              category: (cardCategorias[ev.ticketUrl] ?? 'show') as any,
                              photoUrl: ev.photoUrl,
                              ticketUrl: ev.ticketUrl,
                              mapsLink: loc?.mapsLink ?? ev.mapsLink,
                              ...(loc?.lat ?? ev.lat ? { lat: loc?.lat ?? ev.lat! } : {}),
                              ...(loc?.lng ?? ev.lng ? { lng: loc?.lng ?? ev.lng! } : {}),
                              plan: 'free',
                              status: 'approved',
                              averageRating: 0,
                              reviewCount: 0,
                              suggestedBy: user!.uid,
                            })
                            setPublishedUrls((prev) => new Set(prev).add(ev.ticketUrl))
                          } catch {
                            alert('Erro ao publicar evento.')
                          } finally {
                            setPublishingId(null)
                          }
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                          published ? 'bg-green-100 text-green-700' : isPublishing ? 'bg-gray-100 text-gray-400' : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {published ? '✅ Publicado!' : isPublishing ? 'Publicando...' : '🚀 Publicar no Letsapp'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            )
          })()}
        </div>
      )}
    </div>

    {/* Rejection modal */}
    {rejectModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={(e) => { if (e.target === e.currentTarget) setRejectModal(null) }}>
        <div className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-xl">
          <h3 className="font-bold text-gray-900 mb-0.5">Rejeitar solicitação</h3>
          <p className="text-sm text-gray-500 mb-4 truncate">{rejectModal.itemName}</p>
          <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
            Motivo da rejeição
            {!rejectModal.userId && <span className="ml-2 text-gray-300 normal-case font-normal">(usuário anônimo — não receberá notificação)</span>}
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: já existe um destino similar aprovado, informações insuficientes, fora da área de cobertura…"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
          />
          {rejectModal.userId && !rejectReason.trim() && (
            <p className="text-xs text-amber-600 mt-1.5">Sem motivo, o usuário não receberá notificação.</p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setRejectModal(null)}
              disabled={rejecting}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={confirmReject}
              disabled={rejecting}
              className="flex-[2] py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50">
              {rejecting ? 'Rejeitando…' : '❌ Confirmar rejeição'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
