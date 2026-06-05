'use client'

import { useState } from 'react'
import Image from 'next/image'
import Pagination from './Pagination'
import Lightbox from './Lightbox'
import { deleteReview, reportReview } from '@/lib/firestore'
import { auth } from '@/lib/firebase'
import { getOptimizedUrl } from '@/lib/cloudinary'
import type { Review } from '@/types'
import { getDifficultyLevel } from '@/lib/difficulty'

const PER_PAGE = 5

interface Props {
  reviews: Review[]
  currentUserId?: string
  placeId: string
  placeName?: string
  onDelete?: (reviewId: string) => void
  onDeleteOwn?: () => void
}

function formatDate(ts: any): string {
  if (!ts) return ''
  const date = ts.toDate ? ts.toDate() : new Date(ts)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ReviewCard({
  review,
  currentUserId,
  placeId,
  placeName,
  onDelete,
  onDeleteOwn,
}: {
  review: Review
  currentUserId?: string
  placeId: string
  placeName?: string
  onDelete?: (id: string) => void
  onDeleteOwn?: () => void
}) {
  const [delState, setDelState] = useState<'idle' | 'confirm' | 'deleting'>('idle')
  const [repState, setRepState] = useState<'idle' | 'confirm' | 'reporting' | 'done'>('idle')
  const [lightbox, setLightbox] = useState<number | null>(null)

  const isOwner = !!currentUserId && currentUserId === review.userId
  const canReport = !!currentUserId && currentUserId !== review.userId

  async function handleDelete() {
    if (delState === 'idle') { setDelState('confirm'); return }
    setDelState('deleting')
    await deleteReview(review.id, placeId, review.rating, review.photos, review.verified, review.difficulty)
    onDelete?.(review.id)
    if (isOwner) onDeleteOwn?.()
  }

  async function handleReport() {
    if (repState === 'idle') { setRepState('confirm'); return }
    setRepState('reporting')
    await reportReview({
      reviewId: review.id,
      placeId,
      reviewUserId: review.userId,
      reviewUserName: review.userName,
      reviewText: review.text,
      reviewRating: review.rating,
      placeName,
      reportedBy: currentUserId!,
      reportedByName: auth.currentUser?.displayName || 'usuário',
    })
    setRepState('done')
  }

  const photos = review.photos ?? []

  return (
    <>
      {lightbox !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}

      <div className="border border-gray-100 rounded-xl p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {review.userPhoto ? (
              <Image src={review.userPhoto} alt={review.userName} width={32} height={32} className="rounded-full object-cover flex-shrink-0" unoptimized />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs font-bold flex-shrink-0">
                {review.userName[0]?.toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-gray-800 truncate">{review.userName}</span>
                {review.reviewerRank && <span className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0">{review.reviewerRank}</span>}
                {review.verified && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                    ✅ Verificado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <span key={i} className={`text-sm ${i <= review.rating ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                ))}
                <span className="text-xs text-gray-400 ml-1">{formatDate(review.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex-shrink-0 flex items-center gap-1">
            {isOwner && (
              delState === 'confirm' ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleDelete}
                    className="text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-1 rounded-lg"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setDelState('idle')}
                    className="text-xs text-gray-400 px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleDelete}
                  disabled={delState === 'deleting'}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1 py-1"
                  title="Excluir"
                >
                  🗑️
                </button>
              )
            )}
            {canReport && (
              repState === 'done' ? (
                <span className="text-xs text-gray-400">Denunciado ✓</span>
              ) : repState === 'confirm' ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleReport}
                    className="text-xs font-bold text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded-lg"
                  >
                    Confirmar
                  </button>
                  <button
                    onClick={() => setRepState('idle')}
                    className="text-xs text-gray-400 px-1"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleReport}
                  className="text-xs text-gray-400 hover:text-orange-500 transition-colors px-1 py-1"
                  title="Denunciar"
                >
                  🚩
                </button>
              )
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
          {review.difficulty && (() => {
            const d = getDifficultyLevel(review.difficulty)
            return (
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${d.bg} ${d.color}`}>
                {d.emoji} {d.label}
              </span>
            )
          })()}
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
            {review.crowded === 'sim' ? '🔴 Cheio' : review.crowded === 'nao' ? '🟢 Vazio' : '🟡 Moderado'}
          </span>
          <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
            {review.familyFriendly ? '👨‍👩‍👧 Bom pra família' : '🧑 Melhor sem crianças'}
          </span>
          {review.signal && (
            <span className="bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
              {review.signal === 'good' ? '📶 Sinal bom' : review.signal === 'weak' ? '🔅 Sinal fraco' : '🚫 Sem sinal'}
            </span>
          )}
          {review.bestTime && (
            <span className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full">
              🕐 {review.bestTime}
            </span>
          )}
        </div>

        {review.text && <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.text}</p>}

        {photos.length > 0 && (
          <div className="flex gap-2 mt-3 flex-wrap">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => setLightbox(i)}
                className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 cursor-zoom-in"
              >
                <Image src={getOptimizedUrl(url, 200)} alt="" fill className="object-cover" unoptimized />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

export default function ReviewList({ reviews, currentUserId, placeId, placeName, onDelete, onDeleteOwn }: Props) {
  const [page, setPage] = useState(0)
  const [localReviews, setLocalReviews] = useState(reviews)
  const totalPages = Math.ceil(localReviews.length / PER_PAGE)
  const visible = localReviews.slice(page * PER_PAGE, (page + 1) * PER_PAGE)

  function handleDelete(id: string) {
    setLocalReviews((prev) => prev.filter((r) => r.id !== id))
    onDelete?.(id)
  }

  if (localReviews.length === 0) {
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
          <ReviewCard
            key={r.id}
            review={r}
            currentUserId={currentUserId}
            placeId={placeId}
            placeName={placeName}
            onDelete={handleDelete}
            onDeleteOwn={onDeleteOwn}
          />
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
