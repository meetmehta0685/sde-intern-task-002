import { notFound } from './errors'

// Rows as D1 returns them (snake_case), and the JSON shapes the API sends (camelCase).

export type HomeRow = { id: string; name: string }
export type MemberRow = { id: string; home_id: string; name: string }
export type BillRow = { id: string; home_id: string; title: string; total_cents: number }
export type ShareRow = {
  id: string
  member_id: string
  amount_cents: number
  paid_at: string | null
}

export type Member = { id: string; homeId: string; name: string }
export type Share = { id: string; memberId: string; amountCents: number; paidAt: string | null }
export type Bill = {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: Share[]
}

export const toMember = (row: MemberRow): Member => ({
  id: row.id,
  homeId: row.home_id,
  name: row.name,
})

export const toShare = (row: ShareRow): Share => ({
  id: row.id,
  memberId: row.member_id,
  amountCents: row.amount_cents,
  paidAt: row.paid_at,
})

export const toBill = (row: BillRow, shares: Share[]): Bill => ({
  id: row.id,
  homeId: row.home_id,
  title: row.title,
  totalCents: row.total_cents,
  shares,
})

export async function requireHome(db: D1Database, homeId: string): Promise<HomeRow> {
  const home = await db
    .prepare('SELECT id, name FROM homes WHERE id = ?1')
    .bind(homeId)
    .first<HomeRow>()
  if (!home) throw notFound('Home not found')
  return home
}
