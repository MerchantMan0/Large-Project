const {
  Config,
  formatCode,
  LuaVersion,
  OutputVerification,
} = require('@johnnymorganz/stylua')

function formatWithStylua(code) {
  const text = String(code ?? '')
  const cfg = Config.new()
  try {
    cfg.syntax = LuaVersion.All
    return formatCode(text, cfg, null, OutputVerification.None)
  } catch {
    return text
  }
}

/** @param {string} s @param {number} start first `[` of `[=*[` */
function matchLongBracketOpen(s, start) {
  if (start >= s.length || s[start] !== '[') return null
  let j = start + 1
  let eq = 0
  while (j < s.length && s[j] === '=') {
    eq++
    j++
  }
  if (j >= s.length || s[j] !== '[') return null
  return { eqCount: eq, contentStart: j + 1 }
}

/** @returns index of last `]` in closing delimiter, or -1 */
function findLongBracketClose(s, from, eqCount) {
  const close = ']'.concat('='.repeat(eqCount), ']')
  const idx = s.indexOf(close, from)
  return idx === -1 ? -1 : idx + close.length - 1
}

function isLineEnd(s, i) {
  return i < s.length && (s[i] === '\n' || s[i] === '\r')
}

/**
 * Removes Lua comments while preserving string literals (short and long).
 */
function stripLuaComments(source) {
  const s = String(source)
  const out = []
  let i = 0
  const n = s.length

  while (i < n) {
    const ch = s[i]

    if (ch === '-' && i + 1 < n && s[i + 1] === '-') {
      if (i + 2 < n && s[i + 2] === '[') {
        const lb = matchLongBracketOpen(s, i + 2)
        if (lb) {
          const closeIdx = findLongBracketClose(s, lb.contentStart, lb.eqCount)
          if (closeIdx !== -1) {
            i = closeIdx + 1
            continue
          }
        }
      }
      while (i < n && !isLineEnd(s, i)) i++
      continue
    }

    if (ch === "'" || ch === '"') {
      const quote = ch
      out.push(quote)
      i++
      while (i < n) {
        if (s[i] === '\\' && i + 1 < n) {
          out.push(s[i], s[i + 1])
          i += 2
          continue
        }
        if (s[i] === quote) {
          out.push(quote)
          i++
          break
        }
        out.push(s[i])
        i++
      }
      continue
    }

    if (ch === '[') {
      const lb = matchLongBracketOpen(s, i)
      if (lb) {
        const closeIdx = findLongBracketClose(s, lb.contentStart, lb.eqCount)
        if (closeIdx !== -1) {
          out.push(s.slice(i, closeIdx + 1))
          i = closeIdx + 1
          continue
        }
      }
    }

    out.push(ch)
    i++
  }

  return out.join('')
}

function stripBlankLines(code) {
  return String(code)
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .join('\n')
}

function prepareLuaSourceForEvaluation(raw) {
  const formatted = formatWithStylua(raw)
  const withoutComments = stripLuaComments(formatted)
  return stripBlankLines(withoutComments)
}

module.exports = {
  prepareLuaSourceForEvaluation,
  formatWithStylua,
  stripLuaComments,
  stripBlankLines,
}
