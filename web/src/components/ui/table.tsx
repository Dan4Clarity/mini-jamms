import * as React from "react"
import { cn } from "cn"

// The look of the admin table is set in this file: a rounded outline, a navy
// heading row with white text, and a thin light-grey line between rows and
// between columns.

function Table({ className, ...props }: React.ComponentProps<"table">) {
  return (
    // overflow-x-auto: if the table is wider than the screen (on a phone), it
    // scrolls sideways inside this box instead of making the page wider.
    <div
      data-slot="table-container"
      className="relative w-full overflow-x-auto rounded-xl border"
    >
      <table
        data-slot="table"
        className={cn("w-full caption-bottom text-base", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({ className, ...props }: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("bg-navy", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    />
  )
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "border-b",
        className
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        // border-l first:border-l-0 = a line down the left of every heading
        // except the first, so the lines fall between columns only.
        // border-white/20 = white at 20% strength, a faint line on the navy.
        "h-12 border-l border-white/20 px-3 text-left align-middle text-sm font-semibold tracking-wider whitespace-nowrap text-white uppercase first:border-l-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        // border-l first:border-l-0 = a thin line between columns, in the
        // same light grey as the lines between rows (none on the first cell,
        // so it does not double up with the table's outline).
        // align-baseline lines up the first line of text in every cell of a
        // row, including the text inside the status drop-down.
        "border-l px-3 py-2 align-baseline whitespace-nowrap first:border-l-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
}
