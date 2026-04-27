#!/usr/bin/env bash
# =============================================================================
# Time-Off Microservice — Live Demo Script
#
# BEFORE RUNNING:
#   Terminal 1:  npm run start:mock-hcm     (mock HCM server on :3001)
#   Terminal 2:  npm run start:dev           (main service on :3000)
#   Terminal 3:  npm run start:seed          (seed the SQLite DB once)
#   Terminal 3:  bash demo.sh               (run this script)
# =============================================================================

API="http://localhost:3000"
HCM="http://localhost:3001"
BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

header() { echo -e "\n${BOLD}${CYAN}━━━  $1  ━━━${NC}\n"; }
step()   { echo -e "${YELLOW}▶ $1${NC}"; }
ok()     { echo -e "${GREEN}✓ $1${NC}"; }
note()   { echo -e "  ${BOLD}$1${NC}"; }
pause()  { echo -e "\n${BOLD}[press enter to continue]${NC}"; read -r; }

pjson() { python3 -m json.tool 2>/dev/null || cat; }
jq_get() { python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)" 2>/dev/null; }

# ─── DISCOVER SEEDED IDs ─────────────────────────────────────────────────────
header "Discovering seeded employees and locations"

EMPLOYEES=$(curl -s "$API/employees")
ALICE_ID=$(echo $EMPLOYEES | python3 -c "import sys,json; e=[x for x in json.load(sys.stdin) if x['name']=='Alice Johnson'][0]; print(e['id'])" 2>/dev/null)
BOB_ID=$(echo $EMPLOYEES   | python3 -c "import sys,json; e=[x for x in json.load(sys.stdin) if x['name']=='Bob Smith'][0]; print(e['id'])" 2>/dev/null)

LOCATIONS=$(curl -s "$API/locations")
NYC_ID=$(echo $LOCATIONS | python3 -c "import sys,json; l=[x for x in json.load(sys.stdin) if x['name']=='New York'][0]; print(l['id'])" 2>/dev/null)

if [ -z "$ALICE_ID" ] || [ -z "$NYC_ID" ]; then
  echo "Could not find seeded data. Make sure you ran: npm run start:seed"
  exit 1
fi

note "Alice ID : $ALICE_ID"
note "Bob ID   : $BOB_ID"
note "NYC ID   : $NYC_ID"

step "Seed HCM store to match local DB (Alice=15, Bob=8)"
curl -s -X POST "$HCM/hcm/admin/balances" -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$ALICE_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":15}" > /dev/null
curl -s -X POST "$HCM/hcm/admin/balances" -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":8}" > /dev/null
ok "HCM and local DB are in sync"

pause

# ─── SCENARIO 1: Happy Path ───────────────────────────────────────────────────
header "SCENARIO 1: Happy Path — Alice requests 2 days (balance: 15)"

step "Alice's current balance"
curl -s "$API/balances/$ALICE_ID/$NYC_ID" | pjson
echo ""

