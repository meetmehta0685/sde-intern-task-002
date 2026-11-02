import { Link } from '@tanstack/react-router'
import { useCallback, useState } from 'react'
import { api, type Share } from '../api'
import { formatCents } from '../money'
import { useResource } from '../useResource'
import { BillCard } from './BillCard'
import { AddBillForm, AddMemberForm } from './forms'
import { MemberMark } from './MemberMark'

export function HomePage({ homeId }: { homeId: string }) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const [home, { bills }, { balances }] = await Promise.all([
        api.getHome(homeId, signal),
        api.getBills(homeId, signal),
        api.getBalances(homeId, signal),
      ])
      return { home, bills, balances }
    },
    [homeId],
  )
  const { state, reload, update } = useResource(load)

  // Show the paid share right away from the server's answer, then refresh the balances.
  const onPaid = useCallback(
    (billId: string, paid: Share) => {
      update((data) => ({
        ...data,
        bills: data.bills.map((bill) =>
          bill.id === billId
            ? { ...bill, shares: bill.shares.map((s) => (s.id === paid.id ? paid : s)) }
            : bill,
        ),
      }))
      reload()
    },
    [update, reload],
  )

  if (state.status === 'loading') return <HomeSkeleton />

  if (state.status === 'error') {
    return (
      <div className="page page-narrow">
        <section className="sheet notice-sheet" role="alert">
          <h1 className="sheet-title">Could not load this home</h1>
          <p>{state.error}</p>
          <div className="actions">
            <button type="button" className="btn btn-primary" onClick={reload}>
              Try again
            </button>
            <Link to="/" search={{}} className="btn">
              Start a new home
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const { home, bills, balances } = state.data
  const outstanding = balances.reduce((sum, balance) => sum + balance.outstandingCents, 0)

  return (
    <div className="page">
      <header className="home-head">
        <div>
          <h1 className="home-name">{home.name}</h1>
          <p className="meta">
            {home.members.length} {home.members.length === 1 ? 'member' : 'members'} ·{' '}
            {bills.length} {bills.length === 1 ? 'bill' : 'bills'}
            {state.refreshing && <span className="updating"> · Updating…</span>}
          </p>
        </div>
        <CopyLink homeId={home.id} />
      </header>

      {state.refreshError && (
        <div className="banner" role="alert">
          <span>Could not refresh. {state.refreshError}</span>
          <button type="button" className="btn btn-small" onClick={reload}>
            Retry
          </button>
        </div>
      )}

      <div className="workspace">
        <aside className="side">
          <section className="sheet" aria-labelledby="members-heading">
            <h2 id="members-heading" className="sheet-title">
              Who owes what
            </h2>
            {balances.length === 0 ? (
              <p className="meta">No members yet. Add everyone who shares this home.</p>
            ) : (
              <>
                <ul className="balances">
                  {balances.map((balance) => (
                    <li key={balance.memberId}>
                      <span className="member">
                        <MemberMark name={balance.name} />
                        {balance.name}
                      </span>
                      <span className="leader" aria-hidden="true" />
                      {balance.outstandingCents > 0 ? (
                        <span className="money owes">{formatCents(balance.outstandingCents)}</span>
                      ) : (
                        <span className="settled">Settled</span>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="balances-total">
                  <span>Outstanding</span>
                  <span className="money">{formatCents(outstanding)}</span>
                </p>
              </>
            )}
            <AddMemberForm homeId={home.id} onAdded={reload} />
          </section>
        </aside>

        <section className="main" aria-labelledby="bills-heading">
          <AddBillForm homeId={home.id} memberCount={home.members.length} onCreated={reload} />
          <h2 id="bills-heading" className="section-title">
            Bills
          </h2>
          {bills.length === 0 ? (
            <div className="sheet empty">
              <p className="sheet-title">No bills yet</p>
              <p className="meta">
                {home.members.length === 0
                  ? 'Add members first, then split your first bill between them.'
                  : 'Split a bill above and every member gets their share, to the cent.'}
              </p>
            </div>
          ) : (
            bills.map((bill) => (
              <BillCard
                key={bill.id}
                bill={bill}
                members={home.members}
                onPaid={onPaid}
                onStale={reload}
              />
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function CopyLink({ homeId }: { homeId: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="home-id">
      <span className="id" title={homeId}>
        ID {homeId.slice(0, 8)}
      </span>
      <button type="button" className="btn btn-small" onClick={copy}>
        {copied ? 'Link copied' : 'Copy link'}
      </button>
    </div>
  )
}

function HomeSkeleton() {
  return (
    <div className="page" aria-busy="true">
      <p className="sr-only" role="status">
        Loading home…
      </p>
      <div className="home-head" aria-hidden="true">
        <div>
          <span className="skeleton skeleton-title" />
          <span className="skeleton skeleton-line short" />
        </div>
      </div>
      <div className="workspace" aria-hidden="true">
        <div className="side">
          <div className="sheet">
            {[0, 1, 2].map((row) => (
              <span key={row} className="skeleton skeleton-line" />
            ))}
          </div>
        </div>
        <div className="main">
          <div className="sheet">
            <span className="skeleton skeleton-line short" />
            {[0, 1, 2].map((row) => (
              <span key={row} className="skeleton skeleton-row" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
