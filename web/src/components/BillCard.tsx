import { Fragment, useState } from 'react'
import { ApiRequestError, api, type Bill, errorMessage, type Member, type Share } from '../api'
import { formatCents } from '../money'
import { MemberMark } from './MemberMark'

// One payment attempt per share. The key is kept when an attempt fails, so pressing
// "Retry" sends the same Idempotency-Key: if the first request did reach the server,
// the retry gets the same answer instead of paying twice.
type Attempt = { key: string; status: 'paying' | 'failed'; error?: string }

type Props = {
  bill: Bill
  members: Member[]
  onPaid: (billId: string, share: Share) => void
  onStale: () => void
}

const stampDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' })

export function BillCard({ bill, members, onPaid, onStale }: Props) {
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({})
  // Shares paid from this page, so only a fresh payment plays the stamp animation.
  const [justPaid, setJustPaid] = useState<ReadonlySet<string>>(new Set())
  const nameOf = (memberId: string) =>
    members.find((member) => member.id === memberId)?.name ?? 'Unknown member'
  const paidCount = bill.shares.filter((share) => share.paidAt !== null).length
  const baseCents = Math.min(...bill.shares.map((share) => share.amountCents))

  async function pay(share: Share) {
    const previous = attempts[share.id]
    if (previous?.status === 'paying') return
    const key = previous?.key ?? crypto.randomUUID()
    setAttempts((all) => ({ ...all, [share.id]: { key, status: 'paying' } }))

    try {
      const paid = await api.payShare(bill.id, share.id, key)
      setAttempts(({ [share.id]: _done, ...rest }) => rest)
      setJustPaid((ids) => new Set(ids).add(share.id))
      onPaid(bill.id, paid)
    } catch (error) {
      let message = errorMessage(error)
      // 409 and 404 will not change on retry, so start fresh and reload the real state.
      const final = error instanceof ApiRequestError && [404, 409].includes(error.status)
      if (final) {
        message =
          error.status === 409
            ? 'This share was already paid by another request.'
            : 'This share no longer exists.'
        onStale()
      }
      setAttempts((all) => ({
        ...all,
        [share.id]: { key: final ? crypto.randomUUID() : key, status: 'failed', error: message },
      }))
    }
  }

  return (
    <article className="sheet bill" aria-labelledby={`bill-${bill.id}`}>
      <header className="bill-head">
        <div>
          <h3 id={`bill-${bill.id}`} className="sheet-title">
            {bill.title}
          </h3>
          <p className="meta">
            Split {bill.shares.length} {bill.shares.length === 1 ? 'way' : 'ways'} ·{' '}
            {paidCount === bill.shares.length
              ? 'All paid'
              : `${paidCount} of ${bill.shares.length} paid`}
          </p>
        </div>
        <p className="bill-total money">{formatCents(bill.totalCents)}</p>
      </header>

      <table className="ledger">
        <thead>
          <tr>
            <th scope="col">Member</th>
            <th scope="col" className="num">
              Share
            </th>
            <th scope="col" className="status-col">
              <span className="sr-only">Status</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bill.shares.map((share) => {
            const attempt = attempts[share.id]
            const paying = attempt?.status === 'paying'
            const failed = attempt?.status === 'failed' && !share.paidAt
            const name = nameOf(share.memberId)
            return (
              <Fragment key={share.id}>
                <tr className={failed ? 'has-error' : undefined}>
                  <td>
                    <span className="member">
                      <MemberMark name={name} />
                      {name}
                    </span>
                  </td>
                  <td className="num money">
                    {share.amountCents > baseCents && (
                      <span className="extra-cent" title="Gets one of the leftover cents">
                        +1¢
                      </span>
                    )}
                    {formatCents(share.amountCents)}
                  </td>
                  <td className="status-col">
                    {share.paidAt ? (
                      <span
                        className={justPaid.has(share.id) ? 'stamp is-fresh' : 'stamp'}
                        title={`Paid ${new Date(share.paidAt).toLocaleString()}`}
                      >
                        Paid{' '}
                        <time dateTime={share.paidAt}>
                          {stampDate.format(new Date(share.paidAt))}
                        </time>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-pay"
                        disabled={paying}
                        aria-busy={paying}
                        aria-label={`${failed ? 'Retry paying' : 'Pay'} ${name}'s share`}
                        onClick={() => pay(share)}
                      >
                        {paying ? 'Paying…' : failed ? 'Retry' : 'Pay'}
                      </button>
                    )}
                  </td>
                </tr>
                {failed && (
                  <tr className="error-row">
                    <td colSpan={3} role="alert">
                      {attempt.error}
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </article>
  )
}
