import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { flushSync } from 'react-dom'
import { postReport } from '@/api'
import type { Report } from '@/api'
import { ErrorBox } from '@/components/ErrorBox'
import { FormField } from '@/components/FormField'
import { NativeSelect } from '@/components/NativeSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  FIELD_LABELS,
  FIELD_ORDER,
  PROBLEM_TYPES,
  toReportCreate,
  USER_TYPES,
  validateReport,
} from '@/reportValidation'
import type { FieldName, FormValues } from '@/reportValidation'

const EMPTY_FORM: FormValues = {
  user_type: 'public', // pre-selected, the same default the API uses
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

// Tailwind sizes used below: h-11 = 44px tall, a comfortable size to tap on a
// phone. The inputs' text is 16px (text-base, set in ui/input.tsx,
// ui/textarea.tsx and NativeSelect.tsx), which also stops iPhones zooming in.
// The buttons get their look, and their 44px height, from ui/button.tsx.

export function ReportForm() {
  // useState holds data that can change. Calling the "set" function stores the
  // new value and makes React re-draw this component with it.
  const [values, setValues] = useState<FormValues>(EMPTY_FORM)
  // Which fields the person has already been in and left.
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({})
  // Whether Send has been pressed at least once.
  const [sendPressed, setSendPressed] = useState(false)
  // True from the moment the report is sent until the API answers.
  const [sending, setSending] = useState(false)
  // The API's message if the last send failed, otherwise null.
  const [serverError, setServerError] = useState<string | null>(null)
  // The saved report the API sent back, once a send has worked.
  const [sentReport, setSentReport] = useState<Report | null>(null)
  // A ref is a value React keeps between re-draws, like state, but changing it
  // takes effect immediately and does not re-draw. It is the "already sending"
  // lock: state only updates on the next re-draw, which could be too late to
  // stop a very fast second press.
  const sendingLock = useRef(false)

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

  // "async" lets this function wait for the API with "await" (see api.ts).
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // Stop the browser's default behaviour of reloading the page.
    event.preventDefault()

    // A report is already on its way: do nothing, so it cannot be sent twice.
    if (sendingLock.current) return

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

    sendingLock.current = true
    setSending(true)
    setServerError(null) // clear the message from an earlier failed try

    // try = the normal path; catch = runs if postReport throws an Error;
    // finally = runs afterwards either way.
    try {
      const report = await postReport(payload)
      // Re-draw now, so the confirmation is on the page before focus moves to
      // it (a screen reader then reads it out).
      flushSync(() => setSentReport(report))
      document.getElementById('report-sent')?.focus()
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : 'Please try again.',
      )
    } finally {
      sendingLock.current = false
      setSending(false)
    }
  }

  // Back to an empty form, ready for another report.
  function handleReportAnother() {
    flushSync(() => {
      setValues(EMPTY_FORM)
      setTouched({})
      setSendPressed(false)
      setSentReport(null)
    })
    document.getElementById(FIELD_ORDER[0])?.focus()
  }

  // After a successful send, the confirmation is shown instead of the form.
  if (sentReport) {
    return (
      // role="status" asks screen readers to read this out when it appears.
      // A pale sage box: bg-sage/10 = the theme's sage at 10% strength.
      <div
        role="status"
        className="flex flex-col gap-4 rounded-xl border border-sage bg-sage/10 p-5 sm:p-8"
      >
        {/* tabIndex={-1} lets the code above move focus here, without adding
            the heading to the Tab key order. */}
        <h2
          id="report-sent"
          tabIndex={-1}
          className="text-2xl outline-none"
        >
          Thank you. Your report has been sent.
        </h2>
        <p>
          Your reference number is:
          {/* break-all lets the long reference wrap on a narrow phone. */}
          <span className="mt-2 block rounded-lg border bg-background px-3 py-2 font-mono text-base break-all">
            {sentReport.id}
          </span>
        </p>
        <p className="text-muted-foreground">
          Keep a note of it in case you need to ask about this report.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto sm:self-start"
          onClick={handleReportAnother}
        >
          Report another problem
        </Button>
      </div>
    )
  }

  const userType = fieldProps('user_type')
  const location = fieldProps('location')
  const problemType = fieldProps('problem_type')
  const description = fieldProps('description')
  const reporterName = fieldProps('reporter_name')
  const reporterContact = fieldProps('reporter_contact')

  return (
    // noValidate turns off the browser's own pop-up messages; ours are used instead.
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <FormField label={FIELD_LABELS.user_type} {...userType.row}>
        {/* The browser's own drop-down list. No empty placeholder option:
            "Member of the public" is already chosen. */}
        <NativeSelect
          {...userType.input}
          required
          className="w-full"
          value={values.user_type}
          onChange={(event) => setValue('user_type', event.target.value)}
          onBlur={() => markTouched('user_type')}
        >
          {USER_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </NativeSelect>
      </FormField>

      <FormField label={FIELD_LABELS.location} {...location.row}>
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

      <FormField label={FIELD_LABELS.problem_type} {...problemType.row}>
        {/* The browser's own drop-down list, controlled the same way as the
            text inputs. */}
        <NativeSelect
          {...problemType.input}
          required
          className="w-full"
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
        </NativeSelect>
      </FormField>

      <FormField label={FIELD_LABELS.description} {...description.row}>
        <Textarea
          {...description.input}
          required
          className="min-h-32"
          value={values.description}
          onChange={(event) => setValue('description', event.target.value)}
          onBlur={() => markTouched('description')}
        />
      </FormField>

      <FormField label={FIELD_LABELS.reporter_name} {...reporterName.row}>
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

      <FormField label={FIELD_LABELS.reporter_contact} {...reporterContact.row}>
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

      {/* Shown just above the button if the API refused the report or could
          not be reached. ErrorBox is the red box; it has role="alert", which
          makes screen readers read it out at once. whitespace-pre-line keeps
          each problem on its own line. */}
      {serverError && (
        <ErrorBox>
          <p className="font-semibold">Sorry, your report was not sent.</p>
          <p className="whitespace-pre-line">{serverError}</p>
        </ErrorBox>
      )}

      {/* disabled while sending, so a second press cannot send it twice.
          w-full on a phone; sm:w-auto shrinks it to fit its text on wider
          screens. */}
      <Button
        type="submit"
        disabled={sending}
        className="w-full sm:w-auto sm:self-start"
      >
        {sending ? 'Sending…' : 'Send report'}
      </Button>
    </form>
  )
}
