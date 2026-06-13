import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import BottomNav from '@/components/BottomNav'
import { AuthProvider } from '@/lib/auth-context'
import { RoteiroProvider } from '@/lib/roteiro-context'
import { SuggestSheetProvider } from '@/lib/suggest-context'
import SuggestSheet from '@/components/SuggestSheet'
import AuthGate from '@/components/AuthGate'

const inter = Inter({ subsets: ['latin'] })

export const viewport: Viewport = {
  themeColor: '#FF6B35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export const metadata: Metadata = {
  title: 'LetsApp — Descubra o que tem pertinho de você',
  description: 'Descubra destinos de bate-volta perto de você — reviews verificadas por GPS, roteiros completos e eventos na sua região.',
  manifest: '/manifest.json',
  metadataBase: new URL('https://letsapp.app'),
  alternates: {
    canonical: 'https://letsapp.app',
  },
  openGraph: {
    title: 'LetsApp — Descubra o que tem pertinho de você',
    description: 'Descubra destinos de bate-volta perto de você — reviews verificadas por GPS, roteiros completos e eventos na sua região.',
    url: 'https://letsapp.app',
    siteName: 'LetsApp',
    locale: 'pt_BR',
    type: 'website',
    images: [{ url: '/logo1200x630.png', width: 1200, height: 630, alt: 'LetsApp' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LetsApp',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${inter.className} h-full bg-gray-100`}>
        <AuthProvider>
          <AuthGate>
            <RoteiroProvider>
              <SuggestSheetProvider>
                <div className="max-w-2xl mx-auto bg-white h-full flex flex-col shadow-xl overflow-hidden">
                  <Navbar />
                  <main className="flex-1 overflow-y-auto min-h-0">{children}</main>
                  <BottomNav />
                </div>
                <SuggestSheet />
              </SuggestSheetProvider>
            </RoteiroProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  )
}
