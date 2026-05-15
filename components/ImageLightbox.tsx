'use client'

import { useEffect } from 'react'
import Image from 'next/image'

interface Props {
  src: string
  alt: string
  onClose: () => void
}

export default function ImageLightbox({ src, alt, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white text-xl font-bold hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="Fechar"
      >
        ✕
      </button>
      <div
        className="relative w-full h-full max-w-4xl max-h-[90vh] m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-contain"
          unoptimized={src.startsWith('/api/photo') || src.startsWith('https://places')}
          sizes="100vw"
        />
      </div>
      <p className="absolute bottom-4 text-white/50 text-xs">Toque fora para fechar</p>
    </div>
  )
}
