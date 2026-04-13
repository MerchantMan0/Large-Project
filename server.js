require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const { MongoClient, ObjectId } = require('mongodb')
const { processSubmissionEvaluation } = require('./lib/submissionEvaluation')
const { COLLECTION_CHALLENGES, COLLECTION_SUBMISSIONS } = require('./lib/challengeSchema')

const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')
const crypto = require('crypto')

const url = process.env.MONGODB_URI

const client = new MongoClient(url)

function mongoDb() {
  return client.db(process.env.MONGODB_DB || undefined)
}

function iso(d) {
  return d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString() : null
}

function normalizeMetrics(m) {
  const x = m && typeof m === 'object' ? m : {}
  return {
    gas: typeof x.gas === 'number' ? x.gas : 0,
    memory_bytes: typeof x.memory_bytes === 'number' ? x.memory_bytes : 0,
    lines: typeof x.lines === 'number' ? x.lines : 0,
  }
}

function submissionToApiDetail(doc) {
  return {
    id: doc._id.toHexString(),
    challenge_id: doc.challenge_id,
    user_id: doc.user_id,
    language: doc.language,
    status: doc.status,
    submitted_at: iso(doc.submitted_at),
    evaluated_at: doc.evaluated_at ? iso(doc.evaluated_at) : null,
    metrics: normalizeMetrics(doc.metrics),
    console: Array.isArray(doc.console) ? doc.console : [],
  }
}

function submissionToApiListItem(doc) {
  return {
    id: doc._id.toHexString(),
    challenge_id: doc.challenge_id,
    user_id: doc.user_id,
    display_name: doc.display_name != null ? String(doc.display_name) : 'Mockable User',
    language: doc.language,
    status: doc.status,
    submitted_at: iso(doc.submitted_at),
    metrics: normalizeMetrics(doc.metrics),
  }
}

//mailer setup
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT || '587', 10),
  secure: parseInt(process.env.SMTP_PORT || '587', 10) === 465,
  auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

async function sendVerificationEmail(toEmail, token) {
  const link = `${process.env.APP_URL}/auth/verify-email?token=${token}`
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.SMTP_USER,
    to:      toEmail,
    subject: 'Verify your email',
    html:    `<h2>Welcome to websiteName!</h2><p>Verify your email (expires in 24h):</p><a href="${link}">${link}</a>`,
    //idk what name we wanna decide on yet
  })
}
 
async function sendPasswordResetEmail(toEmail, token) {
  const link = `${process.env.APP_URL}/auth/reset-password?token=${token}`
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || process.env.SMTP_USER,
    to:      toEmail,
    subject: 'Reset your password',
    html:    `<h2>Password Reset</h2><p>Reset your password (expires in 1h):</p><a href="${link}">${link}</a>`,
  })
}

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

//should work
function requireBearer(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !String(auth).startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bearer token required' })
  }
  try {
    req.user = jwt.verify(auth.slice(7), process.env.JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

function parseListPagination(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query.page_size, 10) || 20))
  return { page, pageSize }
}

