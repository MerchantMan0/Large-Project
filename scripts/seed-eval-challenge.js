/**
 * Upserts a minimal challenge so POST /challenges/Hardest-Challenge/submissions can evaluate via Lua worker.
 * Run from repo root: node scripts/seed-eval-challenge.js
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { MongoClient } = require('mongodb')
const { COLLECTION_CHALLENGES } = require('../lib/challengeSchema')

const url = process.env.MONGODB_URI
if (!url) {
  console.error('Missing MONGODB_URI')
  process.exit(1)
}

function mongoClientOptions() {
  const certFile = process.env.MONGODB_X509_CERT_FILE
  if (!certFile || !String(certFile).trim()) return {}
  const resolved = path.isAbsolute(certFile)
    ? certFile
    : path.resolve(process.cwd(), certFile)
  return {
    tlsCertificateKeyFile: resolved,
    authMechanism: 'MONGODB-X509',
    authSource: '$external',
  }
}

async function main() {
  const client = new MongoClient(url, mongoClientOptions())
  await client.connect()
  const db = client.db(process.env.MONGODB_DB || undefined)
  const coll = db.collection(COLLECTION_CHALLENGES)
  await coll.updateOne(
    { id: 'Hardest-Challenge' },
    {
      $set: {
        id: 'Hardest-Challenge',
        title: 'Hardest Challenge',
        lua_check: 'return true',
        timeout_ms: 30000,
      },
    },
    { upsert: true },
  )
  console.log('Seeded challenges.id = Hardest-Challenge (lua_check: return true)')
  await client.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
