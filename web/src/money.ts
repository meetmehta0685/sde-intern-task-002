const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Display only. Amounts are kept and sent as whole cents everywhere else.
export function formatCents(cents: number): string {
  return formatter.format(cents / 100)
}

// Turns "12", "12.3" or "12.34" into whole cents without going through a float,
// so "0.29" becomes 29 and not 28.999…. Returns null for anything else.
export function parseDollarsToCents(input: string): number | null {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim())
  if (!match) return null
  const dollars = Number(match[1])
  const cents = Number((match[2] ?? '').padEnd(2, '0'))
  const total = dollars * 100 + cents
  return Number.isSafeInteger(total) && total > 0 ? total : null
}
