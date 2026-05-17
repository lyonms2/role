'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  photos: string[]
  startIndex?: number
  onClose: () => void
}

export default function Lightbox({ photos, startIndex = 0, onClose }: Props) {
  const [idx, setIdx] = useState(startIndex)
  const touchStartX = useRef<number | null>(null)

  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length])
  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95"
      onClick={onClose}
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return
        const diff = touchStartX.current - e.changedTouches[0].clientX
        if (Math.abs(diff) > 40) diff > 0 ? next() : prev()
        touchStartX.current = null
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white text-3xl font-bold w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 z-10"
      >×</button>

      {photos.length > 1 && (
        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-semibold bg-black/40 px-3 py-1 rounded-full">
          {idx + 1} / {photos.length}
        </span>
      )}

      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); prev() }}
          className="absolute left-3 text-white text-3xl w-11 h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40"
        >‹</button>
      )}

      <img
        src={photos[idx]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88vh] max-w-[92vw] object-contain rounded-xl shadow-2xl"
      />

      {photos.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); next() }}
          className="absolute right-3 text-white text-3xl w-11 h-11 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40"
        >›</button>
      )}
    </div>
  )
}
