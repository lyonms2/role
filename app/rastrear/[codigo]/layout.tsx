import type { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ codigo: string }>
}): Promise<Metadata> {
  const { codigo } = await params
  const code = codigo.toUpperCase()
  const title = `📡 Convite para rastrear grupo — LetsApp`
  const description = `Você foi convidado para acompanhar a localização do grupo em tempo real. Código: ${code}. Toque para entrar.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://letsapp.app/rastrear/${code}`,
      siteName: 'LetsApp',
      locale: 'pt_BR',
      type: 'website',
    },
  }
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
