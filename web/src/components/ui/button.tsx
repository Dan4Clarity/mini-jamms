import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

// The house style for every button on the site. It is set here once, so no
// page has to repeat it.
//
// cva() builds the class list: the first string is shared by every button,
// and "variants" adds the colours for the kind of button asked for.
//
// Shared: rounded-full = pill shape. uppercase + tracking-wider = capitals
// with a little space between the letters. min-h-11 = at least 44px tall, a
// comfortable size to tap. px-6 = room either side of the text.
// focus-visible:outline-* = a navy outline, 2px away from the button, when it
// is reached with the keyboard. disabled:* = a flat grey button while it
// cannot be pressed (for example while "Sending…").
const buttonVariants = cva(
  "inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border-2 px-6 text-sm font-semibold tracking-wider whitespace-nowrap uppercase transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy disabled:pointer-events-none disabled:border-border disabled:bg-muted disabled:text-muted-foreground",
  {
    variants: {
      variant: {
        // The main action: navy text on gold.
        default: "border-gold bg-gold text-navy hover:bg-gold/80",
        // Secondary actions: navy outline on white, filled navy on hover.
        outline:
          "border-navy bg-background text-navy hover:bg-navy hover:text-white",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
