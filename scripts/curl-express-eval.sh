#!/usr/bin/env bash
# Test submission evaluation through Express only (not the Lua worker port directly).
# Prereqs: npm start (port 5000), Lua worker (LUA_WORKER_URL in .env), Mongo + seed (see below).
#
#   node scripts/seed-eval-challenge.js
#   export EXPRESS_URL=http://127.0.0.1:5000
#   Optional: EVAL_LOGIN_EMAIL, EVAL_LOGIN_PASSWORD (defaults below register + log in)
#   ./scripts/curl-express-eval.sh

set -euo pipefail
EXPRESS="${EXPRESS_URL:-http://127.0.0.1:5000}"
EXPRESS="${EXPRESS%/}"

EVAL_EMAIL="${EVAL_LOGIN_EMAIL:-eval-local@example.com}"
EVAL_PASS="${EVAL_LOGIN_PASSWORD:-EvalLocalPass1}"
export EVAL_EMAIL EVAL_PASS
REG_BODY=$(python3 -c 'import json,os; print(json.dumps({"email":os.environ["EVAL_EMAIL"],"password":os.environ["EVAL_PASS"],"username":"eval-local"}))')

echo "=== POST $EXPRESS/auth/register (ok if user already exists) ==="
curl -sS -X POST "$EXPRESS/auth/register" \
  -H 'Content-Type: application/json' \
  -d "$REG_BODY"
echo ""

echo "=== POST $EXPRESS/auth/login ==="
LOGIN_BODY=$(python3 -c 'import json,os; print(json.dumps({"email":os.environ["EVAL_EMAIL"],"password":os.environ["EVAL_PASS"]}))')
LOGIN=$(curl -sS -X POST "$EXPRESS/auth/login" \
  -H 'Content-Type: application/json' \
  -d "$LOGIN_BODY")
echo "$LOGIN"
TOKEN=$(echo "$LOGIN" | python3 -c 'import sys,json;d=json.load(sys.stdin);t=d.get("access_token");
if not t:print(json.dumps(d),file=sys.stderr);sys.exit(1)
print(t)')

echo ""
echo "=== POST $EXPRESS/challenges/Hardest-Challenge/submissions (Lua, ~1000 gas) ==="
# Submission Lua: 1000 loop iterations (tune count if your VM gas model != ~1/iter).
SUB_BODY=$(python3 -c 'import json; print(json.dumps({"language":"lua","source":"local n=0;for i=1,1000 do n=n+1 end;answer=n"}))')
SUB=$(curl -sS -X POST "$EXPRESS/challenges/Hardest-Challenge/submissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "$SUB_BODY")
echo "$SUB"
SID=$(echo "$SUB" | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo ""
echo "=== GET $EXPRESS/submissions/$SID (poll until accepted / error) ==="
for i in 1 2 3 4 5 6 7 8 9 10; do
  OUT=$(curl -sS "$EXPRESS/submissions/$SID")
  echo "$OUT"
  STATUS=$(echo "$OUT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status',''))")
  if [[ "$STATUS" != "queued" && "$STATUS" != "running" ]]; then
    break
  fi
  sleep 0.4
done

echo ""
echo "=== GET $EXPRESS/submissions/$SID/source (Bearer) ==="
curl -sS "$EXPRESS/submissions/$SID/source" \
  -H "Authorization: Bearer $TOKEN"
echo ""
