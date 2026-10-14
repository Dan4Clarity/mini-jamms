import { useEffect, useState } from 'react'
import { ApiError, getReports } from '@/api'
import type { Report } from '@/api'
import { ErrorBox } from '@/components/ErrorBox'
import { FilterBar } from '@/components/FilterBar'
import { PageLayout } from '@/components/PageLayout'
import { Pagination } from '@/components/Pagination'
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
import { REPORTS_TIME_ZONE_LABEL } from '@/reportDates'
import {
  describeFilters,
  hasFilters,
  hasUnfinishedDate,
  NO_FILTERS,
} from '@/reportFilters'
import type { FilterValues } from '@/reportFilters'
import { describeCount, pageSlice } from '@/reportPages'

// The list the API sent, kept together with the filters that produced it and
// the page of it being shown. They are stored as one value so they can never
// get out of step: the count, the summary and the page number around the table
// are always worked out from this one value, never from whatever the filter
// controls happen to show at the moment.
type LoadedReports = {
  reports: Report[]
  filters: FilterValues
  // Which page of "reports" the table shows, counting from 1. Every newly
  // loaded list starts at page 1.
  page: number
}

// Why the latest load failed.
type LoadFailure = {
  message: string
  // True if the API answered and refused the filter values (422), for example
  // From later than To. False for anything else, such as the API being down.
  rejected: boolean
}

