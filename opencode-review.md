# 🔍 DormCleaning — Fresh Final Code Review

**Date:** 2026-06-19
**Scope:** All source files (pages/, server/api/, server/services/, server/utils/, server/models/, server/middleware/, server/plugins/)
**Method:** Read every source file line-by-line, cross-referenced against review.md to avoid duplicates

Reference: `review.md` documents 11 known remaining issues (1×P1, 10×P2/suggestions) from 10 prior review rounds. This review finds **10 additional issues** not previously documented.

---

## 📋 Cross-Reference: Known Issues (not re-reported here)

The following issues from review.md are **still valid** and confirmed by this review, but are **NOT duplicated** below:

| ID | Priority | Issue | Location |
|:--:|:--------:|-------|----------|
| #6 | 🟢 P2 | `markDone` lacks try/catch + toast | schedule.vue:261-275 |
| #7 | 🟢 P2 | Dead `rateLimit.ts` file | server/utils/rateLimit.ts |
| #8 | 🟢 P2 | Duplicate route `schedule/index.get.ts` | server/api/schedule/index.get.ts |
| #10 | 🟢 P2 | No pagination in history/swap | pages/history.vue, pages/swap.vue |
| E | 🟢 P2 | LEFT JOIN turned INTO JOIN in WHERE | server/api/schedule/missed.get.ts |
| H | 🟡 P1 | Missing `schedB.memberId` validation | server/api/swap.post.ts:37-45 |
| J | 🟢 P2 | `scheduleMap` should store `{status, id}` | pages/schedule.vue |
| U | 🟢 P2 | Missing transaction in approve handler | server/api/approve/[token].ts:29-58 |
| V | 🟢 P2 | Missing transaction in member delete | server/api/members.delete.ts:28-37 |

---

## 🟢 New Findings (not in review.md)

---

### Issue N1: `admin/missed.vue` Error Handler Destroys Loaded Data

| Field | Value |
|-------|-------|
| **File** | `pages/admin/missed.vue` |
| **Lines** | 89-91 |
| **Severity** | 🟢 P2 — User experience |
| **Type** | Error handling |

**Description:**
The `fetchMissed` catch block (line 91) sets `missedList.value = []` on any fetch error. On transient network errors, this wipes out previously loaded (and valid) data from the UI, forcing the user to manually refresh.

```typescript
} catch (err: any) {
    showMsg('加载失败: ' + (err.message || '未知错误'), 'error')
    missedList.value = []   // ← Destroys valid data on transient error
}
```

**Impact:**
If the API call fails momentarily (e.g., brief network hiccup), the entire missed-list UI goes blank with an error toast, even though the user could have continued working with the cached data.

**Suggestion:**
Remove `missedList.value = []` from the catch block. Keep the toast/error message but preserve the last successful state.

---

### Issue N2: `schedule.vue` Dead 'rest' Status Handling

| Field | Value |
|-------|-------|
| **File** | `pages/schedule.vue` |
| **Lines** | 239-240 |
| **Severity** | 🟢 P3 — Dead code |
| **Type** | Logic (dead path) |

**Description:**
`getCellClass()` checks for `s === 'rest'` and applies `cell-rest` CSS class:

```typescript
function getCellClass(memberId: number, date: string): string {
  const s = getSchedule(memberId, date)
  if (s === 'done') return 'cell-done'
  if (s === 'assigned' || s === 'pending') return 'cell-assigned'
  if (s === 'rest') return 'cell-rest'    // ← Dead: no code path sets 'rest'
  return ''
}
```

The scheduler only generates and stores `'pending'` status. The DB/API only use `'pending'`, `'done'`, `'missed'`. No code path ever sets a schedule's status to `'rest'`. The corresponding CSS (`.cell-rest`) will never be applied.

**Impact:**
Dead code and dead CSS — minor maintainability concern. Not a bug, but indicates the UI was designed for a status that was never implemented.

**Suggestion:**
Remove the `'rest'` check and the associated CSS class, or implement the rest-day feature if intended.

---

### Issue N3: `swap.put.ts` Does Not Re-validate Schedule Status on Approval

| Field | Value |
|-------|-------|
| **File** | `server/api/swap.put.ts` |
| **Lines** | 52-82 |
| **Severity** | 🟡 P1 — Data integrity |
| **Type** | Logic correctness |

**Description:**
`swap.post.ts` (line 33-35) validates that both schedules are `'pending'` when the swap request is **created**. However, `swap.put.ts` (approval path) does **not re-validate** that both schedules still have `status === 'pending'` before swapping them.

The approval flow (lines 66-103):
1. Fetches schedA and schedB (lines 53-54)
2. Checks dormId match (line 61)
3. **Does NOT check** `schedA.status === 'pending'` or `schedB.status === 'pending'`
4. Proceeds to swap memberIds and resets status to `'pending'` (lines 68-82)

**Scenario:**
1. Alice requests a swap with Bob (both schedules `'pending'`)
2. Alice completes her cleaning (schedule A → `'done'`)
3. Bob approves the swap — now the approval handler swaps the member IDs and sets BOTH schedules back to `'pending'`
4. Schedule A (which Alice already cleaned) is now assigned to Bob with `'pending'` status, and Alice's completed cleaning is effectively undone

