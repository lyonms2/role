'use client'

import { useState } from 'react'
import Pagination from './Pagination'
import type { Review } from '@/types'

const PER_PAGE = 5

interface Props {
  reviews: Review[]
}

function formatDate(ts: any): string {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ReviewList({ reviews }: Props) {
  const [page, setPage] = useState(0)
  const totalPages = Math.ceil(reviews.length / PER_PAGE)
  const visible = reviews.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  if (reviews.length === 0) {
    return (
      <p className="text-gray-400 text-sm text-center py-4">
        Ainda sem reviews. Seja o primeiro a avaliar! ⭐
      </p>
    )
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        {visible.map((r) => (
          <div key={r.id} className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-gray-800">{r.userName}</span>
                  {r.verified && (
                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                      ✅ Verificado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`text-sm ${i <= r.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                  <span className="text-xs text-gray-400 ml-1">{formatDate(r.createdAt)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {r.crowded === 'sim' ? '🔴 Cheio' : r.crowded === 'nao' ? '🟢 Vazio' : '🟡 Moderado'}
              </span>
              <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                {r.familyFriendly ? '👨‍👩‍👧 Bom pra família' : '🧑 Melhor sem crianças'}
              </span>
              {r.signal && (
                <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                  {r.signal === 'good' ? '📶 Sinal bom' : r.signal === 'weak' ? '🔅 Sinal fraco' : '🚫 Sem sinal'}
                </span>
              )}
              {r.bestTime && (
                <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full">
                  🕐 {r.bestTime}
                </span>
              )}
            </div>

            {r.text && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{r.text}</p>}
          </div>
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        onPrev={() => setPage((p) => Math.max(0, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
      />
    </div>
  )
}
