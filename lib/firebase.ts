import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getStorage } from 'firebase/storage'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]

export const db = getFirestore(app)

// getAuth valida a API key imediatamente e lança no build sem env vars.
// Auth só é usado em componentes client ('use client'), então o guard é seguro.
export const auth = typeof window !== 'undefined' ? getAuth(app) : (null as unknown as ReturnType<typeof getAuth>)
export const storage = typeof window !== 'undefined' ? getStorage(app) : (null as unknown as ReturnType<typeof getStorage>)
export const rtdb = typeof window !== 'undefined' ? getDatabase(app) : (null as unknown as ReturnType<typeof getDatabase>)
export const googleProvider = new GoogleAuthProvider()
