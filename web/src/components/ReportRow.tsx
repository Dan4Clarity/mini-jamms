import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { updateReportStatus } from '@/api'
import type { Report } from '@/api'
import { ChevronDownIcon } from 'lucide-react'
import { NativeSelect } from '@/components/NativeSelect'
import { TableCell, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatDateTime, REPORTS_TIME_ZONE_LABEL } from '@/reportDates'
import { labelFor } from '@/reportLabels'
import { REPORT_STATUSES } from '@/reportStatuses'
import { PROBLEM_TYPES, USER_TYPES } from '@/reportValidation'
import { statusLook } from '@/statusLooks'

// The width of the status drop-down, and of the error message under it.
// "ch" is the width of the digit 0 in the current font. The longest label,
// "Rework completed", has 16 characters; 18ch leaves a deliberate margin,
// because R, w and m are wider than a 0 and fonts differ between devices
// (the fit is tightest in Windows' Segoe UI). 3.5rem (56px) is added for the
// padding either side and the arrow. If a longer status label is ever added,
// raise the 18 to its length plus 2. A status code the page does not know
// that is longer than this is cut off in the closed drop-down.
const STATUS_WIDTH = 'w-[calc(18ch+3.5rem)]'

// Added to the shared drop-down look (NativeSelect.tsx) for the status
// drop-down, which is filled with the status colour:
// - w-full = as wide as the box around it (STATUS_WIDTH).
// - appearance-none removes the browser's own arrow, which is dark and would
//   not show on the navy "Closed" fill. An arrow is drawn over the drop-down
//   instead (see below); pr-9 keeps the text clear of it.
// - focus-visible:* = the keyboard focus outline: a solid navy ring with a
//   2px white gap (ring-offset-2) between it and the drop-down, so it shows
//   on every fill, including solid navy.
// - aria-invalid:* = when a change was refused: a solid red ring round the
//   red border, strong enough to see against a coloured fill. If the keyboard
//   focus is also on it, the navy focus ring is shown outside the red border.
const STATUS_SELECT_CLASS =
  'w-full appearance-none pr-9 focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2 aria-invalid:ring-2 aria-invalid:ring-destructive aria-invalid:focus-visible:ring-navy'

// The entries of the opened list get a plain white background and dark text.
// Some browsers would otherwise give them the drop-down's own colours, for
// example white text on navy for every entry of a "Closed" row.
const OPTION_CLASS = 'bg-background text-foreground'

// "Props" are the inputs to a component, like parameters to a function.
type ReportRowProps = {
  report: Report
  // Called with the report the API sent back after a successful status change,
  // so the page can swap it into its list.
  onUpdated: (report: Report) => void
}

