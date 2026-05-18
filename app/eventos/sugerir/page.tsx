import { redirect } from 'next/navigation'

export default function EventosSugerirPage() {
  redirect('/anunciar?tipo=evento')
}
