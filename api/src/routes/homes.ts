import { Hono } from 'hono'
import { type MemberRow, requireHome, toMember } from '../db'
import { readJsonObject, requireText } from '../validation'

export const homes = new Hono<{ Bindings: Env }>()

homes.post('/homes', async (c) => {
  const body = await readJsonObject(c)
  const name = requireText(body, 'name')
  const id = crypto.randomUUID()

  await c.env.DB.prepare('INSERT INTO homes (id, name) VALUES (?1, ?2)').bind(id, name).run()

  return c.json({ id, name }, 201)
})

homes.get('/homes/:homeId', async (c) => {
  const home = await requireHome(c.env.DB, c.req.param('homeId'))
  const { results } = await c.env.DB.prepare(
    'SELECT id, home_id, name FROM members WHERE home_id = ?1 ORDER BY position',
  )
    .bind(home.id)
    .all<MemberRow>()

  return c.json({ id: home.id, name: home.name, members: results.map(toMember) })
})

homes.post('/homes/:homeId/members', async (c) => {
  const home = await requireHome(c.env.DB, c.req.param('homeId'))
  const body = await readJsonObject(c)
  const name = requireText(body, 'name')
  const id = crypto.randomUUID()

  // The next position is computed inside the INSERT, so two members added at the same
  // time cannot get the same position (SQLite runs one write statement at a time).
  // The UNIQUE (home_id, position) constraint backs this up.
  await c.env.DB.prepare(
    `INSERT INTO members (id, home_id, name, position)
     SELECT ?1, ?2, ?3, COALESCE(MAX(position), -1) + 1
     FROM members WHERE home_id = ?2`,
  )
    .bind(id, home.id, name)
    .run()

  return c.json(toMember({ id, home_id: home.id, name }), 201)
})

homes.get('/homes/:homeId/balances', async (c) => {
  const home = await requireHome(c.env.DB, c.req.param('homeId'))

  // LEFT JOIN keeps members who have no shares yet; they owe 0.
  const { results } = await c.env.DB.prepare(
    `SELECT m.id AS memberId,
            m.name AS name,
            COALESCE(SUM(CASE WHEN s.paid_at IS NULL THEN s.amount_cents END), 0) AS outstandingCents
     FROM members m
     LEFT JOIN shares s ON s.member_id = m.id
     WHERE m.home_id = ?1
     GROUP BY m.id
     ORDER BY m.position`,
  )
    .bind(home.id)
    .all<{ memberId: string; name: string; outstandingCents: number }>()

  return c.json({ balances: results })
})
