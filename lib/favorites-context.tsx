'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Timestamp } from 'firebase/firestore'
import { useAuth } from './auth-context'
import { getFavorites, addFavorite, removeFavorite, type FavoriteItem } from './firestore'

export type FavoriteInput = Omit<FavoriteItem, 'id' | 'savedAt'>

interface FavoritesCtx {
  favorites: FavoriteItem[]
  isFavorited: (originalId: string) => boolean
  toggleFavorite: (item: FavoriteInput) => Promise<void>
  loading: boolean
}

const Ctx = createContext<FavoritesCtx>({
  favorites: [],
  isFavorited: () => false,
  toggleFavorite: async () => {},
  loading: false,
})

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { setFavorites([]); return }
    setLoading(true)
    getFavorites(user.uid).then((data) => {
      setFavorites(data)
      setLoading(false)
    })
  }, [user?.uid])

  const isFavorited = useCallback(
    (originalId: string) => favorites.some((f) => f.originalId === originalId),
    [favorites]
  )

  const toggleFavorite = useCallback(async (item: FavoriteInput) => {
    if (!user) return
    const existing = favorites.find((f) => f.originalId === item.originalId)
    if (existing) {
      await removeFavorite(user.uid, existing.id)
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id))
    } else {
      const id = await addFavorite(user.uid, item)
      setFavorites((prev) => [{ ...item, id, savedAt: Timestamp.now() }, ...prev])
    }
  }, [user, favorites])

  return (
    <Ctx.Provider value={{ favorites, isFavorited, toggleFavorite, loading }}>
      {children}
    </Ctx.Provider>
  )
}

export function useFavorites() {
  return useContext(Ctx)
}
