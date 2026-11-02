# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: internship reviewers who watch a three-minute video of the app and then open it themselves. They judge whether money is handled correctly and whether every state (loading, empty, error, paid, failed payment) is clear and safe.
Secondary, as the story the app tells: flatmates in one shared home who split a bill and each pay their own share.

## Product Purpose

Split a shared bill between the members of a home in whole cents, so the shares always add up to the total, and let each member pay their share exactly once, even when requests repeat or race. Success: a reviewer can see, at a glance, who owes what, what was paid, and what happens when something fails.

## Positioning

Exact to the cent. Leftover cents go to members in the order they joined, and a payment can never happen twice.

## Constraints

- One page. React, Vite, TanStack Router. Plain CSS, no UI library.
- Must work in light and dark, and at phone width.
- Behaviour and data flow are fixed: create home, add members, add bill, pay, retry with the same Idempotency-Key.
- Must not feel flashy or gimmicky, and must not look like a generic starter template.
