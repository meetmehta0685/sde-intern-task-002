export type SplitShare<T> = { member: T; amountCents: number }

// Splits `totalCents` between `members` in whole cents. The shares always add up to the
// total: everyone gets the same base amount, and the leftover cents go one each to the
// first members, in the order given. Example: 1000 between 3 members → 334, 333, 333.
export function splitCents<T>(totalCents: number, members: readonly T[]): SplitShare<T>[] {
  const base = Math.floor(totalCents / members.length)
  const remainder = totalCents % members.length
  return members.map((member, index) => ({
    member,
    amountCents: index < remainder ? base + 1 : base,
  }))
}
