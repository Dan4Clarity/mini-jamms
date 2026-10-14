import { useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { updateReportStatus } from '@/api'
import type { Report } from '@/api'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatDateTime, REPORTS_TIME_ZONE_LABEL } from '@/reportDates'
import { REPORT_STATUSES } from '@/reportStatuses'
import { PROBLEM_TYPES, USER_TYPES } from '@/reportValidation'

// The look of the status drop-down. The same classes as the drop-downs on the
// report form (SELECT_CLASS in ReportForm.tsx), but with a fixed width (w-44)
// instead of filling the row. h-11 = 44px tall, comfortable to tap.
const STATUS_SELECT_CLASS =
  'h-11 w-44 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

// Looks up the label for a code, like a join to a lookup table. If the code
// is not in the list (the API has a value this page does not know about yet),
// the code itself is shown, so the cell is never blank.
function labelFor(
  options: { value: string; label: string }[],
  code: string,
): string {
  return options.find((option) => option.value === code)?.label ?? code
}

// "Props" are the inputs to a component, like parameters to a function.
type ReportRowProps = {
  report: Report
  // Called with the report the API sent back after a successful status change,
  // so the page can swap it into its list.
  onUpdated: (report: Report) => void
}

// One row of the admin table: the report's details and its status drop-down.
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
  // True if the API sent a status this page does not know (see labelFor).
  const statusIsUnknown = !REPORT_STATUSES.some(
    (option) => option.value === report.status,
  )

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
        {/* A "controlled" drop-down: it always shows the value given here. That
            is the status being saved if there is one, otherwise the status the
            server holds. All nine statuses are offered on purpose: the API,
            not this page, decides which changes are allowed. */}
        <select
          ref={selectRef}
          aria-label={`Status for report at ${report.location}, reported ${created} ${REPORTS_TIME_ZONE_LABEL}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={STATUS_SELECT_CLASS}
          value={savingStatus ?? report.status}
          disabled={savingStatus !== null}
          onChange={(event) => handleStatusChange(event.target.value)}
        >
          {statusIsUnknown && (
            <option value={report.status} disabled>
              {report.status}
            </option>
          )}
          {REPORT_STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* role="alert" makes screen readers read the message out when it
            appears. whitespace-pre-line keeps each line of a longer message on
            its own line. w-64 gives a long message (the status rule is a couple of
            sentences) room to read, a little wider than the drop-down. */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="mt-1 w-64 text-sm font-medium whitespace-pre-line text-destructive"
          >
            {error}
          </p>
        )}
      </TableCell>
    </TableRow>
  )
}