**Impact:**
A schedule that was already completed (`'done'` or `'missed'`) can be swapped and reset to `'pending'`, creating data inconsistency.

**Suggestion:**
Add re-validation before the transaction:
```typescript
if (schedA.status !== 'pending' || schedB.status !== 'pending') {
  throw createError({ statusCode: 400, message: '排班状态已变化，无法批准互换' })
}
```

---

### Issue N4: `swap.post.ts` Fetches Full Dorm Schedule History Without Limits

| Field | Value |
|-------|-------|
| **File** | `server/api/swap.post.ts` |
| **Line** | 48 |
| **Severity** | 🟢 P3 — Performance |
| **Type** | Edge case / Performance |

**Description:**
Line 48 fetches ALL schedules for the dorm without date bounds:

```typescript
const allSchedules = await db.select().from(schedules).where(eq(schedules.dormId, dormId))
```

For a dorm with years of daily schedules, this could return thousands of rows into memory. The `validateSwap` function then iterates over all of them (lines 205-221) checking adjacency. This is called on every swap request.

**Impact:**
Performance degrades over time as schedule history accumulates. For a dorm with 2 years of daily data (~730 records), this is fine. For 10 years (~3650 records), still manageable but wasteful. The primary concern is that it's unbounded — no pagination or date limit.

**Suggestion:**
Limit the query to a relevant date window around the swap dates (e.g., ±7 days) since the adjacency check only needs nearby schedules:
```typescript
const buffer = 7 * 24 * 60 * 60 * 1000 // 7 days
const adjStart = new Date(Math.min(schedA.scheduledDate, schedB.scheduledDate).getTime() - buffer)
const adjEnd = new Date(Math.max(schedA.scheduledDate, schedB.scheduledDate).getTime() + buffer)
const allSchedules = await db.select().from(schedules).where(
  and(eq(schedules.dormId, dormId),
      gte(schedules.scheduledDate, adjStart),
      lte(schedules.scheduledDate, adjEnd))
)
```

---

### Issue N5: `members.post.ts` Email Uniqueness Check is System-wide

| Field | Value |
|-------|-------|
| **File** | `server/api/members.post.ts` |
| **Lines** | 24-27 |
| **Severity** | 🟢 P3 — Design inconsistency |
| **Type** | Logic correctness |

**Description:**
The email uniqueness check queries ALL members globally without filtering by `dormId`:

```typescript
const existing = await db.select()
    .from(members)
    .where(eq(members.email, email))   // ← No dormId filter
    .limit(1)
```

This means if Dorm A has a member with email `alice@example.com`, Dorm B cannot add a member with the same email, even though they are in separate dorms with separate data.

**Impact:**
Inconsistent with the dorm-isolation model used everywhere else (all other queries filter by `dormId`). Could frustrate users who share the same email provider domain or have family members in different dorms.

**Suggestion:**
Add `eq(members.dormId, dormId)` to the where clause, making uniqueness per-dorm rather than system-wide:
```typescript
.where(and(eq(members.email, email), eq(members.dormId, dormId)))
```

---

### Issue N6: `send-code.post.ts` Email Sent Before DB Log Insert

| Field | Value |
|-------|-------|
| **File** | `server/api/auth/send-code.post.ts` |
| **Lines** | 77, 80 |
| **Severity** | 🟢 P3 — Consistency |
| **Type** | Error handling |

**Description:**
The email is sent (line 77) BEFORE the email log is inserted into the database (line 80):

```typescript
await emailService.sendVerifyCode(email, code)   // Line 77 — email sent
// ...no transaction...
await db.insert(emailLogs).values({...})          // Line 80 — DB log
```

If the DB insert fails (e.g., transient connection error), the email was already sent but not logged. This means:
- The admin monitoring email_logs won't see this email
- Rate limiting queries won't count this email (could lead to slightly more emails than intended)

**Impact:**
Minor audit trail gap. Rate limiting uses `emailLogs` counts, so an undocked email means the rate limit is slightly less effective for that one request.

**Suggestion:**
Wrap in a transaction or swap the order to insert the log first (which can be rolled back if email fails):
```typescript
// Insert log first
await db.insert(emailLogs).values({...})
// Then send email (best-effort)
await emailService.sendVerifyCode(email, code)
```
Or use `try/finally` to ensure logging even on send failure.

---

### Issue N7: `cron.ts` `taskMarkMissed` Sends Emails Inside Database Transaction

| Field | Value |
|-------|-------|
| **File** | `server/services/cron.ts` |
| **Lines** | 258-289 |
| **Severity** | 🟢 P2 — Performance / Reliability |
| **Type** | Design |

**Description:**
The `taskMarkMissed` method sends emails **inside** the `db.transaction()` block (lines 272-277). For each missed schedule, the code:
1. Sends an email via SMTP (line 273) — potentially slow
2. Logs the email using the transaction `tx` (line 278)

This holds the database transaction open while waiting for SMTP responses. If the SMTP server is slow or unresponsive, database connections are tied up for the duration. The existing review.md already flags this same pattern in `swap.put.ts:93-102` as a suggestion, but the cron service has the same problem at potentially larger scale (one email per missed member, across all dorms).

