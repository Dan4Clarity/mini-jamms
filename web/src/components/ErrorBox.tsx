import type { ReactNode } from 'react'

// "Props" are the inputs to a component, like parameters to a function.
type ErrorBoxProps = {
  children: ReactNode // what goes inside the box
}

// The red box used when something could not be sent or loaded.
// role="alert" makes screen readers read it out at once.
// bg-destructive/5 = the error red at 5% strength, a very pale red.
export function ErrorBox({ children }: ErrorBoxProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-xl border border-destructive bg-destructive/5 p-4 text-base text-destructive sm:p-5"
    >
      {children}
    </div>
  )
}
