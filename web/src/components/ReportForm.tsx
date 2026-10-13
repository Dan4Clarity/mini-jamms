import { useState } from 'react'
import type { FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FIELD_ORDER,
  PROBLEM_TYPES,
  toReportCreate,
  validateReport,
} from '@/reportValidation'
import type { FieldName, FormValues } from '@/reportValidation'

const EMPTY_FORM: FormValues = {
  location: '',
  problem_type: '',
  description: '',
  reporter_name: '',
  reporter_contact: '',
}

// Helper text shown under some labels.
const HINTS: Partial<Record<FieldName, string>> = {
  location: 'Where is the problem?',
  description: "What's wrong?",
  reporter_contact: 'Email or phone',
}

// Tailwind sizes used below: h-11 / min-h-11 = 44px tall, a comfortable size
// to tap on a phone. text-base = 16px, which also stops iPhones zooming in.

export function ReportForm() {
  // useState holds data that can change. Calling the "set" function stores the
  // new value and makes React re-draw this component with it.
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  // Which fields the person has already been in and left.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  // Whether Send has been pressed at least once.
  const [sendPressed, setSendPressed] = useState(false)

  // Worked out again on every re-draw from the current values, so the messages
  // can never be out of step with what is typed (like a view, not a table).
  const errors = validateReport(values)

  function setValue(field: FieldName, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function markTouched(field: FieldName) {
    setTouched((current) => ({ ...current, [field]: true }))
  }

  // The props every field needs, whichever kind of input it is. An error is
  // only shown once the person has left the field or pressed Send.
  function fieldProps(field: FieldName) {
    const error = touched[field] || sendPressed ? errors[field] : undefined
    const describedBy = [
      HINTS[field] ? `${field}-hint` : '',
      error ? `${field}-error` : '',
    ]
      .filter(Boolean)
      .join(' ')

    return {
      row: { id: field, hint: HINTS[field], error },
      input: {
        id: field,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy || undefined,
      },
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser's default behaviour of reloading the page.
    event.preventDefault()

    // flushSync makes React re-draw straight away, so the error messages are
    // on the page before focus moves (a screen reader then reads them out).
    flushSync(() => setSendPressed(true))

    const firstInvalid = FIELD_ORDER.find((field) => errors[field])
    if (firstInvalid) {
      // Each input's id is its field name, so we can look the element up by
      // id and move the cursor (focus) to it.
      document.getElementById(firstInvalid)?.focus()
      return
    }

    const payload = toReportCreate(values)
    if (!payload) return

    // Nothing is sent yet. This is the JSON body POST /reports will receive.
    // TODO: remove when POST /reports is wired up
    console.log('Report payload', payload)
  }

  const location = fieldProps('location')
  const problemType = fieldProps('problem_type')
  const description = fieldProps('description')
  const reporterName = fieldProps('reporter_name')
  const reporterContact = fieldProps('reporter_contact')

  return (
    // noValidate turns off the browser's own pop-up messages; ours are used instead.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <FormField label="Location" {...location.row}>
        {/* A "controlled" input: it shows the value held in state, and every
            keystroke updates that state. */}
        <Input
          {...location.input}
          type="text"
          required
          autoComplete="off"
          className="h-11"
          value={values.location}
          onChange={(event) => setValue('location', event.target.value)}
          onBlur={() => markTouched('location')}
        />
      </FormField>

      <FormField label="Problem type" {...problemType.row}>
        {/* The browser's own drop-down list, controlled the same way as the
            text inputs. The classes copy the look of Input (ui/input.tsx):
            same border, corners, focus ring and red outline when invalid. */}
        <select
          {...problemType.input}
          required
          className="h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
          value={values.problem_type}
          onChange={(event) => setValue('problem_type', event.target.value)}
          onBlur={() => markTouched('problem_type')}
        >
          {/* The empty first option is the placeholder. "disabled" means it
              cannot be picked again once a real option is chosen. */}
          <option value="" disabled>
            Choose a problem type
          </option>
          {PROBLEM_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FormField>

      <FormField label="Description" {...description.row}>
        <Textarea
          {...description.input}
          required
          className="min-h-28"
          value={values.description}
          onChange={(event) => setValue('description', event.target.value)}
          onBlur={() => markTouched('description')}
        />
      </FormField>

      <FormField label="Your name" {...reporterName.row}>
        <Input
          {...reporterName.input}
          type="text"
          required
          autoComplete="name"
          className="h-11"
          value={values.reporter_name}
          onChange={(event) => setValue('reporter_name', event.target.value)}
          onBlur={() => markTouched('reporter_name')}
        />
      </FormField>

      <FormField label="Contact" {...reporterContact.row}>
        <Input
          {...reporterContact.input}
          type="text"
          required
          className="h-11"
          value={values.reporter_contact}
          onChange={(event) => setValue('reporter_contact', event.target.value)}
          onBlur={() => markTouched('reporter_contact')}
        />
      </FormField>

      {/* w-full on a phone; sm:w-auto shrinks it to fit its text on wider screens. */}
      <Button
        type="submit"
        className="h-11 w-full text-base sm:w-auto sm:self-start sm:px-6"
      >
        Send report
      </Button>
    </form>
  )
}
