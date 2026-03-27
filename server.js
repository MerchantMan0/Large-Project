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

/*
app.post('/api/addcard', async (req, res, next) => {
  const { userId, card } = req.body

  const newCard = { Card: card, UserId: userId }
  var error = ''

  try {
    const db = client.db('COP4331Cards')
    await db.collection('Cards').insertOne(newCard)
  } catch (e) {
    error = e.toString()
  }

  var ret = { error: error }
  res.status(200).json(ret)
})

app.post('/api/login', async (req, res, next) => {
  var error = ''

  const { login, password } = req.body

  const db = client.db('COP4331Cards')
  const results = await db
    .collection('Users')
    .find({ Login: login, Password: password })
    .toArray()

  var id = -1
  var fn = ''
  var ln = ''

  if (results.length > 0) {
    id = results[0].UserID
    fn = results[0].FirstName
    ln = results[0].LastName
  } else {
    error = 'Invalid user name/password'
  }

  var ret = { id: id, firstName: fn, lastName: ln, error: error }
  res.status(200).json(ret)
})

app.post('/api/searchcards', async (req, res, next) => {
  var error = ''

  const { userId, search } = req.body

  var _search = search.trim()

  const db = client.db('COP4331Cards')
  const results = await db
    .collection('Cards')
    .find({ Card: { $regex: _search + '.*', $options: 'i' } })
    .toArray()

  var _ret = []
  for (var i = 0; i < results.length; i++) {
    _ret.push(results[i].Card)
  }

  var ret = { results: _ret, error: error }
  res.status(200).json(ret)
})
*/

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
