import type { ContentfulStatusCode } from 'hono/utils/http-status'

// Thrown from a handler to answer with `{ "error": message }` and the given status.
// The app's onError handler turns it into the response.
export class ApiError extends Error {
  constructor(
    readonly status: ContentfulStatusCode,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const notFound = (message: string) => new ApiError(404, message)
export const invalid = (message: string) => new ApiError(422, message)
export const badRequest = (message: string) => new ApiError(400, message)
export const conflict = (message: string) => new ApiError(409, message)
