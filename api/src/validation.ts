import type { Context } from 'hono'
import { badRequest, invalid } from './errors'

export type JsonObject = Record<string, unknown>

const MAX_TEXT_LENGTH = 200

// Reads the request body as a JSON object. Bad JSON is a 400, a non-object body is a 422.
export async function readJsonObject(c: Context): Promise<JsonObject> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw badRequest('Request body must be valid JSON')
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    throw invalid('Request body must be a JSON object')
  }
  return body as JsonObject
}

// A required, non-blank string. Returned trimmed.
export function requireText(body: JsonObject, field: string): string {
  const value = body[field]
  if (typeof value !== 'string') {
    throw invalid(`${field} must be a string`)
  }
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    throw invalid(`${field} must not be empty`)
  }
  if (trimmed.length > MAX_TEXT_LENGTH) {
    throw invalid(`${field} must be at most ${MAX_TEXT_LENGTH} characters`)
  }
  return trimmed
}

// A whole, positive number of cents. Strings such as "1000" are rejected, not converted.
// The safe-integer limit keeps the value exact in JavaScript and in SQLite.
export function requirePositiveCents(body: JsonObject, field: string): number {
  const value = body[field]
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value <= 0) {
    throw invalid(`${field} must be a positive whole number of cents`)
  }
  return value
}
