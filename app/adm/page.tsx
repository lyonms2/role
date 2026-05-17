'use client'

import { useEffect, useState } from 'react'
import Pagination from '@/components/Pagination'
import Lightbox from '@/components/Lightbox'
import { useAuth } from '@/lib/auth-context'
import {
  getReports, dismissReport, deleteReviewAndReport, type ReviewReport,
  getPendingSuggestions, approveSuggestion, rejectSuggestion,
  getAdvertiserRequests, approveAdvertiserRequest, rejectAdvertiserRequest, type AdvertiserRequest,
} from '@/lib/firestore'
import type { Suggestion } from '@/types'
import { getOptimizedUrl } from '@/lib/cloudinary'

const ADMIN_EMAIL = 'leonardomorenodasilva3@gmail.com'

export default function AdmPage() {
  const { user, loading } = useAuth()
  const [tab, setTab] = useState<'sugestoes' | 'denuncias' | 'anuncios'>('anuncios')
  const [lightbox, setLightbox] = useState<{ photos: string[]; index: number } | null>(null)

  const [reports, setReports] = useState<ReviewReport[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [adRequests, setAdRequests] = useState<AdvertiserRequest[]>([])
  const [fetching, setFetching] = useState(true)
  const [acting, setActing] = useState<string | null>(null)
  const [sugPage, setSugPage] = useState(0)
  const [repPage, setRepPage] = useState(0)
  const [adPage, setAdPage] = useState(0)

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    Promise.all([getReports(), getPendingSuggestions(), getAdvertiserRequests()])
      .then(([reps, sugs, ads]) => { setReports(reps); setSuggestions(sugs); setAdRequests(ads) })
      .finally(() => setFetching(false))
  }, [user])

  async function handleDismiss(r: ReviewReport) {
    setActing(r.id)
    await dismissReport(r.id)
    setReports((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  async function handleDeleteReview(r: ReviewReport) {
    setActing(r.id)
    await deleteReviewAndReport(r.id, r.reviewId, r.placeId, r.reviewRating)
    setReports((prev) => prev.filter((x) => x.id !== r.id))
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
          <p className="text-xs text-gray-400">Rolê — moderação de conteúdo</p>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-0 mb-5 border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setTab('anuncios')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'anuncios' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          📣 Anúncios
          {adRequests.length > 0 && (
            <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === 'anuncios' ? 'bg-white/30 text-white' : 'bg-blue-100 text-blue-600'}`}>
              {adRequests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('sugestoes')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'sugestoes' ? 'bg-orange-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          📝 Sugestões
          {suggestions.length > 0 && (
            <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === 'sugestoes' ? 'bg-white/30 text-white' : 'bg-orange-100 text-orange-600'}`}>
              {suggestions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('denuncias')}
          className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${tab === 'denuncias' ? 'bg-red-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
          🚩 Denúncias
          {reports.length > 0 && (
            <span className={`ml-1.5 text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === 'denuncias' ? 'bg-white/30 text-white' : 'bg-red-100 text-red-600'}`}>
              {reports.length}
            </span>
          )}
        </button>
      </div>

      {fetching ? (
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
        adRequests.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📭</div>
            <p className="font-semibold text-gray-700">Nenhum anúncio pendente</p>
            <p className="text-sm text-gray-400 mt-1">Quando alguém enviar, aparece aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 stagger">
            {adRequests.slice(adPage * 5, (adPage + 1) * 5).map((req) => {
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
                      onClick={async () => {
                        setActing(req.id)
                        await rejectAdvertiserRequest(req.id)
                        setAdRequests((prev) => prev.filter((x) => x.id !== req.id))
                        setActing(null)
                      }}
                      disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : '❌ Rejeitar'}
                    </button>
                    <button
                      onClick={async () => {
                        setActing(req.id)
                        await approveAdvertiserRequest(req)
                        setAdRequests((prev) => prev.filter((x) => x.id !== req.id))
                        setActing(null)
                      }}
                      disabled={!!isActing}
                      className="flex-[2] py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors">
                      {isActing ? 'Publicando…' : '✅ Aprovar e publicar'}
                    </button>
                  </div>
                </div>
              )
            })}
            <Pagination page={adPage} totalPages={Math.ceil(adRequests.length / 5)} onPrev={() => setAdPage((p) => p - 1)} onNext={() => setAdPage((p) => p + 1)} />
          </div>
        )
      ) : tab === 'sugestoes' ? (
        suggestions.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">✅</div>
            <p className="font-semibold text-gray-700">Nenhuma sugestão pendente</p>
            <p className="text-sm text-gray-400 mt-1">Tudo em dia por aqui.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 stagger">
            {suggestions.slice(sugPage * 5, (sugPage + 1) * 5).map((s) => {
              const isActing = acting === s.id
              const date = (s as any).createdAt?.toDate?.()
              const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
              return (
                <div key={s.id} className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
                  {/* Header */}
                  <div className="bg-orange-50 px-4 py-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-orange-600 uppercase tracking-wide">Nova sugestão</p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{s.name}</p>
                      <p className="text-xs text-gray-500">📍 {s.city}, {s.state} · {s.category}</p>
                    </div>
                    {dateStr && <p className="text-xs text-gray-400 flex-shrink-0">{dateStr}</p>}
                  </div>

                  {/* Fotos */}
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

                  {/* Descrição */}
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

                  {/* Ações */}
                  <div className="px-4 py-3 flex items-center gap-2">
                    <button
                      onClick={() => handleReject(s)}
                      disabled={!!isActing}
                      className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                      {isActing ? '…' : '❌ Rejeitar'}
                    </button>
                    <button
                      onClick={() => handleApprove(s)}
                      disabled={!!isActing}
                      className="flex-[2] py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors">
                      {isActing ? 'Aprovando…' : '✅ Aprovar e publicar'}
                    </button>
                  </div>
                </div>
              )
            })}
            <Pagination page={sugPage} totalPages={Math.ceil(suggestions.length / 5)} onPrev={() => setSugPage((p) => p - 1)} onNext={() => setSugPage((p) => p + 1)} />
          </div>
        )
      ) : (
        reports.length === 0 ? (
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
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Denúncia</p>
                      {r.placeName && <p className="text-sm font-semibold text-gray-800 mt-0.5">📍 {r.placeName}</p>}
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
                        {r.reviewUserName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{r.reviewUserName}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <span key={s} className={`text-xs ${s <= r.reviewRating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                          ))}
                        </div>
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
                      {isActing ? '…' : '🗑️ Excluir review'}
                    </button>
                  </div>
                </div>
              )
            })}
            <Pagination page={repPage} totalPages={Math.ceil(reports.length / 5)} onPrev={() => setRepPage((p) => p - 1)} onNext={() => setRepPage((p) => p + 1)} />
          </div>
        )
      )}
    </div>
    </>
  )
}
