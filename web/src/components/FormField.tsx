import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

// "Props" are the inputs to a component, like parameters to a function.
type FormFieldProps = {
  id: string // id of the input inside; the label points at it with htmlFor
  label: string
  hint?: string // optional helper text shown under the label
  error?: string // message to show under the input, if any
  children: ReactNode // the input itself
}

// One form row: label on top, optional hint, the input, then any error.
//
// The hint and error get the ids "<id>-hint" and "<id>-error". The input lists
// those ids in aria-describedby (see ReportForm) so a screen reader reads them
// out together with the input.
export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    // flex flex-col = stack the children vertically; gap-2 = space between them.
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
