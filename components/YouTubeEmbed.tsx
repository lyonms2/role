'use client'

import { useState } from 'react'
import Image from 'next/image'

const YT_REGEX = /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/

interface Props {
  videoUrl: string
  className?: string
}

export default function YouTubeEmbed({ videoUrl, className = '' }: Props) {
  const [playing, setPlaying] = useState(false)
  const id = videoUrl.match(YT_REGEX)?.[1]
  if (!id) return null

  if (playing) {
    return (
      <div className={`relative rounded-xl overflow-hidden aspect-video bg-gray-100 ${className}`}>
        <iframe
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          className="w-full h-full"
          allowFullScreen
          allow="autoplay"
          title="Vídeo da avaliação"
        />
        <button
          onClick={() => setPlaying(false)}
          className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm leading-none transition-colors z-10"
          title="Minimizar"
        >
          ✕
        </button>
      </div>
    )
  }

  return (
    <div
      className={`relative w-20 h-20 rounded-xl overflow-hidden cursor-pointer flex-shrink-0 ${className}`}
      onClick={() => setPlaying(true)}
      title="Clique para assistir"
    >
      <Image
        src={`https://img.youtube.com/vi/${id}/mqdefault.jpg`}
        alt="Vídeo"
        fill
        className="object-cover"
        unoptimized
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors">
        <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4 ml-0.5">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  )
}
