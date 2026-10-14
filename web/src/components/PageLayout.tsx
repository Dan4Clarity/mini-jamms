import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

// "Props" are the inputs to a component, like parameters to a function.
type PageLayoutProps = {
  // The one link in the header: where it goes and what it says. Each page
  // links to the other one.
  navTo: string
  navLabel: string
  // How wide the page's content may grow on a big screen: "narrow" for the
  // form (short lines are easier to read), "wide" for the table.
  width: 'narrow' | 'wide'
  children: ReactNode // the page itself
}

// The widest each part may grow, for each kind of page. "frame" is the header
// and footer; "content" is the page itself. Below these sizes everything just
// fills the screen, less the side padding.
//   narrow: the form stays 36rem (576px) wide under a 72rem (1152px) frame.
//   wide:   the table page and its frame share 96rem (1536px), so the site
//           name and the footer text line up with the table's edges. That
//           fills a laptop or desktop screen without stretching right across
//           an ultra-wide one.
const MAX_WIDTHS = {
  narrow: { frame: 'max-w-6xl', content: 'max-w-xl' },
  wide: { frame: 'max-w-[96rem]', content: 'max-w-[96rem]' },
}

// The frame shared by both pages: the navy header, the page content, and the
// footer. Each page wraps its content in this, so there is one copy of the
// header and footer.
export function PageLayout({ navTo, navLabel, width, children }: PageLayoutProps) {
  const maxWidths = MAX_WIDTHS[width]

  return (
    // The footer trick: min-h-svh makes this box at least as tall as the
    // screen, flex flex-col stacks header / main / footer, and flex-1 on
    // <main> lets it take all the spare height. On a short page that pushes
    // the footer to the bottom of the screen; on a long page the footer just
    // follows the content. Nothing is "pinned", so it can never cover content.
    <div className="flex min-h-svh flex-col">
      <header className="bg-navy text-white">
        {/* A maximum width + mx-auto: centred, and no wider than the frame.
            justify-between pushes the name left and the link right. */}
        <div
          className={cn(
            'mx-auto flex w-full items-center justify-between gap-4 px-4 py-3 sm:px-6',
            maxWidths.frame,
          )}
        >
          {/* The site name. Not a heading: each page has its own <h1>. */}
          <p className="font-heading text-xl font-semibold sm:text-2xl">
            Mini-JAMMS
          </p>
          <nav aria-label="Main">
            {/* Link (from react-router) changes page without reloading the
                site. min-h-11 = 44px tall to tap. On the navy bar the keyboard
                focus outline is gold so that it shows. */}
            <Link
              to={navTo}
              className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold tracking-wider uppercase underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
            >
              {navLabel}
            </Link>
          </nav>
        </div>
      </header>

      {/* px-4 / py-8 = padding on a phone; sm: applies from tablet width up. */}
      <main
        className={cn(
          'mx-auto w-full flex-1 px-4 py-8 sm:px-6 sm:py-12',
          maxWidths.content,
        )}
      >
        {children}
      </main>

      <footer className="border-t bg-muted">
        <p
          className={cn(
            'mx-auto w-full px-4 py-5 text-sm text-muted-foreground sm:px-6',
            maxWidths.frame,
          )}
        >
          A proof of concept prepared for Roy Jorgensen Associates by Daniel
          Veluswamy, October 2026.
        </p>
      </footer>
    </div>
  )
}
