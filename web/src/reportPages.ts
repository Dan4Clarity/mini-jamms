// Splitting the admin table into pages, and the "Showing ..." line above it.
//
// THIS IS CLIENT-SIDE PAGINATION, a deliberate proof-of-concept
// simplification: the API still returns every matching report in one answer,
// and the browser only chooses which 20 of them to draw. Production would page
// in the query instead, with LIMIT and OFFSET, and COUNT(*) OVER () for the
// total.
//
// These are plain functions: numbers in, an answer out. They hold no state and
// touch nothing on the page, so each can be checked by hand.

// How many rows one page of the table shows.
export const PAGE_SIZE = 20

// Where one page sits in the whole list.
export type PageSlice = {
  page: number // the page actually shown, counting from 1
  pageCount: number // how many pages there are; 1 when there are no rows
  start: number // rows to skip before this page (like OFFSET)
  end: number // one past the last row of this page: start + rows on the page
}

// Works out the slice for the page that was asked for, out of "total" rows.
//
// The page asked for is first pulled back into range ("clamped"): below 1
// becomes 1, past the last page becomes the last page. So an empty page can
// never be shown while rows exist. This expects a whole number, which is all
// the page ever passes; a fraction or a non-number is not handled.
//
//   pageSlice(47, 1) -> page 1 of 3, start 0,  end 20  (rows 1-20)
//   pageSlice(47, 3) -> page 3 of 3, start 40, end 47  (rows 41-47)
//   pageSlice(21, 9) -> page 2 of 2, start 20, end 21  (9 is past the end)
//   pageSlice(0, 1)  -> page 1 of 1, start 0,  end 0   (no rows)
export function pageSlice(total: number, requestedPage: number): PageSlice {
  // Math.ceil rounds up: 47 rows / 20 per page = 2.35, so 3 pages.
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const page = Math.min(Math.max(1, requestedPage), pageCount)
  const start = (page - 1) * PAGE_SIZE
  const end = Math.min(start + PAGE_SIZE, total)
  return { page, pageCount, start, end }
}

// The words at the start of the line above the table:
//   more than one page  -> "Showing 21-40 of 47 reports"
//   a page with one row -> "Showing 21 of 21 reports" (not "21-21")
//   everything fits     -> "Showing 4 reports", "Showing 1 report",
//                          "Showing 0 reports"
export function describeCount(total: number, slice: PageSlice): string {
  if (slice.pageCount > 1) {
    // start counts rows skipped, so the first row shown is number start + 1.
    const first = slice.start + 1
    if (first === slice.end) return `Showing ${first} of ${total} reports`
    return `Showing ${first}-${slice.end} of ${total} reports`
  }
  return `Showing ${total} ${total === 1 ? 'report' : 'reports'}`
}