// One row of the admin table: the report's details and the drop-down that
// shows its status, in the status colour, and changes it.
// Each row keeps its own "saving" and "error" state, so one row waiting for
// the API, or showing an error, does not affect the others.
export function ReportRow({ report, onUpdated }: ReportRowProps) {
  // The status that was just picked and is being saved, or null when nothing
  // is being saved. While it is set, the drop-down shows it and is disabled.
  const [savingStatus, setSavingStatus] = useState<string | null>(null)
  // The API's message if the last change was refused or failed, otherwise null.
  const [error, setError] = useState<string | null>(null)
  // A ref gives the code below a handle on the real <select> element on the
  // page, so it can put the keyboard focus back on it (see handleStatusChange).
  const selectRef = useRef<HTMLSelectElement>(null)

  // When the report was made, in the reports' time zone (Eastern Time), not
  // the viewer's own. Example: "10/13/2026, 7:53 PM". See reportDates.ts.
  const created = formatDateTime(report.created_at)
  const errorId = `status-error-${report.id}`
  // True if the API sent a status this page does not know (see labelFor in
  // reportLabels.ts).
  const statusIsUnknown = !REPORT_STATUSES.some(
    (option) => option.value === report.status,
  )
  // The status the drop-down shows: the one being saved if there is one,
  // otherwise the one the server holds.
  const shownStatus = savingStatus ?? report.status
  // THE COLOUR FOLLOWS WHAT THE DROP-DOWN SHOWS, so the words and the colour
  // always agree. While a change is being saved that is the colour of the
  // status just picked (faded, because the drop-down is disabled). If the API
  // accepts the change it stays; if the API refuses, the drop-down goes back
  // to the server's status and so does the colour.
  const look = statusLook(shownStatus)

  // "async" lets this function wait for the API with "await" (see api.ts).
  async function handleStatusChange(chosen: string) {
    // The drop-down only offers the nine known statuses, so this always finds
    // one. Looking it up also tells TypeScript that it is a real status code.
    const status = REPORT_STATUSES.find((option) => option.value === chosen)
    if (!status) return

    setSavingStatus(status.value)
    setError(null) // clear the message from an earlier failed change

    try {
      const updated = await updateReportStatus(report.id, status.value)
      onUpdated(updated)
    } catch (caught) {
      // The API refused the change (409: the status rule), or the request
      // failed some other way. Either way the report has NOT changed, so show
      // why. Clearing savingStatus below puts the drop-down back to the status
      // the server still holds.
      setError(
        caught instanceof Error ? caught.message : 'Please try again.',
      )
    } finally {
      // flushSync makes React re-draw straight away, so the drop-down is
      // enabled again before the next line runs.
      flushSync(() => setSavingStatus(null))
      // A browser takes the keyboard focus away from a drop-down when it is
      // disabled, which would send a keyboard user back to the top of the
      // page. If the focus is still nowhere (the person has not moved on to
      // something else), put it back on this drop-down.
      if (document.activeElement === document.body) selectRef.current?.focus()
    }
  }

  return (
    <TableRow>
      <TableCell>
        {/* <time> keeps the exact date in a form programs can read. The text
            shown is Eastern Time; the column heading says so. */}
        <time dateTime={report.created_at}>{created}</time>
      </TableCell>
      <TableCell>{labelFor(PROBLEM_TYPES, report.problem_type)}</TableCell>
      {/* Location and name are free text and can be long, so these two cells
          may wrap (whitespace-normal) instead of making the table very wide.
          min-w-* stops them being squeezed too narrow; break-words splits a
          very long word. */}
      <TableCell className="min-w-48 break-words whitespace-normal">
        {report.location}
      </TableCell>
      <TableCell className="min-w-32 break-words whitespace-normal">
        {report.reporter_name}
      </TableCell>
      <TableCell>{labelFor(USER_TYPES, report.user_type)}</TableCell>
      <TableCell className="whitespace-normal">
        {/* This box sets the width of the drop-down and of the error message
            under it. */}
        <div className={STATUS_WIDTH}>
          {/* "relative" lets the arrow be placed over the drop-down. While a
              change is being saved the drop-down and its arrow are faded
              together (opacity-60). */}
          <div className={cn('relative', savingStatus !== null && 'opacity-60')}>
            {/* A "controlled" drop-down: it always shows the value given here
                (shownStatus, see above). All nine statuses are offered on
                purpose: the API, not this page, decides which changes are
                allowed. look.fill and look.border colour it by status. */}
            <NativeSelect
              ref={selectRef}
              aria-label={`Status for report at ${report.location}, reported ${created} ${REPORTS_TIME_ZONE_LABEL}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              className={cn(STATUS_SELECT_CLASS, look.fill, look.border)}
              value={shownStatus}
              disabled={savingStatus !== null}
              onChange={(event) => handleStatusChange(event.target.value)}
            >
              {statusIsUnknown && (
                <option value={report.status} disabled className="bg-background">
                  {report.status}
                </option>
              )}
              {REPORT_STATUSES.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  className={OPTION_CLASS}
                >
                  {option.label}
                </option>
              ))}
            </NativeSelect>
            {/* The arrow: a small drawing placed at the right-hand edge,
                centred top to bottom. It is drawn in the same text colour as
                the drop-down (look.fill sets the colour; its background is
                switched off again with bg-transparent), so it is white on
                navy. pointer-events-none lets a click pass through to the
                drop-down underneath; aria-hidden hides it from screen
                readers, as it is only decoration. */}
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                'pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2',
                look.fill,
                'bg-transparent',
              )}
            />
          </div>
          {/* role="alert" makes screen readers read the message out when it
              appears. whitespace-pre-line keeps each line of a longer message
              on its own line. The message is as wide as the drop-down. */}
          {error && (
            <p
              id={errorId}
              role="alert"
              className="mt-2 text-sm font-medium whitespace-pre-line text-destructive"
            >
              {error}
            </p>
          )}
        </div>
      </TableCell>
    </TableRow>
  )
}
