'use client'

import { useState } from 'react'
import { likeTip } from '@/lib/firestore'
import type { Tip } from '@/types'

interface Props {
  tip: Tip
}

export default function TipCard({ tip }: Props) {
  const [likes, setLikes] = useState(tip.likes)
  const [liked, setLiked] = useState(false)

  async function handleLike() {
    if (liked) return
    await likeTip(tip.id)
    setLikes((l) => l + 1)
    setLiked(true)
  }

  return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
      <p className="text-sm text-gray-800 leading-relaxed">💡 {tip.text}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-gray-400">por {tip.userName}</span>
        <button
          onClick={handleLike}
          disabled={liked}
          className={`flex items-center gap-1 text-xs transition-colors ${
            liked ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
          }`}
        >
          ❤️ {likes}
        </button>
      </div>
    </div>
  )
}
