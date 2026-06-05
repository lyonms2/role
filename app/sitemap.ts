import { MetadataRoute } from 'next'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'

const BASE = 'https://letsapp.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE,                     lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${BASE}/explorar`,        lastModified: now, changeFrequency: 'weekly',  priority: 0.7 },
    { url: `${BASE}/anunciar`,        lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE}/manual`,          lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]

  // Roteiros compartilhados publicamente — única rota indexável sem login
  let sharedPages: MetadataRoute.Sitemap = []
  try {
    const snap = await getDocs(query(collection(db, 'sharedRoteiros'), where('publishedToExplore', '==', true)))
    sharedPages = snap.docs.map((doc) => ({
      url: `${BASE}/ver/${doc.id}`,
      lastModified: doc.data().sharedAt?.toDate?.() ?? now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }))
  } catch {
    // Firestore indisponível no build — sitemap parcial
  }

  return [...staticPages, ...sharedPages]
}
