import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '../components/HomePage'
import { SetupHome } from '../components/SetupHome'

type Search = { homeId?: string }

export const Route = createFileRoute('/')({
  // The open home lives in the URL (?homeId=…), so a page refresh or a shared link keeps it.
  validateSearch: (search: Record<string, unknown>): Search =>
    typeof search.homeId === 'string' && search.homeId.length > 0 ? { homeId: search.homeId } : {},
  component: Index,
})

function Index() {
  const { homeId } = Route.useSearch()
  // `key` gives each home a fresh component, so no data from the last home leaks in.
  return homeId ? <HomePage key={homeId} homeId={homeId} /> : <SetupHome />
}
