'use client'

import { createContext, useContext, useEffect, useReducer } from 'react'

export interface DestinationSnap {
  id: string
  name: string
  city: string
  state: string
  lat: number
  lng: number
  photoUrl?: string
  category?: string
  source: 'firestore' | 'external'
  googlePlaceId?: string
}

export interface EventSnap {
  id: string
  name: string
  city: string
  venue: string
  date: any
  category: string
  photoUrl?: string
  mapsLink?: string
}

export interface EatSnap {
  id: string
  name: string
  city: string
  category: string
  priceRange: string
  googlePlaceId?: string
  address?: string
  photoUrl?: string
  lat?: number
  lng?: number
}

export interface StaySnap {
  id: string
  name: string
  city: string
  category: string
  priceFrom?: number
  bookingUrl?: string
  googlePlaceId?: string
  address?: string
  photoUrl?: string
  lat?: number
  lng?: number
}

interface RoteiroState {
  destination: DestinationSnap | null
  events: EventSnap[]
  eats: EatSnap[]
  stays: StaySnap[]
}

type Action =
  | { type: 'SET_DESTINATION'; payload: DestinationSnap }
  | { type: 'TOGGLE_EVENT'; payload: EventSnap }
  | { type: 'TOGGLE_EAT'; payload: EatSnap }
  | { type: 'TOGGLE_STAY'; payload: StaySnap }
  | { type: 'CLEAR' }
  | { type: 'LOAD'; payload: RoteiroState }

const INITIAL: RoteiroState = { destination: null, events: [], eats: [], stays: [] }

function reducer(state: RoteiroState, action: Action): RoteiroState {
  switch (action.type) {
    case 'SET_DESTINATION': {
      const same = state.destination?.id === action.payload.id
      if (same) return { ...state, destination: action.payload }
      if (!state.destination) return { ...state, destination: action.payload }
      return { destination: action.payload, events: [], eats: [], stays: [] }
    }
    case 'TOGGLE_EVENT': {
      const has = state.events.some((e) => e.id === action.payload.id)
      return { ...state, events: has ? state.events.filter((e) => e.id !== action.payload.id) : [...state.events, action.payload] }
    }
    case 'TOGGLE_EAT': {
      const has = state.eats.some((e) => e.id === action.payload.id)
      return { ...state, eats: has ? state.eats.filter((e) => e.id !== action.payload.id) : [...state.eats, action.payload] }
    }
    case 'TOGGLE_STAY': {
      const has = state.stays.some((s) => s.id === action.payload.id)
      return { ...state, stays: has ? state.stays.filter((s) => s.id !== action.payload.id) : [...state.stays, action.payload] }
    }
    case 'CLEAR':
      return INITIAL
    case 'LOAD':
      return action.payload
    default:
      return state
  }
}

interface RoteiroCtx extends RoteiroState {
  setDestination: (d: DestinationSnap) => void
  toggleEvent: (e: EventSnap) => void
  toggleEat: (e: EatSnap) => void
  toggleStay: (s: StaySnap) => void
  hasEvent: (id: string) => boolean
  hasEat: (id: string) => boolean
  hasStay: (id: string) => boolean
  clearRoteiro: () => void
  itemCount: number
}

const Ctx = createContext<RoteiroCtx>({} as RoteiroCtx)
const KEY = 'role_roteiro_v1'

export function RoteiroProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) dispatch({ type: 'LOAD', payload: JSON.parse(raw) })
    } catch {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch {}
  }, [state])

  const itemCount = state.events.length + state.eats.length + state.stays.length

  return (
    <Ctx.Provider value={{
      ...state,
      setDestination: (d) => dispatch({ type: 'SET_DESTINATION', payload: d }),
      toggleEvent: (e) => dispatch({ type: 'TOGGLE_EVENT', payload: e }),
      toggleEat: (e) => dispatch({ type: 'TOGGLE_EAT', payload: e }),
      toggleStay: (s) => dispatch({ type: 'TOGGLE_STAY', payload: s }),
      hasEvent: (id) => state.events.some((e) => e.id === id),
      hasEat: (id) => state.eats.some((e) => e.id === id),
      hasStay: (id) => state.stays.some((s) => s.id === id),
      clearRoteiro: () => dispatch({ type: 'CLEAR' }),
      itemCount,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useRoteiro() { return useContext(Ctx) }
