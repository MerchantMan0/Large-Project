const {
  interpretCheckReturn,
  DEFAULT_EVAL_TIMEOUT_MS,
  SUBMISSION_STATUS,
} = require('./challengeSchema')

function normalizeBaseUrl(url) {
  return String(url || '').replace(/\/+$/, '')
}

function signalForTimeout(timeoutMs) {
  const ms = Number(timeoutMs) > 0 ? Number(timeoutMs) : DEFAULT_EVAL_TIMEOUT_MS
  return AbortSignal.timeout(ms)
}

async function readJsonResponse(res) {
  const text = await res.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = { raw: text }
  }
  return { body, ok: res.ok, status: res.status }
}

async function spawnWorker(baseUrl, timeoutMs) {
  const res = await fetch(`${baseUrl}/workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: signalForTimeout(timeoutMs),
  })
  const { body, ok, status } = await readJsonResponse(res)
  if (!ok || !body || typeof body.id !== 'string') {
    const err = new Error(`spawn_failed_http_${status}`)
    err.detail = { http_status: status, body }
    throw err
  }
  return body.id
}

async function workerExec(baseUrl, workerId, script, timeoutMs) {
  const res = await fetch(`${baseUrl}/workers/${encodeURIComponent(workerId)}/exec`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ script }),
    signal: signalForTimeout(timeoutMs),
  })
  return readJsonResponse(res)
}

async function workerCall(baseUrl, workerId, fnName, args, timeoutMs) {
  const res = await fetch(`${baseUrl}/workers/${encodeURIComponent(workerId)}/call`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function: fnName, args: args ?? [] }),
    signal: signalForTimeout(timeoutMs),
  })
  return readJsonResponse(res)
}

async function shutdownWorker(baseUrl, workerId) {
  if (!workerId) return
  try {
    await fetch(`${baseUrl}/workers/${encodeURIComponent(workerId)}`, {
      method: 'DELETE',
      signal: AbortSignal.timeout(DEFAULT_EVAL_TIMEOUT_MS),
    })
  } catch {
    // need to add a solution on my API
  }
}

function metricsFromBody(body) {
  if (!body || typeof body !== 'object') return {}
  const out = {}
  if (typeof body.gas_remaining === 'number') out.gas = body.gas_remaining
  if (typeof body.memory_used === 'number') out.memory_bytes = body.memory_used
  return out
}

function consoleFromBody(body) {
  if (!body || !Array.isArray(body.console)) return []
  return body.console
}

function normalizeLuaReturn(ret) {
  if (Array.isArray(ret) && ret.length === 1) return ret[0]
  return ret
}

function stepFailure(phase, httpOk, body) {
  return {
    status: SUBMISSION_STATUS.ERROR,
    metrics: metricsFromBody(body),
    evaluation_detail: {
      message: 'lua_step_failed',
      phase,
      http_ok: httpOk,
      worker: body,
    },
  }
}

async function evaluateSubmission({ userSource, challenge }) {
  const baseUrl = normalizeBaseUrl(process.env.LUA_WORKER_URL)
  if (!baseUrl) {
    return {
      status: SUBMISSION_STATUS.ERROR,
      metrics: {},
      evaluation_detail: { message: 'lua_worker_url_not_configured' },
    }
  }

  const timeoutMs =
    challenge && typeof challenge.timeout_ms === 'number' && challenge.timeout_ms > 0
      ? challenge.timeout_ms
      : DEFAULT_EVAL_TIMEOUT_MS

  let workerId
  try {
    workerId = await spawnWorker(baseUrl, timeoutMs)
  } catch (e) {
    return {
      status: SUBMISSION_STATUS.ERROR,
      metrics: {},
      evaluation_detail: {
        message: 'spawn_failed',
        detail: e.detail || String(e.message || e),
      },
    }
  }

  try {
    const setup = challenge.lua_setup && String(challenge.lua_setup).trim()
    if (setup) {
      const { ok, body } = await workerExec(baseUrl, workerId, setup, timeoutMs)
      if (!ok || !body || body.status !== 'ok') {
        return stepFailure('lua_setup', ok, body)
      }
    }

    const source = String(userSource ?? '')
    let printOutput = []
    {
      const { ok, body } = await workerExec(baseUrl, workerId, source, timeoutMs)
      if (!ok || !body || body.status !== 'ok') {
        return stepFailure('user_source', ok, body)
      }
      printOutput = consoleFromBody(body)
    }

    let checkBody
    if (challenge.lua_check_call && challenge.lua_check_call.function) {
      const fn = String(challenge.lua_check_call.function)
      const args = challenge.lua_check_call.args
      const { ok, body } = await workerCall(baseUrl, workerId, fn, args, timeoutMs)
      checkBody = body
      if (!ok || !body || body.status !== 'ok') {
        return stepFailure('lua_check_call', ok, body)
      }
    } else {
      const check = String(challenge.lua_check ?? '').trim()
      const { ok, body } = await workerExec(baseUrl, workerId, check, timeoutMs)
      checkBody = body
      if (!ok || !body || body.status !== 'ok') {
        return stepFailure('lua_check', ok, body)
      }
    }

    const ret = normalizeLuaReturn(checkBody.return)
    const { pass, detail } = interpretCheckReturn(ret)
    const metrics = metricsFromBody(checkBody)

    if (pass) {
      return {
        status: SUBMISSION_STATUS.ACCEPTED,
        metrics,
        console: printOutput,
        evaluation_detail: { message: 'ok', return: checkBody.return },
      }
    }
    return {
      status: SUBMISSION_STATUS.REJECTED,
      metrics,
      console: printOutput,
      evaluation_detail: { message: 'check_failed', detail, return: checkBody.return },
    }
  } catch (e) {
    const name = e && e.name
    if (name === 'TimeoutError' || name === 'AbortError') {
      return {
        status: SUBMISSION_STATUS.ERROR,
        metrics: {},
        evaluation_detail: { message: 'timeout', detail: String(e.message || e) },
      }
    }
    return {
      status: SUBMISSION_STATUS.ERROR,
      metrics: {},
      evaluation_detail: { message: 'evaluation_exception', detail: String(e.message || e) },
    }
  } finally {
    await shutdownWorker(baseUrl, workerId)
  }
}

module.exports = {
  evaluateSubmission,
  spawnWorker,
  workerExec,
  workerCall,
  shutdownWorker,
}
