import { type FormEvent, useState } from 'react'
import { api, errorMessage } from '../api'
import { parseDollarsToCents } from '../money'

type SubmitState = { status: 'idle' } | { status: 'saving' } | { status: 'error'; error: string }

export function AddMemberForm({ homeId, onAdded }: { homeId: string; onAdded: () => void }) {
  const [name, setName] = useState('')
  const [state, setState] = useState<SubmitState>({ status: 'idle' })

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || state.status === 'saving') return
    setState({ status: 'saving' })
    try {
      await api.addMember(homeId, name.trim())
      setName('')
      setState({ status: 'idle' })
      onAdded()
    } catch (error) {
      setState({ status: 'error', error: errorMessage(error) })
    }
  }

  return (
    <form className="add-member" onSubmit={submit}>
      <label className="sr-only" htmlFor="member-name">
        Member name
      </label>
      <input
        id="member-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Add a member"
        maxLength={200}
      />
      <button type="submit" className="btn" disabled={!name.trim() || state.status === 'saving'}>
        {state.status === 'saving' ? 'Adding…' : 'Add'}
      </button>
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}

export function AddBillForm({
  homeId,
  memberCount,
  onCreated,
}: {
  homeId: string
  memberCount: number
  onCreated: () => void
}) {
  const hasMembers = memberCount > 0
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [state, setState] = useState<SubmitState>({ status: 'idle' })
  const cents = parseDollarsToCents(amount)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (state.status === 'saving') return
    if (!title.trim()) return setState({ status: 'error', error: 'Give the bill a title.' })
    if (cents === null) {
      return setState({ status: 'error', error: 'Enter an amount above 0, like 12.50.' })
    }
    setState({ status: 'saving' })
    try {
      await api.createBill(homeId, title.trim(), cents)
      setTitle('')
      setAmount('')
      setState({ status: 'idle' })
      onCreated()
    } catch (error) {
      setState({ status: 'error', error: errorMessage(error) })
    }
  }

  return (
    <form className="sheet add-bill" onSubmit={submit} aria-labelledby="add-bill-heading">
      <div className="add-bill-head">
        <h2 id="add-bill-heading" className="sheet-title">
          Split a new bill
        </h2>
        <p className="meta">
          {hasMembers
            ? `Between ${memberCount} ${memberCount === 1 ? 'member' : 'members'}, to the cent`
            : 'Add at least one member first'}
        </p>
      </div>
      <div className="add-bill-fields">
        <label className="field">
          <span className="label">What for</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Electricity"
            maxLength={200}
            disabled={!hasMembers}
          />
        </label>
        <label className="field amount-field">
          <span className="label">Total</span>
          <span className="money-input">
            <span aria-hidden="true">$</span>
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="120.00"
              inputMode="decimal"
              disabled={!hasMembers}
            />
          </span>
        </label>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!hasMembers || state.status === 'saving'}
        >
          {state.status === 'saving' ? 'Splitting…' : 'Split bill'}
        </button>
      </div>
      {state.status === 'error' && (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
