/**
 * Script de seed — importa ALL_PLACES para o Firestore como lugares aprovados.
 *
 * Setup:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Salva o JSON como scripts/serviceAccountKey.json  (já no .gitignore)
 *   3. npm run seed
 *
 * Idempotente: pula lugares que já existem (mesmo nome + cidade).
 * Escalável: batch writes de 400 por vez, sem limite de volume.
 */

import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import * as path from 'path'
import { ALL_PLACES } from '../data'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const db = admin.firestore()
const COLLECTION = 'places'
const BATCH_SIZE = 400

async function seed() {
  console.log(`\n🌱 Rolê Seed — ${ALL_PLACES.length} lugares no dataset\n`)

  // Carrega chaves existentes para não duplicar
  const snapshot = await db.collection(COLLECTION).get()
  const existingKeys = new Set(
    snapshot.docs.map((d) => `${d.data().name}__${d.data().city}`)
  )

  const toInsert = ALL_PLACES.filter(
    (p) => !existingKeys.has(`${p.name}__${p.city}`)
  )

  const skipped = ALL_PLACES.length - toInsert.length
  if (skipped > 0) console.log(`⏭  ${skipped} lugar(es) já existem — pulando`)

  if (toInsert.length === 0) {
    console.log('✅ Banco já está atualizado. Nada a inserir.')
    return
  }

  console.log(`📥 Inserindo ${toInsert.length} lugar(es)...\n`)

  let total = 0
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const chunk = toInsert.slice(i, i + BATCH_SIZE)
    const batch = db.batch()

    for (const place of chunk) {
      batch.set(db.collection(COLLECTION).doc(), {
        name: place.name,
        city: place.city,
        state: place.state,
        category: place.category,
        description: place.description,
        lat: place.lat,
        lng: place.lng,
        averageRating: 0,
        reviewCount: 0,
        verifiedReviewCount: 0,
        status: 'approved',
        suggestedBy: 'seed',
        createdAt: Timestamp.now(),
      })
    }

    await batch.commit()
    total += chunk.length
    console.log(`  ✓ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} inseridos (total: ${total})`)
  }

  console.log(`\n✅ Seed concluído — ${total} lugar(es) adicionados ao Firestore!\n`)
}

seed()
  .catch((err) => { console.error('\n❌ Erro:', err.message); process.exit(1) })
  .finally(() => process.exit(0))
