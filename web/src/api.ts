// Typed client for the bill splitter API. Every failure becomes an ApiRequestError with a
// message that is safe to show, so components never deal with raw fetch errors.

export type Home = { id: string; name: string }
export type Member = { id: string; homeId: string; name: string }
export type Share = { id: string; memberId: string; amountCents: number; paidAt: string | null }
export type Bill = {
  id: string
  homeId: string
  title: string
  totalCents: number
  shares: Share[]
}
export type Balance = { memberId: string; name: string; outstandingCents: number }
export type HomeDetails = Home & { members: Member[] }

export class ApiRequestError extends Error {
  // status 0 means the request never got an answer (offline or timed out).
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiRequestError'
  }
}

const TIMEOUT_MS = 10_000

type RequestOptions = { body?: unknown; headers?: Record<string, string>; signal?: AbortSignal }

async function request<T>(method: 'GET' | 'POST', path: string, options: RequestOptions = {}) {
  // One controller for both reasons to stop: the caller cancelled, or we waited too long.
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  const cancel = () => controller.abort()
  options.signal?.addEventListener('abort', cancel)

  let response: Response
  let text: string
  try {
    response = await fetch(path, {
      method,
      headers: { 'content-type': 'application/json', ...options.headers },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    })
    text = await response.text()
  } catch (error) {
    if (options.signal?.aborted) throw error
    if (controller.signal.aborted) {
      throw new ApiRequestError(0, 'The server is taking too long to answer. Please try again.')
    }
    throw new ApiRequestError(0, 'Could not reach the server. Check your connection and try again.')
  } finally {
    clearTimeout(timer)
    options.signal?.removeEventListener('abort', cancel)
  }

  const data = parseJson(text)
  if (!response.ok) {
    const message =
      isErrorBody(data) && response.status < 500
        ? data.error
        : `Something went wrong on the server (${response.status}). Please try again.`
    throw new ApiRequestError(response.status, message)
  }
  if (data === undefined) {
    throw new ApiRequestError(response.status, 'The server sent an unexpected answer.')
  }
  // The API is ours and its shapes are typed on both sides, so we trust the body here.
  return data as T
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isErrorBody(value: unknown): value is { error: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'error' in value &&
    typeof value.error === 'string'
  )
}

export const api = {
  createHome: (name: string) => request<Home>('POST', '/api/homes', { body: { name } }),

  getHome: (homeId: string, signal?: AbortSignal) =>
    request<HomeDetails>('GET', `/api/homes/${encodeURIComponent(homeId)}`, { signal }),

  addMember: (homeId: string, name: string) =>
    request<Member>('POST', `/api/homes/${encodeURIComponent(homeId)}/members`, {
      body: { name },
    }),

  getBills: (homeId: string, signal?: AbortSignal) =>
    request<{ bills: Bill[] }>('GET', `/api/homes/${encodeURIComponent(homeId)}/bills`, {
      signal,
    }),

  createBill: (homeId: string, title: string, totalCents: number) =>
    request<Bill>('POST', `/api/homes/${encodeURIComponent(homeId)}/bills`, {
      body: { title, totalCents },
    }),

  getBalances: (homeId: string, signal?: AbortSignal) =>
    request<{ balances: Balance[] }>('GET', `/api/homes/${encodeURIComponent(homeId)}/balances`, {
      signal,
    }),

  payShare: (billId: string, shareId: string, idempotencyKey: string) =>
    request<Share>(
      'POST',
      `/api/bills/${encodeURIComponent(billId)}/shares/${encodeURIComponent(shareId)}/pay`,
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) return error.message
  return 'Something unexpected went wrong. Please try again.'
}
