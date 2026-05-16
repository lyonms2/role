'use client'

import { useState, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'
import { addReview, hasUserReviewedPlace } from '@/lib/firestore'
import { uploadToCloudinary } from '@/lib/cloudinary'

const MAX_PHOTOS = 4

interface Props {
  placeId: string
  placeName: string
  googlePlaceId?: string
  onClose: () => void
  onSubmitted?: () => void
  zIndex?: number
}

export default function WriteReviewModal({ placeId, placeName, googlePlaceId, onClose, onSubmitted, zIndex = 120 }: Props) {
  const { user } = useAuth()
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [photos, setPhotos] = useState<string[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || photos.length >= MAX_PHOTOS) return
    const idx = previews.length
    const localUrl = URL.createObjectURL(file)
    setPreviews((p) => [...p, localUrl])
    setUploadingIdx(idx)
    setUploadProgress(0)
    try {
      const url = await uploadToCloudinary(file, setUploadProgress)
      setPhotos((p) => [...p, url])
    } catch {
      setPreviews((p) => p.filter((_, i) => i !== idx))
      setError('Falha no upload da foto. Tente novamente.')
    } finally {
      setUploadingIdx(null)
      setUploadProgress(0)
    }
  }

  function removePhoto(idx: number) {
    setPreviews((p) => p.filter((_, i) => i !== idx))
    setPhotos((p) => p.filter((_, i) => i !== idx))
  }

  async function handleSubmit() {
    if (!user) { setError('Você precisa estar logado para avaliar.'); return }
    if (rating === 0) { setError('Selecione uma nota de 1 a 5 estrelas.'); return }
    if (!text.trim()) { setError('Conte sua experiência antes de enviar.'); return }
    if (uploadingIdx !== null) { setError('Aguarde o upload da foto terminar.'); return }

    setSubmitting(true)
    setError(null)
    try {
      const already = await hasUserReviewedPlace(user.uid, placeId)
      if (already) { setError('Você já avaliou este local.'); setSubmitting(false); return }

      await addReview({
        placeId,
        userId: user.uid,
        userName: user.displayName ?? 'Anônimo',
        userPhoto: user.photoURL ?? undefined,
        rating,
        text: text.trim() || undefined,
        photos: photos.length ? photos : undefined,
        crowded: 'moderado',
        familyFriendly: true,
        verified: false,
        userLat: 0,
        userLng: 0,
        placeName,
        googlePlaceId,
      })
      setDone(true)
      onSubmitted?.()
    } catch {
      setError('Erro ao salvar avaliação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 flex flex-col justify-end bg-black/60" style={{ zIndex }} onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl flex flex-col"
        style={{ maxHeight: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <div>
            <h3 className="font-bold text-gray-900">Avaliar local</h3>
            <p className="text-xs text-gray-400 truncate max-w-[260px]">{placeName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-5 flex flex-col gap-5">
          {done ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <span className="text-5xl">🎉</span>
              <p className="font-bold text-gray-900">Avaliação enviada!</p>
              <p className="text-sm text-gray-500">Obrigado por contribuir com a comunidade.</p>
              <button onClick={onClose} className="mt-2 px-6 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm">Fechar</button>
            </div>
          ) : (
            <>
              {/* Estrelas */}
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm font-semibold text-gray-700">Qual a sua nota?</p>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onMouseEnter={() => setHovered(s)}
                      onMouseLeave={() => setHovered(0)}
                      onClick={() => setRating(s)}
                      className="text-4xl transition-transform hover:scale-110 active:scale-95"
                    >
                      <span className={(hovered || rating) >= s ? 'text-yellow-400' : 'text-gray-200'}>★</span>
                    </button>
                  ))}
                </div>
                {rating > 0 && (
                  <p className="text-xs text-gray-400">{['', 'Péssimo', 'Ruim', 'Regular', 'Bom', 'Ótimo!'][rating]}</p>
                )}
              </div>

              {/* Texto */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-gray-700">Conte sua experiência <span className="text-red-500">*</span></label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="O que achou do lugar? Dicas para quem vai visitar..."
                  rows={4}
                  maxLength={500}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:border-orange-400"
                />
                <p className="text-xs text-gray-300 text-right">{text.length}/500</p>
              </div>

              {/* Fotos */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700">Fotos <span className="text-xs font-normal text-gray-400">(opcional · até {MAX_PHOTOS})</span></label>
                  <span className="text-xs text-gray-400">{photos.length}/{MAX_PHOTOS}</span>
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
                <div className="grid grid-cols-4 gap-2">
                  {previews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      {uploadingIdx === idx ? (
                        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                          <div className="w-3/4 h-1 bg-white/30 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 transition-all" style={{ width: `${uploadProgress}%` }} />
                          </div>
                          <span className="text-white text-[10px]">{uploadProgress}%</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removePhoto(idx)}
                          className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]"
                        >✕</button>
                      )}
                    </div>
                  ))}
                  {previews.length < MAX_PHOTOS && uploadingIdx === null && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors"
                    >
                      <span className="text-xl">📷</span>
                      <span className="text-[10px]">Adicionar</span>
                    </button>
                  )}
                </div>
              </div>

              {error && <p className="text-xs text-red-500 text-center">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0 || uploadingIdx !== null}
                className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #f97316 100%)' }}
              >
                {submitting ? 'Enviando…' : '⭐ Enviar avaliação'}
              </button>

              <div className="h-2" />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
