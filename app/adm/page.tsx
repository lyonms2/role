'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getReports, dismissReport, deleteReviewAndReport, type ReviewReport } from '@/lib/firestore'

const ADMIN_EMAIL = 'leonardomorenodasilva3@gmail.com'

export default function AdmPage() {
  const { user, loading } = useAuth()
  const [reports, setReports] = useState<ReviewReport[]>([])
  const [fetching, setFetching] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => {
    if (!user || user.email !== ADMIN_EMAIL) return
    getReports().then(setReports).finally(() => setFetching(false))
  }, [user])

  async function handleDismiss(r: ReviewReport) {
    setActing(r.id)
    await dismissReport(r.id)
    setReports((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  async function handleDelete(r: ReviewReport) {
    setActing(r.id)
    await deleteReviewAndReport(r.id, r.reviewId, r.placeId, r.reviewRating)
    setReports((prev) => prev.filter((x) => x.id !== r.id))
    setActing(null)
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-400">Carregando…</div>
  }

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
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Painel Admin</h1>
          <p className="text-xs text-gray-400">Denúncias de avaliações</p>
        </div>
        <span className="ml-auto text-xs font-semibold bg-red-100 text-red-600 rounded-full px-3 py-1">
          {reports.length} {reports.length === 1 ? 'denúncia' : 'denúncias'}
        </span>
      </div>

      {fetching ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">✅</div>
          <p className="font-semibold text-gray-700">Nenhuma denúncia pendente</p>
          <p className="text-sm text-gray-400 mt-1">Tudo limpo por aqui.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {reports.map((r) => {
            const date = r.createdAt?.toDate?.()
            const dateStr = date
              ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
              : ''
            const isActing = acting === r.id

            return (
              <div key={r.id} className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-red-50 px-4 py-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-red-600 uppercase tracking-wide">Denúncia</p>
                    {r.placeName && (
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">📍 {r.placeName}</p>
                    )}
                    {dateStr && <p className="text-xs text-gray-400 mt-0.5">{dateStr}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-500">Denunciado por</p>
                    <p className="text-xs font-semibold text-gray-700">{r.reportedByName}</p>
                  </div>
                </div>

                {/* Conteúdo da review denunciada */}
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

                {/* Ações */}
                <div className="px-4 py-3 flex items-center gap-2">
                  <button
                    onClick={() => handleDismiss(r)}
                    disabled={!!isActing}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                  >
                    {isActing ? '…' : '✓ Ignorar denúncia'}
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={!!isActing}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {isActing ? '…' : '🗑️ Excluir review'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
