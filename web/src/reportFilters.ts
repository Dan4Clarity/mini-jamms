// The admin page's three filters, and the sentence that describes them.
// Nothing here filters any rows: the API does that. See getReports in api.ts.

import { formatDay } from '@/reportDates'
import { REPORT_STATUSES } from '@/reportStatuses'
import type { ReportStatus } from '@/reportStatuses'

// What the three filter controls hold. '' means "not set": it is the value of
// the "All statuses" option and of a date box that is empty or still missing
// its month or day. (A half-typed year is different: it gives a real date such
// as 0002-10-13, see hasUnfinishedDate below.) The dates are text in the form
// YYYY-MM-DD.
export type FilterValues = {
  status: ReportStatus | ''
  dateFrom: string
  dateTo: string
}

// All three filters cleared.
export const NO_FILTERS: FilterValues = { status: '', dateFrom: '', dateTo: '' }

// True if at least one filter is set.
export function hasFilters(filters: FilterValues): boolean {
  return filters.status !== '' || filters.dateFrom !== '' || filters.dateTo !== ''
}

// True while a year is still being typed into a date box. Typing "2026" makes
// the box report 0002-10-13, 0020-10-13, 0202-10-13 and then 2026-10-13: each
// is a real date, so without this check the page would ask the API four times
// and could flash "The From date must not be later than the To date." along
// the way.
export function hasUnfinishedDate(filters: FilterValues): boolean {
  // The year is the first four characters of YYYY-MM-DD.
  const unfinished = (day: string) =>
    day !== '' && Number(day.slice(0, 4)) < 1000
  return unfinished(filters.dateFrom) || unfinished(filters.dateTo)
}

// Describes the filters in plain English, for example
// "Open reports from 10/01/2026 to 10/13/2026". Returns null when no filter
// is set, because there is then nothing to describe.
export function describeFilters(filters: FilterValues): string | null {
  if (!hasFilters(filters)) return null

  // "Open reports", "In progress reports", or just "Reports" for all statuses.
  const statusLabel = REPORT_STATUSES.find(
    (option) => option.value === filters.status,
  )?.label
  const subject = statusLabel ? `${statusLabel} reports` : 'Reports'

  const from = filters.dateFrom ? formatDay(filters.dateFrom) : ''
  const to = filters.dateTo ? formatDay(filters.dateTo) : ''

  if (from && to) {
    // The same day in both boxes reads better as "on" than "from X to X".
    if (from === to) return `${subject} on ${from}`
    return `${subject} from ${from} to ${to}`
  }
  if (from) return `${subject} from ${from}`
  if (to) return `${subject} up to ${to}`
  return subject
}
