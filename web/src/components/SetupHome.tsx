import { useNavigate } from '@tanstack/react-router'
import { type FormEvent, useState } from 'react'
import { api, errorMessage } from '../api'

export function SetupHome() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [members, setMembers] = useState('')
  const [openId, setOpenId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // What a failed attempt already saved, so "Create home" resumes instead of making a second home.
  const [progress, setProgress] = useState<{ homeId: string; added: number } | null>(null)

  async function create(event: FormEvent) {
    event.preventDefault()
    if (!name.trim() || saving) return
    setSaving(true)
    setError(null)
    try {
      const homeId = progress?.homeId ?? (await api.createHome(name.trim())).id
      let added = progress?.added ?? 0
      setProgress({ homeId, added })
      const names = members
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      // One at a time, on purpose: the order members are added decides who gets extra cents.
      for (const memberName of names.slice(added)) {
        await api.addMember(homeId, memberName)
        added += 1
        setProgress({ homeId, added })
      }
      await navigate({ to: '/', search: { homeId } })
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  function open(event: FormEvent) {
    event.preventDefault()
    const homeId = homeIdFrom(openId)
    if (homeId) void navigate({ to: '/', search: { homeId } })
  }

  return (
    <div className="page page-narrow">
      <header className="setup-head">
        <h1 className="home-name">Split bills fairly, to the cent</h1>
        <p className="lede">
          Create a home and add the people who share it. Every bill is split into whole cents that
          add up exactly, and each person pays their own share once.
        </p>
      </header>

      <form className="sheet setup-form" onSubmit={create} aria-labelledby="create-heading">
        <h2 id="create-heading" className="sheet-title">
          New home
        </h2>
        <label className="field">
          <span className="label">Home name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Flat 4B"
            maxLength={200}
            disabled={progress !== null}
          />
        </label>
        <label className="field">
          <span className="label">Members</span>
          <textarea
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            rows={4}
            placeholder={'Asha\nBen\nChitra'}
            aria-describedby="members-hint"
          />
          <span id="members-hint" className="hint">
            One per line, in the order they joined. Leftover cents go to the first names.
          </span>
        </label>
        <div className="actions">
          <button type="submit" className="btn btn-primary" disabled={!name.trim() || saving}>
            {saving ? 'Creating…' : progress ? 'Finish setup' : 'Create home'}
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <form className="open-home" onSubmit={open}>
        <label className="label" htmlFor="home-id">
          Already have a home? Paste its link or ID
        </label>
        <div className="inline">
          <input
            id="home-id"
            value={openId}
            onChange={(e) => setOpenId(e.target.value)}
            placeholder="http://localhost:5173/?homeId=…"
            spellCheck={false}
          />
          <button type="submit" className="btn" disabled={!openId.trim()}>
            Open
          </button>
        </div>
      </form>
    </div>
  )
}

// Accepts a bare home ID or a whole link copied with "Copy link".
function homeIdFrom(input: string): string {
  const value = input.trim()
  try {
    return new URL(value).searchParams.get('homeId')?.trim() ?? value
  } catch {
    return value
  }
}
