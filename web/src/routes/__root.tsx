import { createRootRoute, Link, Outlet } from '@tanstack/react-router'

export const Route = createRootRoute({
  component: () => (
    <>
      <header className="topbar">
        <Link to="/" search={{}} className="brand">
          Bill Splitter
        </Link>
        <Link to="/" search={{}} className="btn btn-small">
          New home
        </Link>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  ),
  // Last line of defence: if anything throws while rendering, show a message, not a blank page.
  errorComponent: ({ reset }) => (
    <div className="page page-narrow">
      <section className="sheet notice-sheet" role="alert">
        <h1 className="sheet-title">Something went wrong</h1>
        <p>The page hit an unexpected error. Your data is safe on the server.</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
        </div>
      </section>
    </div>
  ),
})
