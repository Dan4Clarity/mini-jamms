// How dates are shown on the admin page.
//
// THE TIME ZONE MIRRORS THE API. REPORTS_TIME_ZONE below must match
// REPORTS_TIME_ZONE in api/reports.py. The API's date filters (date_from,
// date_to) mean calendar days in that zone, so the Created column is shown in
// the same zone, whatever zone the viewer's own computer or phone is set to.
// Otherwise a report could be listed under "10/13" by the filter and shown as
// "10/14" in the table. If the API's zone changes, change both constants here.
export const REPORTS_TIME_ZONE = 'America/New_York'

// The short name for that zone, shown in labels and headings ("Created (ET)").
// ET = Eastern Time, which covers both winter (EST) and summer (EDT) time.
export const REPORTS_TIME_ZONE_LABEL = 'ET'

// Intl.DateTimeFormat is built into the browser, so no extra library is
// needed. 'en-US' with these options gives month/day/year and a 12-hour
// clock, for example "10/13/2026, 7:53 PM". timeZone pins the result to the
// reports' zone instead of the viewer's own.
const CREATED_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: REPORTS_TIME_ZONE,
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

// Turns the API's date and time text ("2026-10-13T23:53:00Z") into something
// readable in the reports' time zone ("10/13/2026, 7:53 PM").
export function formatDateTime(isoText: string): string {
  const date = new Date(isoText)
  // If the text is not a date at all, show it as it came rather than crash.
  if (Number.isNaN(date.getTime())) return isoText
  return CREATED_FORMAT.format(date)
}

// Turns a date box's value ("2026-10-13") into "10/13/2026".
//
// This is done by cutting the text up, NOT with new Date("2026-10-13"). That
// would read the text as midnight in UTC, and showing it in a zone west of
// UTC would then give the day before. A filter date is a plain calendar day
// with no time of day, so there is nothing to convert.
export function formatDay(day: string): string {
  const [year, month, date] = day.split('-')
  // Not in the expected form: show it as it came.
  if (!year || !month || !date) return day
  return `${month}/${date}/${year}`
}
