require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { MongoClient } = require('mongodb')

const url =
  process.env.MONGODB_URI

const client = new MongoClient(url)

const app = express()
app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  )
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PATCH, DELETE, OPTIONS',
  )
  next()
})

function requireBearer(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !String(auth).startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bearer token required' })
  }
  next()
}

function staticSubmission(submissionId) {
  return {
    id: submissionId,
    challenge_id: 'Hardest-Challenge',
    user_id: 'usr_mocked',
    display_name: 'Mockable User',
    language: 'javascript',
    status: 'accepted',
    submitted_at: '9999-9-9T12:00:00.000Z',
    metrics: { gas: 999, memory_bytes: 999, lines: 999 },
  }
}

function staticLeaderboard(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size, 10) || 20))
  const sort = query.sort === 'desc' ? 'desc' : 'asc'
  const metric = ['gas', 'memory_bytes', 'lines'].includes(query.metric)
    ? query.metric
    : 'gas'
  return {
    items: [
      {
        rank: 1,
        user_id: 'usr_mocked',
        display_name: 'Mockable User',
        metrics: { gas: 1, memory_bytes: 11, lines: 111 },
      },
      {
        rank: 2,
        user_id: 'second_usr_mocked',
        display_name: 'Another Mockable User',
        metrics: { gas: 2, memory_bytes: 22, lines: 222 },
      },
    ],
    page,
    page_size: pageSize,
    total: 2,
    sort,
    metric,
  }
}

app.get('/submissions/:submission_id', (req, res) => {
  res.status(200).json(staticSubmission(req.params.submission_id))
})

app.get('/submissions/:submission_id/source', requireBearer, (req, res) => {
  const id = req.params.submission_id
  // if this was a live challenge, we would omit the source but I am a lazy sob
  res.status(200).json({
    id,
    language: 'javascript',
    source: 'function solve(input) {\n  return input;\n}\n',
  })
})

app.get('/leaderboard/global', (req, res) => {
  res.status(200).json(staticLeaderboard(req.query))
})

app.get('/users/me', requireBearer, (req, res) => {
  res.status(200).json({
    id: 'usr_me',
    display_name: 'Mock Me',
    stats: { submissions: 9, accepted: 99, challenges_solved: 999 },
  })
})

app.get('/users/:user_id', (req, res) => {
  res.status(200).json({
    id: req.params.user_id,
    display_name: 'Mock User',
    stats: { submissions: 8, accepted: 88, challenges_solved: 888 },
  })
})

app.get('/users/:user_id/submissions', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(req.query.page_size, 10) || 20))
  res.status(200).json({
    items: [
      {
        id: 'submission_1',
        challenge_id: 'Hardest-Challenge',
        user_id: req.params.user_id,
        display_name: 'Mockable User',
        language: 'javascript',
        status: 'accepted',
        submitted_at: '9999-9-9T12:00:00.000Z',
        metrics: { gas: 999, memory_bytes: 999, lines: 999 },
      },
    ],
    page,
    page_size: pageSize,
    total: 1,
  })
})
async function start() {
  try {
    await client.connect()
    console.log('Connected to MongoDB')
  } catch (e) {
    console.error('MongoDB connection failed:', e)
  }

  app.listen(5000, () => {
    console.log('Server listening on port 5000')
  })
}

start().catch(console.error)
