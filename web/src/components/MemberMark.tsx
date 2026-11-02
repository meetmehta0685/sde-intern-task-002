// The member's initial in a small square, so the same person reads the same on every bill.
export function MemberMark({ name }: { name: string }) {
  return (
    <span className="mark" aria-hidden="true">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