**Impact:**
- DB connection pool exhaustion if SMTP is slow
- Transaction rollback on email failure could roll back valid schedule status changes
- Higher latency for the cron job

**Suggestion:**
Move email sending outside the transaction. Use the transaction only for the database writes (update schedules + insert missedLogs), then send emails after commit:

```typescript
await db.transaction(async (tx) => {
  await tx.update(schedules)... // schedule status updates
  for (const p of pendingList) {
    await tx.insert(missedLogs)... // missed log entries
  }
})
// Emails outside transaction
for (const p of pendingList) {
  await emailService.sendMissedWarning(...)
  await this.logEmail(db, schema, {...}) // using non-tx db
}
```

---

### Issue N8: `missed.get.ts` Hard-coded `limit(100)`

| Field | Value |
|-------|-------|
| **File** | `server/api/schedule/missed.get.ts` |
| **Line** | 40 |
| **Severity** | 🟢 P3 — Capacity |
| **Type** | Edge case |

**Description:**
The query hard-codes `limit(100)`. For a dorm with extensive missed-log history, older records beyond the most recent 100 are invisible. There is no pagination mechanism.

```typescript
.orderBy(desc(missedLogs.missedDate))
.limit(100)
```

**Impact:**
If a dorm has accumulated more than 100 missed records, the admin can only see the most recent 100. Older records exist in the DB but cannot be viewed or managed through the UI.

**Suggestion:**
Accept an optional `limit` query parameter (with a maximum cap, e.g., 500) to allow front-end pagination. Or increase the limit to a more generous value like 1000 with an optional `offset`.

---

### Issue N9: `members.vue` `pendingRemoveIndex` Out-of-Bounds Risk

| Field | Value |
|-------|-------|
| **File** | `pages/members.vue` |
| **Lines** | 28, 55, 88 |
| **Severity** | 🟢 P3 — Edge case |
| **Type** | Logic correctness |

**Description:**
When the confirm dialog is shown, the index of the member to remove is stored in `pendingRemoveIndex`. If the members list is modified (e.g., another admin removes a member, or the list re-fetches) between showing the confirm and clicking "confirm", the index could point to a different member or be out of bounds.

```typescript
// Line 88 — deletes by index
members.value[pendingRemoveIndex.value].id
```

**Scenario:**
1. Members list: [Alice, Bob, Charlie]
2. User clicks "remove" on Bob (index 1) → confirm dialog shown
3. Before user confirms, list auto-refreshes: [Alice, Charlie] (Bob already removed by someone else?)
4. User confirms → deletes `members.value[1]` = Charlie instead of Bob

**Impact:**
Wrong member could be deleted. Low probability in single-admin scenario but possible.

**Suggestion:**
Store the `memberId` directly instead of the array index:

```typescript
const pendingRemoveId = ref<number | null>(null)

// Template: @click="pendingRemoveId = m.id"
// Confirm: await $fetch('/api/members', { method: 'DELETE', params: { memberId: pendingRemoveId.value } })
```

---

### Issue N10: `schedule.vue` `weekDays` Computed Has Redundant Properties

| Field | Value |
|-------|-------|
| **File** | `pages/schedule.vue` |
| **Lines** | 161-173 |
| **Severity** | 🟢 P3 — Code smell |
| **Type** | Maintainability |

**Description:**
The `weekDays` computed produces identical values for `date` and `full`:

```typescript
days.push({
  date: d.toISOString().slice(0, 10),    // Line 167
  day: ['周一','周二','周三','周四','周五','周六','周日'][i],
  full: d.toISOString().slice(0, 10),     // Line 169 — identical to `date`
})
```

Both `date` and `full` resolve to the same `YYYY-MM-DD` string. The `full` property was likely intended for date formatting but ended up identical. The `periodLabel` computed (line 178-185) uses `day.full` where `day.date` would work identically.

**Impact:**
None functional. Minor code clutter.

**Suggestion:**
Remove the redundant `full` property and use `date` consistently.

---

## 📊 Summary

| Category | Count | Details |
|----------|:-----:|---------|
| Known issues still open | 9 | #6, #7, #8, #10, E, H, J, U, V (from review.md) |
| **New issues found** | **10** | N1–N10 (this review) |
| **New P1 (data integrity)** | **1** | N3: swap approval doesn't re-validate schedule status |
| **New P2 (UX/performance)** | **2** | N1: error handler clears data; N7: email in transaction |
| **New P3 (minor/edge)** | **7** | N2: dead code; N4: unbounded query; N5: global email check; N6: log order; N8: hard-coded limit; N9: index risk; N10: redundant props |

**Total actionable items: 9 (existing) + 10 (new) = 19**

**Priority breakdown:**
- 🟡 P1: 2 (existing H + new N3)
- 🟢 P2: 9 (existing #6, #7, #8, #10, E, J, U, V + new N1, N7)
- 🟢 P3 / Suggestions: 8 (new N2, N4, N5, N6, N8, N9, N10 + scheduler suggestions from review.md)
