import { Hono } from 'hono'
import { type BillRow, requireHome, type Share, type ShareRow, toBill, toShare } from '../db'
import { badRequest, conflict, invalid, notFound } from '../errors'
import { splitCents } from '../split'
import { readJsonObject, requirePositiveCents, requireText } from '../validation'

export const bills = new Hono<{ Bindings: Env }>()

const MAX_IDEMPOTENCY_KEY_LENGTH = 255

bills.post('/homes/:homeId/bills', async (c) => {
  const db = c.env.DB
  const home = await requireHome(db, c.req.param('homeId'))
  const body = await readJsonObject(c)
  const title = requireText(body, 'title')
  const totalCents = requirePositiveCents(body, 'totalCents')

  const { results: members } = await db
    .prepare('SELECT id FROM members WHERE home_id = ?1 ORDER BY position')
    .bind(home.id)
    .all<{ id: string }>()
  if (members.length === 0) {
    throw invalid('Home has no members to split the bill between')
  }

  const billId = crypto.randomUUID()
  const shares: Share[] = splitCents(totalCents, members).map(({ member, amountCents }) => ({
    id: crypto.randomUUID(),
    memberId: member.id,
    amountCents,
    paidAt: null,
  }))

  // batch() runs every statement in one transaction: either the bill and all of its
  // shares are saved, or nothing is.
  const insertShare = db.prepare(
    'INSERT INTO shares (id, bill_id, member_id, amount_cents) VALUES (?1, ?2, ?3, ?4)',
  )
  await db.batch([
    db
      .prepare('INSERT INTO bills (id, home_id, title, total_cents) VALUES (?1, ?2, ?3, ?4)')
      .bind(billId, home.id, title, totalCents),
    ...shares.map((share) => insertShare.bind(share.id, billId, share.memberId, share.amountCents)),
  ])

  return c.json({ id: billId, homeId: home.id, title, totalCents, shares }, 201)
})

bills.get('/homes/:homeId/bills', async (c) => {
  const db = c.env.DB
  const home = await requireHome(db, c.req.param('homeId'))

  // Newest bill first; shares in the order members joined the home.
  const [billRows, shareRows] = await Promise.all([
    db
      .prepare(
        'SELECT id, home_id, title, total_cents FROM bills WHERE home_id = ?1 ORDER BY rowid DESC',
      )
      .bind(home.id)
      .all<BillRow>(),
    db
      .prepare(
        `SELECT s.id, s.bill_id, s.member_id, s.amount_cents, s.paid_at
         FROM shares s
         JOIN bills b ON b.id = s.bill_id
         JOIN members m ON m.id = s.member_id
         WHERE b.home_id = ?1
         ORDER BY m.position`,
      )
      .bind(home.id)
      .all<ShareRow & { bill_id: string }>(),
  ])

  const sharesByBill = new Map<string, Share[]>()
  for (const row of shareRows.results) {
    const list = sharesByBill.get(row.bill_id) ?? []
    list.push(toShare(row))
    sharesByBill.set(row.bill_id, list)
  }

  const result = billRows.results.map((row) => toBill(row, sharesByBill.get(row.id) ?? []))
  return c.json({ bills: result })
})

bills.post('/bills/:billId/shares/:shareId/pay', async (c) => {
  const db = c.env.DB
  const key = c.req.header('Idempotency-Key')?.trim()
  if (!key) {
    throw badRequest('Idempotency-Key header is required')
  }
  if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw badRequest(`Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`)
  }
  const { billId, shareId } = c.req.param()

  // One conditional UPDATE does the check and the write together. SQLite runs write
  // statements one at a time, so if two requests race, only the first one finds
  // `paid_at IS NULL` and changes the row. The other one changes nothing.
  const paid = await db
    .prepare(
      `UPDATE shares SET paid_at = ?1, idempotency_key = ?2
       WHERE id = ?3 AND bill_id = ?4 AND paid_at IS NULL
       RETURNING id, member_id, amount_cents, paid_at`,
    )
    .bind(new Date().toISOString(), key, shareId, billId)
    .first<ShareRow>()
  if (paid) {
    return c.json(toShare(paid), 200)
  }

  // Nothing changed: the share does not exist under this bill, or it is already paid.
  const existing = await db
    .prepare(
      `SELECT id, member_id, amount_cents, paid_at, idempotency_key
       FROM shares WHERE id = ?1 AND bill_id = ?2`,
    )
    .bind(shareId, billId)
    .first<ShareRow & { idempotency_key: string | null }>()

  if (!existing) {
    const bill = await db.prepare('SELECT id FROM bills WHERE id = ?1').bind(billId).first()
    throw notFound(bill ? 'Share not found' : 'Bill not found')
  }
  if (existing.idempotency_key === key) {
    // A retry of the request that paid it: answer with the same result, pay nothing.
    return c.json(toShare(existing), 200)
  }
  throw conflict('Share is already paid')
})