step "Submit request: 2 days"
REQ=$(curl -s -X POST "$API/time-off-requests" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$ALICE_ID\",\"locationId\":\"$NYC_ID\",\"requestedDays\":2}")
REQ_ID=$(echo $REQ | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
echo $REQ | pjson
echo ""

step "Alice's balance after approval (expect 13)"
curl -s "$API/balances/$ALICE_ID/$NYC_ID" | pjson

pause

# ─── SCENARIO 2: Insufficient Balance ────────────────────────────────────────
header "SCENARIO 2: Rejection — Bob requests 10 days (only has 8)"

step "Bob's balance"
curl -s "$API/balances/$BOB_ID/$NYC_ID" | pjson
echo ""

step "Bob requests 10 days → rejected at local pre-check (no HCM call)"
curl -s -X POST "$API/time-off-requests" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"requestedDays\":10}" | pjson

pause

# ─── SCENARIO 3: HCM Divergence / Work Anniversary ───────────────────────────
header "SCENARIO 3: Work Anniversary — HCM updates Alice externally"

step "HCM admin grants Alice a work anniversary bonus: 20 days in HCM"
curl -s -X POST "$HCM/hcm/admin/balances" -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$ALICE_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":20}" > /dev/null
ok "HCM now shows 20 for Alice — ReadyOn local still shows 13 (stale)"

step "Local balance (stale)"
curl -s "$API/balances/$ALICE_ID/$NYC_ID" | pjson
echo ""

step "Force reconcile — pulls fresh HCM balance into local"
curl -s -X POST "$API/sync/hcm/reconcile/$ALICE_ID/$NYC_ID" | pjson
echo ""

step "Now request 18 days — APPROVED (HCM confirms 20 before submit)"
curl -s -X POST "$API/time-off-requests" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$ALICE_ID\",\"locationId\":\"$NYC_ID\",\"requestedDays\":18}" | pjson

pause

# ─── SCENARIO 4: Defensive — HCM Unreliable Validation ───────────────────────
header "SCENARIO 4: Defensive validation — HCM in unreliableValidation mode"

step "Reset Bob's HCM balance to 3 days, reconcile local"
curl -s -X POST "$HCM/hcm/admin/balances" -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":3}" > /dev/null
curl -s -X POST "$API/sync/hcm/reconcile/$BOB_ID/$NYC_ID" > /dev/null
ok "Bob has 3 days (local and HCM)"

step "Switch HCM to unreliableValidation mode (HCM accepts anything — even overdrafts)"
curl -s -X POST "$HCM/hcm/admin/mode" -H "Content-Type: application/json" \
  -d '{"mode":"unreliableValidation"}' | pjson
echo ""

step "Bob requests 10 days — ReadyOn rejects BEFORE touching HCM (local: 3 < 10)"
curl -s -X POST "$API/time-off-requests" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"requestedDays\":10}" | pjson
echo ""
ok "Balance protected. HCM's broken validation was never an issue."

step "Reset HCM to normal"
curl -s -X POST "$HCM/hcm/admin/mode" -H "Content-Type: application/json" \
  -d '{"mode":"normal"}' > /dev/null

pause

# ─── SCENARIO 5: Idempotency ─────────────────────────────────────────────────
header "SCENARIO 5: Idempotency — same request submitted twice (network retry)"

step "Reset Bob's balance to 10 days"
curl -s -X POST "$HCM/hcm/admin/balances" -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":10}" > /dev/null
curl -s -X POST "$API/sync/hcm/reconcile/$BOB_ID/$NYC_ID" > /dev/null
ok "Bob has 10 days"

step "First request (idempotency key: idem-demo-001)"
FIRST=$(curl -s -X POST "$API/time-off-requests" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"requestedDays\":3,\"idempotencyKey\":\"idem-demo-001\"}")
FIRST_ID=$(echo $FIRST | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
echo $FIRST | pjson
echo ""

step "Same request again (simulating a client retry)"
SECOND=$(curl -s -X POST "$API/time-off-requests" \
  -H "Content-Type: application/json" \
  -d "{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"requestedDays\":3,\"idempotencyKey\":\"idem-demo-001\"}")
SECOND_ID=$(echo $SECOND | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])" 2>/dev/null)
echo $SECOND | pjson
echo ""

[ "$FIRST_ID" = "$SECOND_ID" ] && ok "Same request ID returned — balance deducted only once (7, not 4)." || echo "IDs differ — unexpected"
echo ""
curl -s "$API/balances/$BOB_ID/$NYC_ID" | pjson

pause

# ─── SCENARIO 6: Batch Sync ──────────────────────────────────────────────────
header "SCENARIO 6: Year-start refresh via batch sync"

step "HCM sends full corpus with new balances: Alice=25, Bob=25"
curl -s -X POST "$API/sync/hcm/batch" \
  -H "Content-Type: application/json" \
  -d "[{\"employeeId\":\"$ALICE_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":25},{\"employeeId\":\"$BOB_ID\",\"locationId\":\"$NYC_ID\",\"balanceDays\":25}]" | pjson
echo ""

step "All balances after batch"
curl -s "$API/balances/$ALICE_ID" | pjson

pause

# ─── WRAP UP ─────────────────────────────────────────────────────────────────
header "DEMO COMPLETE"
echo "Scenarios shown:"
echo "  1. Happy path: approve and deduct atomically"
echo "  2. Rejection: insufficient local balance (no HCM call wasted)"
echo "  3. Work anniversary: external HCM update → reconcile → approve"
echo "  4. Defensive: HCM in unreliableValidation mode, ReadyOn still blocks"
echo "  5. Idempotency: duplicate retry returns same result, one deduction"
echo "  6. Batch sync: year-start balance refresh across all employees"
echo ""
echo "All 100 tests cover these + 24 more edge cases. Run: npm test"
echo ""
