# Design

## World

The ruled rent book flatmates once had stamped each week. Applied to a working screen through four things only: type, palette, density, and one signature move. Layout, navigation and controls stay standard web.

## Signature move

Paying a share presses a dated rubber stamp, `PAID 2 NOV`, onto that ledger row in violet stamp ink. Violet is reserved for paid stamps and appears nowhere else. The stamp animates only at the moment a payment succeeds, never on page load.

## Palette

Tokens live on `:root` in `src/styles.css`, with a dark set for `prefers-color-scheme: dark`.

- Paper ground and a slightly lighter sheet for the working areas.
- Blue-black ink for text, and ink blue for actions, links and focus.
- Warm hairline rules for table rows and borders. Rules are real table borders, never a background pattern.
- Violet stamp ink for paid only. Red for errors only.

## Type

- Newsreader for the home name and sheet titles.
- IBM Plex Sans for everything else, with tabular numerals for money.
- IBM Plex Mono only inside the stamp and for IDs, where the letters are data.
- Five sizes: 12 legends (tracked caps), 14 meta, 16 body, 20 sheet titles, 32 home name.

## Components

- Sheet: the one container. A sheet holds a bill, the members ledger, or a form. Sheets are never nested.
- Ledger table: member, share, status. Hairline row rules, amounts right-aligned.
- Member marker: the member's initial in a small square, the same on every bill.
- Leftover cent: a `+1¢` mark beside each share that received one of the remainder cents.
- States per share: unpaid (Pay), paying (busy button), failed (error line, Retry with the same key), paid (stamp).
