import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

// The look shared by every drop-down list on the site. The classes copy Input
// (ui/input.tsx): same border, corners, white background, focus ring, and red
// outline when aria-invalid is set. h-11 = 44px tall, comfortable to tap.
// text-base = 16px, which also stops iPhones zooming in.
const SELECT_CLASS =
  'h-11 min-w-0 rounded-lg border border-input bg-background px-3 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40'

// The browser's own drop-down list (<select>) with the site's look.
//
// It takes exactly the same props as a plain <select> (value, onChange, id,
// aria-*, ref and so on) and passes them straight through, so it behaves
// exactly like one. Anything given in className is added to the shared look:
// that is where each use sets its own width, for example "w-full".
export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  // cn() joins the class lists; if both set the same thing, className wins.
  return <select className={cn(SELECT_CLASS, className)} {...props} />
}