function challengeToApiListItem(doc) {
  const id = doc && doc.id != null ? String(doc.id) : ''
  if (!id) return null
  const item = {
    id,
    title: doc.title != null ? String(doc.title) : id,
    week: typeof doc.week === 'number' && Number.isFinite(doc.week) ? doc.week : 1,
    status: doc.status != null ? String(doc.status) : 'open',
  }
  return item
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

//should work
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, username } = req.body
 
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'valid email is required' })
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'password must be at least 8 characters' })
    }
 
    const users = client.db().collection('users')
    const existing = await users.findOne({ email: email.toLowerCase() })
    if (existing) {
      return res.status(409).json({ error: 'email already registered' })
    }
 
    const hashedPassword        = await bcrypt.hash(password, 12)
    const verificationToken     = crypto.randomBytes(32).toString('hex')
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
 
    const result = await users.insertOne({
      email:                   email.toLowerCase(),
      password:                hashedPassword,
      username:                username || 'new_user',
      email_verified:          false,
      verification_token:      verificationToken,
      verification_expires_at: verificationExpiresAt,
    })
 
    await sendVerificationEmail(email, verificationToken)
 
    return res.status(201).json({
      user_id: result.insertedId.toString(),
      message: 'Registered successfully. Check your email to verify your account.',
    })
  } catch (err) {
    console.error('POST /auth/register error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

//this one is new, should work
app.get('/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.query
    if (!token) return res.status(400).json({ error: 'token is required' })
 
    const users = client.db().collection('users')
    const user  = await users.findOne({ verification_token: token })
 
    if (!user)              return res.status(400).json({ error: 'Invalid or expired verification token' })
    if (user.email_verified) return res.status(200).json({ message: 'Email already verified' })
    if (new Date() > user.verification_expires_at) return res.status(400).json({ error: 'Verification token has expired' })
 
    await users.updateOne(
      { _id: user._id },
      { $set: { email_verified: true }, $unset: { verification_token: '', verification_expires_at: '' } },
    )
    return res.status(200).json({ message: 'Email verified. You can now log in.' })
  } catch (err) {
    console.error('GET /auth/verify-email error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

//should work
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' })
    }
 
    const users = client.db().collection('users')
    const user  = await users.findOne({ email: email.toLowerCase() })
 
    //prevent timing attacks or smth (idk I skimmed docu a bit)
    const dummy = '$2b$12$invalidhashfortimingprotection000000000000000000000000'
    const match = await bcrypt.compare(password, user ? user.password : dummy)
 
    if (!user || !match) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }
    if (!user.email_verified) {
      return res.status(403).json({ error: 'Email not verified. Check your inbox.' })
    }
 
    const access_token = jwt.sign(
      { id: user._id.toString(), email: user.email, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || '7d' },
    )
 
    return res.status(200).json({ access_token, token_type: 'Bearer', expires_in: 604800 })
  } catch (err) {
    console.error('POST /auth/login error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// again does not work
app.post('/auth/logout', requireBearer, async (req, res) => {
  try {
    const token = req.headers.authorization.slice(7)
    await client.db().collection('token_denylist').insertOne({
      token,
      user_id:    req.user.id,
      revoked_at: new Date(),
      expires_at: new Date(req.user.exp * 1000),
    })
    res.status(200).json({ message: 'Logged out' })
  } catch (err) {
    console.error('POST /auth/logout error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

//also new, should work
app.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'email is required' })
    const users = client.db().collection('users')
    const user  = await users.findOne({ email: email.toLowerCase() })
    if (user) {
      const resetToken     = crypto.randomBytes(32).toString('hex')
      const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000)
      await users.updateOne({ _id: user._id }, { $set: { reset_token: resetToken, reset_expires_at: resetExpiresAt } })
      await sendPasswordResetEmail(user.email, resetToken)
    }
    return res.status(200).json({ message: 'If that email exists, a reset link has been sent.' })
  } catch (err) {
    console.error('POST /auth/forgot-password error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})
 
app.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, new_password } = req.body
    if (!token || !new_password || new_password.length < 8) {
      return res.status(400).json({ error: 'token and new_password (min 8 chars) are required' })
    }
    const users = client.db().collection('users')
    const user  = await users.findOne({ reset_token: token })
    if (!user || new Date() > user.reset_expires_at) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }
    await users.updateOne(
      { _id: user._id },
      { $set: { password: await bcrypt.hash(new_password, 12) }, $unset: { reset_token: '', reset_expires_at: '' } },
    )
    return res.status(200).json({ message: 'Password reset successfully. You can now log in.' })
  } catch (err) {
    console.error('POST /auth/reset-password error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

app.get('/challenges/current', (req, res) => {
  res.status(200).json(staticChallengeDetail('Hardest-Challenge'))
})

app.get('/challenges', requireBearer, async (req, res) => {
  const { page, pageSize } = parseListPagination(req.query)
  const filter = {}
  if (req.query.week != null && String(req.query.week).trim() !== '') {
    const w = parseInt(req.query.week, 10)
    if (!Number.isNaN(w)) filter.week = w
  }
  if (req.query.status != null && String(req.query.status).trim() !== '') {
    filter.status = String(req.query.status)
  }
  const skip = (page - 1) * pageSize
  try {
    const coll = mongoDb().collection(COLLECTION_CHALLENGES)
    const [rows, total] = await Promise.all([
      coll
        .find(filter, {
          projection: { id: 1, title: 1, week: 1, status: 1 },
        })
        .sort({ id: 1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      coll.countDocuments(filter),
    ])
    const items = rows.map(challengeToApiListItem).filter(Boolean)
    res.status(200).json({
      items,
      page,
      page_size: pageSize,
      total,
    })
  } catch (e) {
    console.error(e)
    res.status(503).json({ error: 'database_unavailable' })
  }
})

app.get('/challenges/:challenge_id/leaderboard', (req, res) => {
  res.status(200).json(staticLeaderboard(req.query))
})

app.get('/challenges/:challenge_id/submissions', async (req, res) => {
  const { page, pageSize } = parseListPagination(req.query)
  const cid = req.params.challenge_id
  const skip = (page - 1) * pageSize
  try {
    const coll = mongoDb().collection(COLLECTION_SUBMISSIONS)
    const filter = { challenge_id: cid }
    const [items, total] = await Promise.all([
      coll
        .find(filter)
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      coll.countDocuments(filter),
    ])
    res.status(200).json({
      items: items.map(submissionToApiListItem),
      page,
      page_size: pageSize,
      total,
    })
  } catch (e) {
    console.error(e)
    res.status(503).json({ error: 'database_unavailable' })
  }
})

app.post('/challenges/:challenge_id/submissions', requireBearer, async (req, res) => {
  const userId = req.user && req.user.id != null ? String(req.user.id) : ''
  if (!userId) {
    return res.status(401).json({ error: 'Invalid token payload' })
  }
  const language =
    req.body && req.body.language != null
      ? String(req.body.language)
      : 'javascript'
  const source =
    req.body && req.body.source != null ? String(req.body.source) : ''
  const defaultDisplay =
    req.user && req.user.username != null && String(req.user.username).trim() !== ''
      ? String(req.user.username)
      : userId
  const displayName =
    req.body && req.body.display_name != null && req.body.display_name !== ''
      ? String(req.body.display_name)
      : defaultDisplay
  const lines = source === '' ? 1 : source.split('\n').length
  const now = new Date()
  const doc = {
    challenge_id: req.params.challenge_id,
    user_id: userId,
    display_name: displayName,
    language,
    source,
    status: 'queued',
    submitted_at: now,
    metrics: { gas: 0, memory_bytes: 0, lines },
  }
  try {
    const db = mongoDb()
    const r = await db.collection(COLLECTION_SUBMISSIONS).insertOne(doc)
    const hexId = r.insertedId.toHexString()
    const saved = await db.collection(COLLECTION_SUBMISSIONS).findOne({ _id: r.insertedId })
    setImmediate(() => {
      processSubmissionEvaluation(db, hexId).catch((err) =>
        console.error('processSubmissionEvaluation', err),
      )
    })
    res.status(200).json({
      ...submissionToApiDetail(saved),
      language,
    })
  } catch (e) {
    console.error(e)
    res.status(503).json({ error: 'database_unavailable' })
  }
})

app.get('/challenges/:challenge_id', (req, res) => {
  res.status(200).json(staticChallengeDetail(req.params.challenge_id))
})

app.get('/submissions/:submission_id', async (req, res) => {
  let oid
  try {
    oid = ObjectId.createFromHexString(req.params.submission_id)
  } catch {
    return res.status(404).json({ error: 'not_found' })
  }
  try {
    const doc = await mongoDb().collection(COLLECTION_SUBMISSIONS).findOne({ _id: oid })
    if (!doc) {
      return res.status(404).json({ error: 'not_found' })
    }
    res.status(200).json(submissionToApiDetail(doc))
  } catch (e) {
    console.error(e)
    res.status(503).json({ error: 'database_unavailable' })
  }
})

app.get('/submissions/:submission_id/source', requireBearer, async (req, res) => {
  const id = req.params.submission_id
  let oid
  try {
    oid = ObjectId.createFromHexString(id)
  } catch {
    return res.status(404).json({ error: 'not_found' })
  }
  try {
    const doc = await mongoDb().collection(COLLECTION_SUBMISSIONS).findOne({ _id: oid })
    if (!doc) {
      return res.status(404).json({ error: 'not_found' })
    }
    res.status(200).json({
      id,
      language: doc.language,
      source: doc.source != null ? String(doc.source) : '',
    })
  } catch (e) {
    console.error(e)
    res.status(503).json({ error: 'database_unavailable' })
  }
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

app.get('/users/:user_id/submissions', async (req, res) => {
  const { page, pageSize } = parseListPagination(req.query)
  const uid = req.params.user_id
  const skip = (page - 1) * pageSize
  try {
    const coll = mongoDb().collection(COLLECTION_SUBMISSIONS)
    const filter = { user_id: uid }
    const [items, total] = await Promise.all([
      coll
        .find(filter)
        .sort({ submitted_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
      coll.countDocuments(filter),
    ])
    res.status(200).json({
      items: items.map(submissionToApiListItem),
      page,
      page_size: pageSize,
      total,
    })
  } catch (e) {
    console.error(e)
    res.status(503).json({ error: 'database_unavailable' })
  }
})
async function start() {
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    
    //unique index on email
    await client.db().collection('users').createIndex({ email: 1 }, { unique: true })

    //auto delete expired denylist tokens
    await client.db().collection('token_denylist').createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 })

  } catch (e) {
    console.error('MongoDB connection failed:', e)
  }

  app.listen(5000, () => {
    console.log('Server listening on port 5000')
  })
}

start().catch(console.error)