// The admin page at "/admin": the reports in a table, newest first, with
// filters above it and a drop-down on each row to change its status.
export function AdminPage() {
  // What the three filter controls show right now.
  const [filters, setFilters] = useState<FilterValues>(NO_FILTERS)
  // The latest list that loaded successfully, or null before the first one.
  const [loaded, setLoaded] = useState<LoadedReports | null>(null)
  // Set if the latest load failed, otherwise null.
  const [failure, setFailure] = useState<LoadFailure | null>(null)
  // True while a request for a new list is on its way.
  const [refetching, setRefetching] = useState(false)
  // How many times "Try again" has been pressed. Changing it re-runs the
  // effect below, which loads the list again.
  const [attempt, setAttempt] = useState(0)

  // useEffect runs code AFTER React has drawn the component. It is for work
  // that reaches outside the page, here asking the API for the reports.
  // (Calling the API directly in the component body would be wrong: the body
  // runs again on every re-draw, so it would ask again and again.)
  //
  // The list at the end, [filters, attempt], says when to run it again: once
  // when the page first appears, and then only when the filters change or
  // "Try again" is pressed. The API does the filtering, like a WHERE clause;
  // this page never removes rows itself.
  useEffect(() => {
    // A year is still being typed into a date box (see hasUnfinishedDate):
    // wait for the finished date instead of asking the API about year 0002.
    if (hasUnfinishedDate(filters)) return

    // The function returned at the bottom is the "clean-up". React calls it
    // when the page is left, or just before running the effect again. It sets
    // this flag so that an answer arriving too late is thrown away instead of
    // being stored. That matters here: if the filters change twice quickly,
    // the answer to the first request can arrive AFTER the answer to the
    // second, and must not replace it. Each run of the effect has its own
    // "ignore", and only the newest run's is still false.
    // (In development React deliberately runs every effect twice to check this
    // is handled, so two GET requests appear there and the first answer is
    // ignored. The built site asks once.)
    let ignore = false

    // getReports() returns a Promise (see api.ts). then() takes two functions:
    // the first runs when the reports arrive, the second if the call failed.
    getReports(filters).then(
      (reports) => {
        if (ignore) return
        // A new list always starts at page 1. This is what takes the table
        // back to page 1 when a filter changes (or is cleared): the old list
        // stays on screen, on the page it was on, until the new one arrives,
        // and then the rows, the filters and the page number are all replaced
        // in this one step.
        setLoaded({ reports, filters, page: 1 })
        setFailure(null)
        setRefetching(false)
      },
      (error: unknown) => {
        if (ignore) return
        // "loaded" is left alone, so the rows already on screen stay there.
        setFailure({
          message: error instanceof Error ? error.message : 'Please try again.',
          rejected: error instanceof ApiError && error.status === 422,
        })
        setRefetching(false)
      },
    )

    return () => {
      ignore = true
    }
  }, [filters, attempt])

  // A filter control changed (or "Clear filters" was pressed). Storing the new
  // values re-runs the effect above, which asks the API for the matching list.
  // While a year is half typed nothing is asked, so "Loading…" is not shown.
  function handleFiltersChange(next: FilterValues) {
    setFilters(next)
    setRefetching(!hasUnfinishedDate(next))
  }

  // Asks the API again with the same filters. Used by both "Try again"
  // buttons: the one on the full-page error before anything has loaded, and
  // the one in the filter bar when a later load could not reach the server.
  function handleTryAgain() {
    setFailure(null)
    setRefetching(!hasUnfinishedDate(filters))
    setAttempt((current) => current + 1)
  }

  // Swaps one report for the copy the API sent back after a status change.
  // map() builds a new list with every other report untouched and in the same
  // position, so the rows do not move and nothing is fetched again. (The API
  // sends the list newest first, ORDER BY created_at DESC, and created_at
  // never changes, so the order stays right without sorting here.)
  //
  // Nothing is filtered here either: if a status filter is on and the row's
  // new status no longer matches it, the row stays until the next load. If the
  // list was loaded again in the meantime and the report is no longer in it,
  // no id matches and the list is left as it is.
  function handleReportUpdated(updated: Report) {
    setLoaded(
      (current) =>
        current && {
          ...current,
          reports: current.reports.map((report) =>
            report.id === updated.id ? updated : report,
          ),
        },
    )
  }

  // Previous or Next was pressed (see Pagination.tsx). Only the page number
  // changes: nothing is asked of the API.
  function handlePageChange(page: number) {
    setLoaded((current) => current && { ...current, page })
  }

  // CLIENT-SIDE PAGINATION, a deliberate proof-of-concept simplification: the
  // API returns every matching report and the browser shows 20 (PAGE_SIZE) of
  // them at a time. Production would page in the query instead, with LIMIT and
  // OFFSET, and COUNT(*) OVER () for the total.
  //
  // Everything here is worked out again on every re-draw from the loaded list
  // and its page number; none of it is stored. pageSlice (reportPages.ts) also
  // pulls the page number back into range, so the table can never show an
  // empty page while rows exist.
  const total = loaded?.reports.length ?? 0
  const slice = pageSlice(total, loaded?.page ?? 1)
  // slice(start, end) copies that run of rows, like OFFSET start with a LIMIT.
  // The rows keep the order the API sent them in.
  const visibleReports = loaded?.reports.slice(slice.start, slice.end) ?? []
  const summary = loaded ? describeFilters(loaded.filters) : null

  return (
    // PageLayout adds the shared header and footer around the page. "wide"
    // lets the heading, the filters and the table use a wide screen.
    <PageLayout navTo="/" navLabel="Report a problem" width="wide">
      {/* text-3xl on a phone, a size larger from tablet width up (sm:). */}
      <h1 className="mb-6 text-3xl sm:mb-8 sm:text-4xl">Reports</h1>

      {/* Before the first list has loaded, one of the next two blocks is
          shown. After that, the filters and the list are shown instead. */}

      {/* role="status" asks screen readers to read this out when it appears. */}
      {loaded === null && failure === null && (
        <p role="status" className="text-muted-foreground">
          Loading reports…
        </p>
      )}

      {/* ErrorBox is the red box; it has role="alert", which makes screen
          readers read it out at once. */}
      {loaded === null && failure !== null && (
        <ErrorBox>
          <p className="font-semibold">The reports could not be loaded.</p>
          <p className="whitespace-pre-line">{failure.message}</p>
          {/* mt-2 = a little more space above the button; self-start stops
              it stretching to the full width of the box. */}
          <Button
            type="button"
            variant="outline"
            className="mt-2 self-start"
            onClick={handleTryAgain}
          >
            Try again
          </Button>
        </ErrorBox>
      )}

      {loaded !== null && (
        <>
          {/* If a load with new filters fails, the message goes in the filter
              bar and the rows below stay as they were. */}
          <FilterBar
            filters={filters}
            onChange={handleFiltersChange}
            error={failure?.message ?? null}
            rejected={failure?.rejected ?? false}
            onRetry={handleTryAgain}
          />

          {/* The count ("Showing 21-40 of 47 reports", or "Showing 4 reports"
              when there is only one page), and which filters the rows below
              came from. While a new list is on its way the old rows stay on
              screen and "Loading…" is added here. role="status" asks screen
              readers to read the line out when it changes, which now includes
              moving to another page. */}
          <p role="status" className="mb-4">
            {describeCount(total, slice)}
            {summary !== null && `: ${summary}`}.
            {refetching && (
              <span className="text-muted-foreground"> Loading…</span>
            )}
          </p>

          {loaded.reports.length === 0 && (
            <p className="text-muted-foreground">
              {hasFilters(loaded.filters)
                ? 'No reports match these filters.'
                : 'No reports yet.'}
            </p>
          )}

          {loaded.reports.length > 0 && (
            // Table (ui/table.tsx) wraps the <table> in a box that scrolls
            // sideways on its own (overflow-x-auto), so on a phone the table
            // scrolls inside the box instead of making the whole page wider.
            // The table's look (navy heading row, lines between rows) is set
            // in ui/table.tsx.
            <Table>
              {/* The caption names the table for screen readers. caption-top
                  puts it above the heading row; px-3 py-3 = padding inside
                  the table's outline. */}
              <TableCaption className="mt-0 caption-top px-3 py-3 text-left">
                Newest first. Change a report&apos;s status with the list in
                its row.
              </TableCaption>
              <TableHeader>
                <TableRow>
                  {/* scope="col" says each heading describes its whole column. */}
                  <TableHead scope="col">
                    Created ({REPORTS_TIME_ZONE_LABEL})
                  </TableHead>
                  <TableHead scope="col">Problem type</TableHead>
                  <TableHead scope="col">Location</TableHead>
                  <TableHead scope="col">Reporter</TableHead>
                  <TableHead scope="col">User type</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* One ReportRow per report on this page. "key" tells React
                    which row is which (like a primary key), so each row keeps
                    its own state while it is on screen. Moving to another
                    page removes this page's rows, so a row's error message
                    is gone if the person comes back to it. */}
                {visibleReports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onUpdated={handleReportUpdated}
                  />
                ))}
              </TableBody>
            </Table>
          )}

          {/* Previous / "Page 2 of 3" / Next. Draws nothing when there is
              only one page. */}
          <Pagination
            page={slice.page}
            pageCount={slice.pageCount}
            onPageChange={handlePageChange}
          />
        </>
      )}
    </PageLayout>
  )
}
