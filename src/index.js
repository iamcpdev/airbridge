const env = process.env.NODE_ENV || 'development'
if (env === 'development') {
  require('dotenv').config()
}
if (!process.env.AIRTABLE_API_KEY) {
  throw 'Missing AIRTABLE_API_KEY from environmental variables'
}

import { airtableLookup } from './utils'
import express from 'express'
import redis from 'redis'
import apicache from 'apicache'

let cacheWithRedis
if (process.env.REDIS_URL) {
  const redisClient = redis.createClient(process.env.REDIS_URL)
  cacheWithRedis = apicache.options({
    redisClient,
    statusCodes: { include: [200, 304] },
    headers: {
      'cache-control': 'no-cache',
    },
  }).middleware
} else {
  console.log('No REDIS_URL env variable found, skipping caching!')
}

const app = express()

app.get('/ping', (req, res) => {
  res.status(200).json({ message: 'pong!' })
})

app.get('/:version/:base/:tableName?/:recordID?', async(req, res, next) => {
  /*
    version: api version to use. Before version 1.0 this isn't being checked– go ahead and put a 0 there
    base: Either base ID ("apptEEFG5HTfGQE7h") or base name ("Operations")
    tableName: Required if no recordID is provided. ex "Clubs"
    recordID: Required if no tableName is provided. ex "rec02xw3TpmHOj7CA"
  */
  try {
    const results = await airtableLookup(req.params)
    res.json(results)
  } catch (err) {
    console.error(err)
    res.status(500).json(err)
  }
})

const server = app.listen(process.env.PORT || 5000, () =>
  console.log(`Up and listening on ${server.address().port}`)
)
