const { ObjectId } = require('mongodb')
const { evaluateSubmission } = require('./evaluateSubmission')
const { luaLineCountForMetrics } = require('./prepareLuaForEval')
const {
  COLLECTION_CHALLENGES,
  COLLECTION_SUBMISSIONS,
  SUBMISSION_STATUS,
} = require('./challengeSchema')

async function processSubmissionEvaluation(db, submissionHexId) {
  const coll = db.collection(COLLECTION_SUBMISSIONS)
  const challenges = db.collection(COLLECTION_CHALLENGES)
  let oid
  try {
    oid = ObjectId.createFromHexString(submissionHexId)
  } catch {
    return
  }
  const sub = await coll.findOne({ _id: oid })
  if (!sub || sub.status !== SUBMISSION_STATUS.QUEUED) return

  await coll.updateOne({ _id: oid }, { $set: { status: SUBMISSION_STATUS.RUNNING } })

  const challenge = await challenges.findOne({ id: sub.challenge_id })
  if (!challenge) {
    await coll.updateOne(
      { _id: oid },
      {
        $set: {
          status: SUBMISSION_STATUS.ERROR,
          evaluated_at: new Date(),
          evaluation_detail: { message: 'challenge_not_found' },
        },
      },
    )
    return
  }

  const hasLua =
    (challenge.lua_check && String(challenge.lua_check).trim()) ||
    (challenge.lua_check_call && challenge.lua_check_call.function)

  if (!hasLua) {
    await coll.updateOne(
      { _id: oid },
      {
        $set: {
          status: SUBMISSION_STATUS.ERROR,
          evaluated_at: new Date(),
          evaluation_detail: { message: 'challenge_not_configured' },
        },
      },
    )
    return
  }

  if (String(sub.language) !== 'lua') {
    await coll.updateOne(
      { _id: oid },
      {
        $set: {
          status: SUBMISSION_STATUS.ERROR,
          evaluated_at: new Date(),
          evaluation_detail: { message: 'lua_required' },
        },
      },
    )
    return
  }

  const result = await evaluateSubmission({
    userSource: sub.source,
    challenge,
  })

  const mergedMetrics = { ...(sub.metrics || {}), ...(result.metrics || {}) }
  mergedMetrics.lines = luaLineCountForMetrics(sub.source)

  await coll.updateOne(
    { _id: oid },
    {
      $set: {
        status: result.status,
        evaluated_at: new Date(),
        metrics: mergedMetrics,
        console: Array.isArray(result.console) ? result.console : [],
        evaluation_detail: result.evaluation_detail,
      },
    },
  )
}

module.exports = { processSubmissionEvaluation }
