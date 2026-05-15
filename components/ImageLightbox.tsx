'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

interface Props {
  photos: { url: string }[]
  initialIdx?: number
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ photos, initialIdx = 0, alt, onClose }: Props) {
  const [idx, setIdx] = useState(initialIdx)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIdx((i) => Math.min(i + 1, photos.length - 1))
      if (e.key === 'ArrowLeft') setIdx((i) => Math.max(i - 1, 0))
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, photos.length])

  const src = photos[idx]?.url

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl font-bold hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="Fechar"
      >✕</button>

      <div
        className="relative w-full h-full max-w-4xl max-h-[90vh] m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {src && (
          <Image
            key={idx}
            src={src}
            alt={alt}
            fill
            className="object-contain"
            unoptimized={src.startsWith('/api/photo') || src.startsWith('https://places')}
            sizes="100vw"
          />
        )}
      </div>

      {idx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx(idx - 1) }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 text-white text-2xl font-bold hover:bg-white/25 transition-colors"
        >‹</button>
      )}
      {idx < photos.length - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIdx(idx + 1) }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center rounded-full bg-white/15 text-white text-2xl font-bold hover:bg-white/25 transition-colors"
        >›</button>
      )}

      {photos.length > 1 && (
        <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/50 text-xs">{idx + 1} / {photos.length}</p>
      )}
    </div>
  )
}
