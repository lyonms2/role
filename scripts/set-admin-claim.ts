/**
 * Define o custom claim `admin: true` no usuário admin do Firebase.
 *
 * Setup:
 *   1. Firebase Console → Project Settings → Service Accounts → Generate new private key
 *   2. Salva o JSON como scripts/serviceAccountKey.json  (já no .gitignore)
 *   3. npx ts-node -e "require('./scripts/set-admin-claim.ts')"
 *      ou: npx tsx scripts/set-admin-claim.ts
 *
 * Após rodar, o usuário precisa fazer logout e login novamente para
 * que o token atualizado com o claim seja emitido.
 */

import * as admin from 'firebase-admin'
import * as path from 'path'

// eslint-disable-next-line @typescript-eslint/no-var-requires
const serviceAccount = require(path.join(__dirname, 'serviceAccountKey.json'))

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) })

const ADMIN_EMAIL = 'leonardomorenodasilva3@gmail.com'

async function run() {
  const user = await admin.auth().getUserByEmail(ADMIN_EMAIL)
  await admin.auth().setCustomUserClaims(user.uid, { admin: true })
  console.log(`✅ Custom claim admin:true definido para ${ADMIN_EMAIL} (uid: ${user.uid})`)
  console.log('   Faça logout e login novamente no app para o claim entrar em vigor.')
  process.exit(0)
}

run().catch((err) => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
