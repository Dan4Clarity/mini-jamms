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

// ---------------------------------------------------------------------------
// Dates for the downloads (CSV and PDF). See reportExport.ts and reportPdf.ts.
// ---------------------------------------------------------------------------

// Browsers put a NARROW NO-BREAK SPACE (the character U+202F), not an ordinary
// space, between the time and "AM"/"PM". On screen the two look the same, but
// a spreadsheet does not treat it as a space and the PDF's built-in font
// cannot draw it. This swaps it for an ordinary space, for text that is
// leaving the browser in a file.
export function withPlainSpaces(text: string): string {
  return text.replaceAll('\u202F', ' ')
}

// The same zone as CREATED_FORMAT above, but every part is two digits
// (hour: '2-digit' gives "07", not "7") so the CSV's date columns line up and
// sort as text within a day.
const EXPORT_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: REPORTS_TIME_ZONE,
  month: '2-digit',
  day: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
})

// Just the calendar day, for "today" in the reports' zone.
const DAY_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: REPORTS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// formatToParts() gives the date as separate pieces instead of one finished
// string: [{type: 'month', value: '10'}, {type: 'literal', value: '/'}, ...].
// This returns the value of one piece, for example partOf(parts, 'month').
// Taking the pieces and joining them ourselves means the result does not
// depend on which commas and spaces the browser would have put between them.
function partOf(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((part) => part.type === type)?.value ?? ''
}

// Turns the API's date and time text ("2026-10-13T23:53:00Z") into the form
// used in the CSV file: "10/13/2026 07:53 PM". Eastern Time, two-digit hour,
// no comma, and ordinary spaces only.
export function formatDateTimeForCsv(isoText: string): string {
  const date = new Date(isoText)
  // If the text is not a date at all, pass it on as it came rather than crash.
  if (Number.isNaN(date.getTime())) return isoText
  const parts = EXPORT_FORMAT.formatToParts(date)
  const day = `${partOf(parts, 'month')}/${partOf(parts, 'day')}/${partOf(parts, 'year')}`
  const time = `${partOf(parts, 'hour')}:${partOf(parts, 'minute')}`
  return `${day} ${time} ${partOf(parts, 'dayPeriod')}`
}

// Today's date in the reports' zone as YYYY-MM-DD, for download file names.
// Not the viewer's own date and not UTC: at 9 PM in New York it is already
// tomorrow in UTC, and the file should carry the New York date.
// "now" can be passed in so the function can be checked with a known moment.
export function todayInReportsZone(now: Date = new Date()): string {
  const parts = DAY_FORMAT.formatToParts(now)
  return `${partOf(parts, 'year')}-${partOf(parts, 'month')}-${partOf(parts, 'day')}`
}
