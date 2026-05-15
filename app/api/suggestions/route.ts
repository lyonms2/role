import { NextRequest, NextResponse } from 'next/server'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, city, state, category, description, mapsLink, photos, videoUrl, suggestedBy } = body

    if (!name || !city || !state || !category || !description || !suggestedBy) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    if (description.length < 50) {
      return NextResponse.json({ error: 'Descrição deve ter no mínimo 50 caracteres' }, { status: 400 })
    }

    const ref = await addDoc(collection(db, 'suggestions'), {
      name,
      city,
      state,
      category,
      description,
      mapsLink: mapsLink || null,
      photos: photos?.length ? photos : null,
      videoUrl: videoUrl || null,
      suggestedBy,
      status: 'pending',
      createdAt: serverTimestamp(),
    })

    return NextResponse.json({ id: ref.id })
  } catch (err) {
    return NextResponse.json({ error: 'Erro ao salvar sugestão' }, { status: 500 })
  }
}
