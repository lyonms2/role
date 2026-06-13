'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useFavorites, type FavoriteInput } from '@/lib/favorites-context'

interface Props {
  item: FavoriteInput
  className?: string
}

export default function FavoriteButton({ item, className = '' }: Props) {
  const { user } = useAuth()
  const { isFavorited, toggleFavorite } = useFavorites()
  const router = useRouter()
  const saved = isFavorited(item.originalId)

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!user) {
      router.push('/entrar')
      return
    }
    await toggleFavorite(item)
  }

  return (
    <button
      onClick={handleClick}
      className={`flex items-center justify-center w-8 h-8 rounded-full shadow transition-all active:scale-90 ${
        saved ? 'bg-red-500 text-white' : 'bg-white/80 backdrop-blur-sm text-gray-400 hover:text-red-400'
      } ${className}`}
      aria-label={saved ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
    >
      <span className="text-base leading-none">{saved ? '♥' : '♡'}</span>
    </button>
  )
}
