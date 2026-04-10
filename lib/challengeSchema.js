const COLLECTION_CHALLENGES = 'challenges'
const COLLECTION_SUBMISSIONS = 'submissions'

const DEFAULT_EVAL_TIMEOUT_MS = 15000

const SUBMISSION_STATUS = {
  QUEUED: 'queued',
  RUNNING: 'running',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  ERROR: 'error',
}

function interpretCheckReturn(ret) {
  if (ret === true) return { pass: true }
  if (Array.isArray(ret) && ret.length > 0 && ret[0] === true) return { pass: true }
  if (ret && typeof ret === 'object' && ret.pass === true) return { pass: true }
  return { pass: false, detail: ret }
}

module.exports = {
  COLLECTION_CHALLENGES,
  COLLECTION_SUBMISSIONS,
  DEFAULT_EVAL_TIMEOUT_MS,
  SUBMISSION_STATUS,
  interpretCheckReturn,
}
