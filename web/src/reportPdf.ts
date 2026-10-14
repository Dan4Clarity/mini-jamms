// The "Download PDF" file.
//
// KEEP THIS FILE OUT OF THE MAIN DOWNLOAD. jsPDF and its table add-on are
// large. The two "import" lines below are the only place they are named, and
// this file itself is only ever loaded with import('@/reportPdf') from inside
// the "Download PDF" click (see AdminPage.tsx). That makes the build put this
// file and the library in a separate file ("chunk") that a browser fetches
// only when the button is pressed. Someone filling in the public form on a
// phone never downloads it. So: never write a normal
// `import ... from '@/reportPdf'` at the top of another file.

import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'
import type { Report } from '@/api'
import {
  formatDateTime,
  REPORTS_TIME_ZONE_LABEL,
  withPlainSpaces,
} from '@/reportDates'
import { downloadBlob, exportFileName } from '@/reportExport'
import { describeFilters } from '@/reportFilters'
import type { FilterValues } from '@/reportFilters'
import { labelFor } from '@/reportLabels'
import { REPORT_STATUSES } from '@/reportStatuses'
import { PROBLEM_TYPES, USER_TYPES } from '@/reportValidation'

// The brand navy. MIRRORS --color-navy IN index.css: jsPDF draws the page
// itself and cannot read the site's CSS, so the value has to be repeated here.
// This is the only place it is repeated; if the colour changes in index.css,
// change it here too.
const NAVY = '#182547'

// Sizes are in points (pt), the PDF's own unit: 72pt = 1 inch. A landscape A4
// page is 842pt wide and 595pt high.
const MARGIN = 40 // blank space at the left, right and top of every page
const FOOTER_SPACE = 44 // kept clear at the bottom of every page for the footer

const TITLE = 'Mini-JAMMS - Defect Reports'
const CREDIT =
  'A proof of concept prepared for Roy Jorgensen Associates by Daniel Veluswamy, October 2026.'

// The same six columns as the table on screen.
const PDF_HEADERS = [
  `Created (${REPORTS_TIME_ZONE_LABEL})`,
  'Problem type',
  'Location',
  'Reporter',
  'User type',
  'Status',
]

// WHAT THE PDF'S FONT CAN DRAW. The PDF uses Helvetica, one of the fonts every
// PDF reader already has, so no font file has to be put in the PDF. That font
// only covers Western European writing: plain English letters, digits and
// punctuation, accented letters such as é ü ã ñ, and a few extras such as
// curly quotes and the euro sign. It has no emoji and no Greek, Cyrillic,
// Arabic, Chinese and so on.
//
// NOT_DRAWABLE below is a pattern that matches any ONE character outside that
// set (the ^ means "not"). A line break is allowed too: the table starts a new
// line there.

// The 27 extras, written as character codes so none of them can be mistaken
// for a look-alike: the euro sign, curly quotes, dashes, the bullet, the
// ellipsis, the trade mark sign and a few more (the "Windows-1252" extras).
const DRAWABLE_EXTRAS =
  '\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018' +
  '\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178'

const NOT_DRAWABLE = new RegExp(
  // \n = line break, \u0020-\u007E = plain English letters, digits and
  // punctuation, \u00A0-\u00FF = accented Western European letters and signs.
  String.raw`[^\n\u0020-\u007E\u00A0-\u00FF${DRAWABLE_EXTRAS}]`,
  'u',
)

// The same pattern with "g" (every match, not just the first), for replacing.
const NOT_DRAWABLE_ALL = new RegExp(NOT_DRAWABLE.source, 'gu')

// Two tidy-ups that lose nothing, done before looking for characters the
// font cannot draw:
//   - normalize('NFC') joins a letter and a separate accent mark into the one
//     accented letter (some phones send "é" as "e" + an accent mark);
//   - tabs and unusual spaces (such as the narrow no-break space) become an
//     ordinary space. The pattern means "any white space except a line break
//     (\n) or a no-break space (\u00A0)", which the PDF handles as they are.
function tidyText(text: string): string {
  return text.normalize('NFC').replace(/[^\S\n\u00A0]/g, ' ')
}

// Makes a piece of text safe for the PDF's font: each character the font
// cannot draw is replaced by "?". Without this jsPDF does not fail, but it
// writes the WHOLE cell as nonsense, not just the one character.
//
//   pdfText('Café Müller')        -> 'Café Müller'   (unchanged)
//   pdfText('Depot (emoji) gate') -> 'Depot ? gate'
export function pdfText(text: string): string {
  return tidyText(text).replace(NOT_DRAWABLE_ALL, '?')
}

