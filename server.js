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

function parseListPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size, 10) || 20))
  return { page, pageSize }
}

function staticSubmission(submissionId, challengeId = 'Hardest-Challenge') {
  return {
    id: submissionId,
    challenge_id: challengeId,
    user_id: 'usr_mocked',
    language: 'javascript',
    status: 'accepted',
    submitted_at: '9999-9-9T12:00:00.000Z',
    evaluated_at: '9999-9-9T12:00:01.000Z',
    metrics: { gas: 999, memory_bytes: 999, lines: 999 },
  }
}

function staticChallengeListItem() {
  return {
    id: 'Hardest-Challenge',
    title: 'Hardest Challenge',
    week: 1,
    status: 'open',
  }
}

/** Same shape as GET /challenges/current */
function staticChallengeDetail(challengeId) {
  return {
    id: challengeId,
    title: 'Hardest Challenge',
    description: 'Mock challenge description.',
    week: 1,
    status: 'open',
    opens_at: '9999-9-1T00:00:00.000Z',
    closes_at: '9999-9-30T23:59:59.000Z',
    timeout_ms: 30000,
  }
}

/** Same shape as GET /challenges/{challenge_id}/leaderboard */
function staticLeaderboard(query) {
  const { page, pageSize } = parseListPagination(query)
  void (query.sort === 'desc' ? 'desc' : 'asc')
  void (['gas', 'memory_bytes', 'lines'].includes(query.metric)
    ? query.metric
    : 'gas')
  return {
    items: [
      {
        rank: 1,
        submission_id: 'submission_1',
        user: { id: 'usr_mocked', display_name: 'Mockable User' },
        metrics: { gas: 1, memory_bytes: 11, lines: 111 },
        submitted_at: '9999-9-9T12:00:00.000Z',
      },
      {
        rank: 2,
        submission_id: 'submission_2',
        user: { id: 'second_usr_mocked', display_name: 'Another Mockable User' },
        metrics: { gas: 2, memory_bytes: 22, lines: 222 },
        submitted_at: '9999-9-8T12:00:00.000Z',
      },
    ],
    page,
    page_size: pageSize,
    total: 2,
  }
}

function staticChallengeSubmissionListItem(challengeId) {
  return {
    id: 'submission_1',
    challenge_id: challengeId,
    user_id: 'usr_mocked',
    display_name: 'Mockable User',
    language: 'javascript',
    status: 'accepted',
    submitted_at: '9999-9-9T12:00:00.000Z',
    metrics: { gas: 999, memory_bytes: 999, lines: 999 },
  }
}

// again does not work
app.post('/auth/register', (req, res) => {
  const displayName =
    req.body && req.body.display_name != null && req.body.display_name !== ''
      ? String(req.body.display_name)
      : 'new_user'
  void displayName
  res.status(200).json({
    user_id: 'usr_mocked',
    message: 'Registered (mock)',
  })
})

// again does not work
app.post('/auth/login', (req, res) => {
  res.status(200).json({
    access_token: 'mock_access_token',
    token_type: 'Bearer',
    expires_in: 99999,
  })
})

// again does not work
app.post('/auth/logout', requireBearer, (req, res) => {
  res.status(200).json({ message: 'Logged out' })
})

app.get('/challenges/current', (req, res) => {
  res.status(200).json(staticChallengeDetail('Hardest-Challenge'))
})

app.get('/challenges', requireBearer, (req, res) => {
  const { page, pageSize } = parseListPagination(req.query)
  void req.query.week
  void req.query.status
  res.status(200).json({
    items: [staticChallengeListItem()],
    page,
    page_size: pageSize,
    total: 1,
  })
})

app.get('/challenges/:challenge_id/leaderboard', (req, res) => {
  res.status(200).json(staticLeaderboard(req.query))
})

app.get('/challenges/:challenge_id/submissions', (req, res) => {
  const { page, pageSize } = parseListPagination(req.query)
  const cid = req.params.challenge_id
  res.status(200).json({
    items: [staticChallengeSubmissionListItem(cid)],
    page,
    page_size: pageSize,
    total: 1,
  })
})

app.post('/challenges/:challenge_id/submissions', requireBearer, (req, res) => {
  const language =
    req.body && req.body.language != null
      ? String(req.body.language)
      : 'javascript'
  res.status(200).json({
    ...staticSubmission('submission_new', req.params.challenge_id),
    language,
  })
})

app.get('/challenges/:challenge_id', (req, res) => {
  res.status(200).json(staticChallengeDetail(req.params.challenge_id))
})

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
  const { page, pageSize } = parseListPagination(req.query)
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
