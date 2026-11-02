import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'
import { type Balance, type Bill, call, createBill, createHome, type Share } from './helpers'

function pay(billId: string, shareId: string, key: string) {
  return call<Share>('POST', `/api/bills/${billId}/shares/${shareId}/pay`, {
    headers: { 'Idempotency-Key': key },
  })
}

async function outstanding(homeId: string) {
  const res = await call<{ balances: Balance[] }>('GET', `/api/homes/${homeId}/balances`)
  return res.body.balances.map((balance) => balance.outstandingCents)
}

async function setup() {
  const { homeId, members } = await createHome(['Asha', 'Ben'])
  const bill = await createBill(homeId, 1000)
  const share = bill.body.shares[0]
  if (!share) throw new Error('bill has no shares')
  return { homeId, members, bill: bill.body, share }
}

describe('two payments at the same time', () => {
  it('lets only one of two different keys pay the share', async () => {
    const { homeId, bill, share } = await setup()

    const results = await Promise.all([
      pay(bill.id, share.id, crypto.randomUUID()),
      pay(bill.id, share.id, crypto.randomUUID()),
    ])

    expect(results.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await outstanding(homeId)).toEqual([0, 500])
  })

  it('answers both requests with the same result when they share a key', async () => {
    const { homeId, bill, share } = await setup()
    const key = crypto.randomUUID()

    const [first, second] = await Promise.all([
      pay(bill.id, share.id, key),
      pay(bill.id, share.id, key),
    ])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(second.body).toEqual(first.body)
    expect(await outstanding(homeId)).toEqual([0, 500])
  })

  it('keeps answering a replayed key with the original paidAt', async () => {
    const { bill, share } = await setup()
    const key = crypto.randomUUID()
    const first = await pay(bill.id, share.id, key)

    for (let i = 0; i < 3; i++) {
      const again = await pay(bill.id, share.id, key)
      expect(again.status).toBe(200)
      expect(again.body).toEqual(first.body)
    }
  })
})

describe('payments that must not go through', () => {
  it('returns 404 for a real share used under the wrong bill', async () => {
    const { homeId, share } = await setup()
    const otherBill = await createBill(homeId, 500)

    const paid = await pay(otherBill.body.id, share.id, crypto.randomUUID())

    expect(paid.status).toBe(404)
    expect(await outstanding(homeId)).toEqual([750, 750])
  })

  it('rejects a blank Idempotency-Key', async () => {
    const { bill, share } = await setup()

    const paid = await pay(bill.id, share.id, '   ')

    expect(paid.status).toBe(400)
  })
})

describe('creating bills', () => {
  it('gives 0 cents to the last members when the total is tiny', async () => {
    const { homeId } = await createHome(['Asha', 'Ben', 'Chitra'])

    const bill = await createBill(homeId, 2)

    expect(bill.status).toBe(201)
    expect(bill.body.shares.map((s) => s.amountCents)).toEqual([1, 1, 0])
  })

  it.each([Number.MAX_SAFE_INTEGER + 1, 1e21, true, {}, [100]])(
    'rejects the amount %j',
    async (totalCents) => {
      const { homeId } = await createHome(['Asha'])

      const bill = await call('POST', `/api/homes/${homeId}/bills`, {
        body: { title: 'Rent', totalCents },
      })

      expect(bill.status).toBe(422)
    },
  )

  it.each([undefined, '', '   ', 42])('rejects the title %j', async (title) => {
    const { homeId } = await createHome(['Asha'])

    const bill = await call('POST', `/api/homes/${homeId}/bills`, {
      body: { title, totalCents: 100 },
    })

    expect(bill.status).toBe(422)
  })

  it('keeps the members of a home in the order they were added, even when added together', async () => {
    const { homeId } = await createHome([])
    const names = ['A', 'B', 'C', 'D', 'E']
    await Promise.all(
      names.map((name) => call('POST', `/api/homes/${homeId}/members`, { body: { name } })),
    )

    const bill = await createBill(homeId, 13)

    expect(bill.status).toBe(201)
    expect(bill.body.shares).toHaveLength(5)
    expect(bill.body.shares.map((s) => s.amountCents)).toEqual([3, 3, 3, 2, 2])
  })

  it('lists the bills of a home with their shares', async () => {
    const { homeId, bill } = await setup()

    const list = await call<{ bills: Bill[] }>('GET', `/api/homes/${homeId}/bills`)

    expect(list.status).toBe(200)
    expect(list.body.bills).toEqual([bill])
  })
})

describe('errors are JSON', () => {
  it('answers bad JSON with 400', async () => {
    const response = await exports.default.fetch(
      new Request('http://localhost/api/homes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{ not json',
      }),
    )

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: expect.any(String) })
  })

  it.each([
    ['POST', '/api/homes', { name: '' }, 422],
    ['POST', '/api/homes', null, 422],
    ['POST', '/api/homes/nope/bills', { title: 'x', totalCents: 1 }, 404],
    ['GET', '/api/homes/nope', undefined, 404],
    ['GET', '/api/no-such-route', undefined, 404],
  ] as const)('%s %s answers %j with { error }', async (method, path, body, status) => {
    const response = await call(method, path, { body })

    expect(response.status).toBe(status)
    expect(response.body).toEqual({ error: expect.any(String) })
  })
})
