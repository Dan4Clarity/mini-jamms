import { cn } from '@/lib/utils'
import { REPORT_STATUSES } from '@/reportStatuses'
import { NEUTRAL_LOOK, statusLook } from '@/statusLooks'

// "Props" are the inputs to a component, like parameters to a function.
type StatusPillProps = {
  // A status code as the API sent it, for example "in_progress".
  status: string
}

// A small rounded label showing a report's status, for example "In progress".
// The colour is only a hint: the label text is always there, so the status
// can be read without seeing the colour. The colours come from statusLooks.ts,
// the same lookup the admin table's status drop-down uses.
//
// A code this page does not know (the API has a status that is not in
// reportStatuses.ts yet) is shown as it came, in the neutral grey look.
//
// KEEP THIS FILE: nothing uses the pill at the moment (the admin table colours
// its drop-down instead), but the planned PDF export will. It is not dead code.
export function StatusPill({ status }: StatusPillProps) {
  const known = REPORT_STATUSES.find((option) => option.value === status)
  const look = statusLook(status)

  return (
    <span
      className={cn(
        'inline-flex h-7 items-center rounded-full border px-3 text-sm font-semibold whitespace-nowrap',
        look.fill,
        // The pill's own outline: a faint grey line round the neutral grey
        // pill, none round the coloured ones.
        look === NEUTRAL_LOOK ? 'border-border' : 'border-transparent',
      )}
    >
      {known ? known.label : status}
    </span>
  )
}
