import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: string }
  // After the first load we keep showing the data, even if a refresh fails.
  | { status: 'ready'; data: T; refreshing: boolean; refreshError: string | null }

// Loads data for a component. `reload` refetches while keeping the current data on screen;
// `update` changes the data locally (e.g. after a successful payment).
// Answers from an older request are ignored, so a slow response cannot overwrite a newer one.
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' })
  const current = useRef<AbortController | null>(null)

  const reload = useCallback(() => {
    current.current?.abort()
    const controller = new AbortController()
    current.current = controller

    setState((prev) =>
      prev.status === 'ready' ? { ...prev, refreshing: true } : { status: 'loading' },
    )
    load(controller.signal).then(
      (data) => {
        if (controller.signal.aborted) return
        setState({ status: 'ready', data, refreshing: false, refreshError: null })
      },
      (error: unknown) => {
        if (controller.signal.aborted) return
        const message = errorMessage(error)
        setState((prev) =>
          prev.status === 'ready'
            ? { ...prev, refreshing: false, refreshError: message }
            : { status: 'error', error: message },
        )
      },
    )
  }, [load])

  useEffect(() => {
    reload()
    return () => current.current?.abort()
  }, [reload])

  const update = useCallback((change: (data: T) => T) => {
    setState((prev) => (prev.status === 'ready' ? { ...prev, data: change(prev.data) } : prev))
  }, [])

  return { state, reload, update }
}