// The values of one report for the PDF table, in the same order as
// PDF_HEADERS. Codes are swapped for their labels, as on screen; the status is
// plain text. The dates are the same as on screen ("10/13/2026, 7:53 PM").
function pdfValues(report: Report): string[] {
  return [
    withPlainSpaces(formatDateTime(report.created_at)),
    labelFor(PROBLEM_TYPES, report.problem_type),
    report.location,
    report.reporter_name,
    labelFor(USER_TYPES, report.user_type),
    labelFor(REPORT_STATUSES, report.status),
  ]
}

// Builds the PDF in memory and returns it. "reports" is every report to list,
// in order; "filters" are the filters that list was loaded with, used only for
// the sentence under the title. "now" is when the file is being made.
export function buildReportsPdf(
  reports: Report[],
  filters: FilterValues,
  now: Date = new Date(),
): jsPDF {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  const rows = reports.map(pdfValues)
  // True if any cell holds a character the font cannot draw (see pdfText).
  const hasUndrawable = rows.some((row) =>
    row.some((cell) => NOT_DRAWABLE.test(tidyText(cell))),
  )

  // --- The heading block on page 1. doc.text(words, x, y) writes one line
  // with its left end at x and the bottom of its letters at y, both measured
  // from the top-left corner of the page.
  let y = MARGIN + 12

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(NAVY)
  doc.text(TITLE, MARGIN, y)

  // The same sentence the admin page shows above its table, for example
  // "Open reports from 10/01/2026 to 10/13/2026". describeFilters gives null
  // when no filter is set; the PDF then says "All reports".
  y += 20
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(20)
  doc.text(pdfText(describeFilters(filters) ?? 'All reports'), MARGIN, y)

  // "47 reports. Generated 10/13/2026, 10:45 PM ET"
  y += 16
  const count = `${reports.length} ${reports.length === 1 ? 'report' : 'reports'}`
  const generated = withPlainSpaces(formatDateTime(now.toISOString()))
  doc.setFontSize(10)
  doc.setTextColor(90) // a grey: 0 is black, 255 is white
  doc.text(
    `${count}. Generated ${generated} ${REPORTS_TIME_ZONE_LABEL}`,
    MARGIN,
    y,
  )

  // Only when something was replaced, say so, so a "?" is not a mystery.
  if (hasUndrawable) {
    y += 14
    doc.text(
      'Characters this PDF cannot show (such as emoji and non-Latin scripts) appear as "?". The CSV download keeps them.',
      MARGIN,
      y,
    )
  }

  // --- The table. autoTable works out the row heights, starts a new page
  // when one is full, and repeats the heading row at the top of each page.
  autoTable(doc, {
    head: [PDF_HEADERS],
    body: rows.map((row) => row.map(pdfText)),
    startY: y + 12,
    margin: {
      top: MARGIN,
      right: MARGIN,
      bottom: FOOTER_SPACE,
      left: MARGIN,
    },
    showHead: 'everyPage',
    // Do not split one report across two pages (unless it is taller than a
    // whole page).
    rowPageBreak: 'avoid',
    // overflow: 'linebreak' wraps text that is too long for its column onto
    // more lines (and breaks a single very long word), so nothing runs over
    // into the next column.
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 5,
      overflow: 'linebreak',
      textColor: 20,
      valign: 'top',
    },
    // The heading row: white bold text on navy.
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
    // Fixed widths for the five short columns (numbered from 0). Location,
    // column 2, is left out, so it takes all the width that remains.
    columnStyles: {
      0: { cellWidth: 105 },
      1: { cellWidth: 110 },
      3: { cellWidth: 130 },
      4: { cellWidth: 115 },
      5: { cellWidth: 100 },
    },
  })

  // --- The footer, on every page. It is written last, in a loop over the
  // finished pages, because "of 3" is only known once the table has been laid
  // out. Pages are numbered from 1.
  const pageCount = doc.getNumberOfPages()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90)
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    const footerY = pageHeight - 24
    doc.text(CREDIT, MARGIN, footerY)
    // align: 'right' puts the END of the words at x, the right-hand margin.
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN, footerY, {
      align: 'right',
    })
  }

  return doc
}

// "Download PDF": builds the file and saves it as
// "mini-jamms-reports-2026-10-13.pdf".
export function downloadPdf(reports: Report[], filters: FilterValues): void {
  const doc = buildReportsPdf(reports, filters)
  downloadBlob(doc.output('blob'), exportFileName('pdf'))
}
