// The colour of each report status. THE ONE PLACE the status colours are
// decided: the status drop-down in the admin table (ReportRow.tsx) and the
// status pill (StatusPill.tsx) both ask here, so they can never disagree.
//
// This is a plain file rather than part of StatusPill.tsx because a file that
// holds a component should export only components (the development server's
// instant reload depends on it, and the lint check enforces it).

import { REPORT_STATUSES } from '@/reportStatuses'
import type { ReportStatus } from '@/reportStatuses'

// The colours of one status "look", as Tailwind classes.
//   fill   = the background, and the text colour that goes on it.
//   border = an outline in the same colour family, dark enough to show where
//            the edge is. The drop-down uses it. (The pill does not: it has
//            never had a coloured outline.)
export type StatusLook = {
  fill: string
  border: string
}

// The four tinted looks, plus solid navy for "closed". The colours come from
// the theme in index.css. "/15" and so on is the strength: bg-navy/15 is navy
// at 15%, a pale tint. The text is navy on every tint so it stays easy to read.
export const NEUTRAL_LOOK: StatusLook = {
  fill: 'bg-muted text-foreground',
  border: 'border-input',
}
const NAVY_TINT: StatusLook = {
  fill: 'bg-navy/15 text-navy',
  border: 'border-navy/60',
}
const GOLD_TINT: StatusLook = {
  fill: 'bg-gold/35 text-navy',
  border: 'border-gold-deep',
}
const SAGE_TINT: StatusLook = {
  fill: 'bg-sage/25 text-navy',
  border: 'border-sage-deep',
}
const SOLID_NAVY: StatusLook = {
  fill: 'bg-navy text-white',
  border: 'border-navy',
}

// Which look each status gets, like a lookup table keyed on the status code.
// Record<ReportStatus, StatusLook> makes TypeScript insist on one entry for
// each of the nine statuses: add a status to reportStatuses.ts and the build
// fails here until it is given a look.
const STATUS_LOOKS: Record<ReportStatus, StatusLook> = {
  open: NEUTRAL_LOOK,
  pending: NEUTRAL_LOOK,
  scheduled: NAVY_TINT,
  released: NAVY_TINT,
  in_progress: GOLD_TINT,
  rework: GOLD_TINT,
  rework_completed: SAGE_TINT,
  completed: SAGE_TINT,
  closed: SOLID_NAVY,
}

// The look for a status code as the API sent it, for example "in_progress".
// A code this page does not know (the API has a status that is not in
// reportStatuses.ts yet) gets the neutral grey look.
export function statusLook(status: string): StatusLook {
  const known = REPORT_STATUSES.find((option) => option.value === status)
  return known ? STATUS_LOOKS[known.value] : NEUTRAL_LOOK
}
