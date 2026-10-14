import { useEffect, useState } from 'react'
import { getReports } from '@/api'
import type { Report } from '@/api'
import { ReportRow } from '@/components/ReportRow'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCaption,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// The admin page at "/admin": every report in a table, newest first, with a
// drop-down on each row to change its status.
export function AdminPage() {
  // The reports from the API, or null while they have not arrived yet.
  const [reports, setReports] = useState<Report[] | null>(null)
  // The message to show if loading failed, otherwise null.
  const [loadError, setLoadError] = useState<string | null>(null)
  // How many times "Try again" has been pressed. Changing it re-runs the
  // effect below, which loads the list again.
  const [attempt, setAttempt] = useState(0)

  // useEffect runs code AFTER React has drawn the component. It is for work
  // that reaches outside the page, here asking the API for the reports.
  // (Calling the API directly in the component body would be wrong: the body
  // runs again on every re-draw, so it would ask again and again.)
  //
  // The list at the end, [attempt], says when to run it again: once when the
  // page first appears, and then only when "attempt" changes.
  useEffect(() => {
    // The function returned at the bottom is the "clean-up". React calls it
    // when the page is left, or just before running the effect again. It sets
    // this flag so that an answer arriving too late is thrown away instead of
    // being stored. (In development React deliberately runs every effect
    // twice to check this is handled, so two GET requests appear there and the
    // first answer is ignored. The built site asks once.)
    let ignore = false

    // getReports() returns a Promise (see api.ts). then() takes two functions:
    // the first runs when the reports arrive, the second if the call failed.
    getReports().then(
      (loaded) => {
        if (!ignore) setReports(loaded)
      },
      (error: unknown) => {
        if (!ignore) {
          setLoadError(
            error instanceof Error ? error.message : 'Please try again.',
          )
        }
      },
    )

    return () => {
      ignore = true
    }
  }, [attempt])

  // Back to the "loading" state, then load again.
  function handleTryAgain() {
    setLoadError(null)
    setAttempt((current) => current + 1)
  }

  // Swaps one report for the copy the API sent back after a status change.
  // map() builds a new list with every other report untouched and in the same
  // position, so the rows do not move and nothing is fetched again. (The API
  // sends the list newest first, ORDER BY created_at DESC, and created_at
  // never changes, so the order stays right without sorting here.)
  function handleReportUpdated(updated: Report) {
    setReports(
      (current) =>
        current?.map((report) =>
          report.id === updated.id ? updated : report,
        ) ?? null,
    )
  }

  return (
    // max-w-6xl lets the table use a wide screen; mx-auto centres the column.
    // px-4 / py-6 = padding on a phone; sm: applies from tablet width up.
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-semibold">Reports</h1>

      {/* Exactly one of the four blocks below is shown. */}

      {/* role="status" asks screen readers to read this out when it appears. */}
      {reports === null && loadError === null && (
        <p role="status" className="text-base text-muted-foreground">
          Loading reports…
        </p>
      )}

      {/* role="alert" makes screen readers read it out at once. */}
      {loadError !== null && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive p-3 text-base text-destructive"
        >
          <p className="font-medium">The reports could not be loaded.</p>
          <p className="whitespace-pre-line">{loadError}</p>
          <Button
            type="button"
            variant="outline"
            className="h-11 self-start px-6 text-base text-foreground"
            onClick={handleTryAgain}
          >
            Try again
          </Button>
        </div>
      )}

      {reports !== null && reports.length === 0 && (
        <p className="text-base text-muted-foreground">No reports yet.</p>
      )}

      {reports !== null && reports.length > 0 && (
        // Table (ui/table.tsx) wraps the <table> in a box that scrolls
        // sideways on its own (overflow-x-auto), so on a phone the table
        // scrolls inside the box instead of making the whole page wider.
        <Table>
          {/* The caption names the table for screen readers. caption-top puts
              it above the table. */}
          <TableCaption className="mt-0 mb-2 caption-top text-left">
            All reports, newest first. Change a report&apos;s status with the
            list in its row.
          </TableCaption>
          <TableHeader>
            <TableRow>
              {/* scope="col" says each heading describes its whole column. */}
              <TableHead scope="col">Created</TableHead>
              <TableHead scope="col">Problem type</TableHead>
              <TableHead scope="col">Location</TableHead>
              <TableHead scope="col">Reporter</TableHead>
              <TableHead scope="col">User type</TableHead>
              <TableHead scope="col">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* One ReportRow per report. "key" tells React which row is which
                (like a primary key), so each row keeps its own state. */}
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onUpdated={handleReportUpdated}
              />
            ))}
          </TableBody>
        </Table>
      )}
    </main>
  )
}
