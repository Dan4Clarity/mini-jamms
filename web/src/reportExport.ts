// The "Download CSV" file, and the pieces the PDF download shares with it
// (the file name and the code that hands a file to the browser).
//
// Nothing here asks the API for anything: the downloads are built from the
// list the admin page has already loaded. See AdminPage.tsx.
//
// The PDF itself is built in reportPdf.ts, which is kept out of this file on
// purpose: that file pulls in a large PDF library and is only downloaded when
// "Download PDF" is pressed.

import type { Report } from '@/api'
import { formatDateTimeForCsv, todayInReportsZone } from '@/reportDates'
import { labelFor } from '@/reportLabels'
import { REPORT_STATUSES } from '@/reportStatuses'
import { PROBLEM_TYPES, USER_TYPES } from '@/reportValidation'

// The CSV's heading row, in column order. The table on screen leaves out
// Description and Contact; a spreadsheet is where someone wants them.
export const CSV_HEADERS = [
  'Created (ET)',
  'Problem type',
  'Location',
  'Description',
  'Reporter',
  'Contact',
  'User type',
  'Status',
  'Updated (ET)',
]

// The values of one report, in the same order as CSV_HEADERS. The three codes
// are swapped for their labels ("in_progress" -> "In progress"), like joins to
// lookup tables; a code this page does not know is passed on as it is. The
// free-text fields are passed on exactly as the API sent them.
function csvValues(report: Report): string[] {
  return [
    formatDateTimeForCsv(report.created_at),
    labelFor(PROBLEM_TYPES, report.problem_type),
    report.location,
    report.description,
    report.reporter_name,
    report.reporter_contact,
    labelFor(USER_TYPES, report.user_type),
    labelFor(REPORT_STATUSES, report.status),
    formatDateTimeForCsv(report.updated_at),
  ]
}

// Makes one value safe to put between the commas of a CSV file, following
// the usual CSV rules (RFC 4180):
//   - a value containing a comma, a double quote or a line break is wrapped
//     in double quotes, so the comma or line break is read as part of the
//     value and not as the end of it;
//   - inside those quotes, each double quote is written twice.
//
//   escapeCsvField('Main St')           -> Main St
//   escapeCsvField('Main St, by no. 4') -> "Main St, by no. 4"
//   escapeCsvField('the "big" one')     -> "the ""big"" one"
//
// Spaces at either end and line breaks are kept.
//
// FORMULA INJECTION. These values come from a public form that anyone can
// fill in. A spreadsheet treats a cell that starts with = + - or @ as a
// formula, so a report whose description was "=HYPERLINK(...)" would run as
// one on the computer of whoever opens the file. To stop that, a value whose
// first character is  =  +  -  @  tab  or carriage return  gets a single
// apostrophe put in front. The apostrophe tells the spreadsheet "this cell is
// text"; Excel does not display it in the cell.
//
// This full list (the one OWASP recommends) is deliberate, not just = and @:
// Excel also evaluates a leading + or - as a formula, for compatibility with
// Lotus 1-2-3, and a leading tab or carriage return can hide one of the other
// characters. The cost is that a phone number such as +61 400 123 456 is
// written as '+61 400 123 456, and a program that is not a spreadsheet will
// show that apostrophe.
//
//   escapeCsvField('=1+1')            -> '=1+1
//   escapeCsvField('+61 400 123 456') -> '+61 400 123 456
//   escapeCsvField('-5, approx')      -> "'-5, approx"
export function escapeCsvField(value: string): string {
  // The pattern means: starts with any one of  =  +  -  @  tab  carriage return.
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  // The pattern means: any one of  "  ,  carriage return  line feed.
  if (!/[",\r\n]/.test(safe)) return safe
  return `"${safe.replaceAll('"', '""')}"`
}

// Builds the whole CSV text: the heading row, then one line per report, in
// the order the reports were given. A plain function, reports in and text
// out, so it can be checked by hand.
//
// Each line ends with CRLF (\r\n, carriage return + line feed), which is what
// the CSV rules ask for and what Excel expects.
export function reportsToCsv(reports: Report[]): string {
  const rows = [CSV_HEADERS, ...reports.map(csvValues)]
  return rows
    .map((row) => row.map(escapeCsvField).join(',') + '\r\n')
    .join('')
}

// The name of a downloaded file: "mini-jamms-reports-2026-10-13.csv", with
// today's date in Eastern Time (see todayInReportsZone).
export function exportFileName(extension: 'csv' | 'pdf'): string {
  return `mini-jamms-reports-${todayInReportsZone()}.${extension}`
}

// Hands a finished file to the browser to save, under the given name.
//
// A Blob is a file held in the browser's memory. The browser can only
// download from a link, so this makes a temporary address for the Blob (an
// "object URL"), puts it on a link that is never shown, and clicks the link.
// The "download" attribute is what makes the browser save the file instead of
// opening it.
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  // The temporary address keeps the file in memory until it is released.
  // Release it a little later rather than at once, so the browser has had
  // time to start the download (some browsers need that).
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

// A byte order mark (BOM): an invisible character at the very start of the
// file. Without it, Excel on Windows guesses the wrong encoding and shows
// "CafÃ©" for "Café". Written out as UTF-8 it is the three bytes EF BB BF.
const BYTE_ORDER_MARK = '\uFEFF'

// "Download CSV": builds the file from the given reports and saves it.
export function downloadCsv(reports: Report[]): void {
  // A Blob made from text is always stored as UTF-8.
  const blob = new Blob([BYTE_ORDER_MARK + reportsToCsv(reports)], {
    type: 'text/csv;charset=utf-8',
  })
  downloadBlob(blob, exportFileName('csv'))
}
