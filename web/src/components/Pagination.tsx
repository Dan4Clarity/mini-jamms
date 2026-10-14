import { useRef } from 'react'
import { flushSync } from 'react-dom'
import { Button } from '@/components/ui/button'

// "Props" are the inputs to a component, like parameters to a function.
type PaginationProps = {
  page: number // the page being shown, counting from 1
  pageCount: number // how many pages there are
  // Called with the page to show when Previous or Next is pressed. The page
  // number itself is held by the page that uses this component, not here.
  onPageChange: (page: number) => void
}

// The controls under the admin table: Previous, "Page 2 of 3", Next.
// It draws nothing when everything fits on one page.
export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  // Refs give the code below a handle on the two real <button> elements on
  // the page, so it can move the keyboard focus (see goTo).
  const previousRef = useRef<HTMLButtonElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  if (pageCount <= 1) return null

  function goTo(target: number) {
    // flushSync makes React re-draw straight away, so the buttons are already
    // enabled or disabled for the new page before the lines below run.
    flushSync(() => onPageChange(target))

    // The keyboard focus normally stays on the button that was pressed, so it
    // can be pressed again. But on reaching the first or last page that button
    // has just been disabled, and a browser takes the focus away from a
    // disabled button, which would send a keyboard user back to the top of
    // the page. Put the focus on the other button instead (it is always
    // usable here, because there are at least two pages).
    if (target >= pageCount) previousRef.current?.focus()
    else if (target <= 1) nextRef.current?.focus()
  }

  return (
    // <nav> with a name lets screen-reader users jump straight to these
    // controls. flex puts the three items in a row; justify-between spreads
    // them across a phone screen; from tablet width up (sm:) they sit together
    // at the right (sm:justify-end). gap-3 = space between them, mt-4 = space
    // above. text-base = 16px, the table's text size.
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between gap-3 text-base sm:justify-end"
    >
      {/* A disabled button cannot be pressed or reached with Tab. px-4 = a
          little less side padding than other buttons, so all three items fit
          on one line on a phone. */}
      <Button
        ref={previousRef}
        type="button"
        variant="outline"
        className="px-4"
        disabled={page <= 1}
        onClick={() => goTo(page - 1)}
      >
        Previous
      </Button>
      {/* Plain text, not role="status": the "Showing 21-40 of 47 reports"
          line above the table is what screen readers read out on a change. */}
      <p className="whitespace-nowrap">
        Page {page} of {pageCount}
      </p>
      <Button
        ref={nextRef}
        type="button"
        variant="outline"
        className="px-4"
        disabled={page >= pageCount}
        onClick={() => goTo(page + 1)}
      >
        Next
      </Button>
    </nav>
  )
}
