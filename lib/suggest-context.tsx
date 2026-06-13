'use client'

import { createContext, useContext, useState } from 'react'

export type SuggestType = 'local' | 'restaurante' | 'hospedagem' | 'evento'

interface SuggestSheetCtx {
  isOpen: boolean
  preType: SuggestType | null
  openSheet: (type?: SuggestType) => void
  closeSheet: () => void
}

const Ctx = createContext<SuggestSheetCtx>({
  isOpen: false,
  preType: null,
  openSheet: () => {},
  closeSheet: () => {},
})

export function SuggestSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [preType, setPreType] = useState<SuggestType | null>(null)

  return (
    <Ctx.Provider value={{
      isOpen,
      preType,
      openSheet: (type) => { setPreType(type ?? null); setIsOpen(true) },
      closeSheet: () => { setIsOpen(false); setPreType(null) },
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSuggestSheet() {
  return useContext(Ctx)
}
