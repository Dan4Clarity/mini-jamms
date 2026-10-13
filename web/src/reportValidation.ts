// Types and checks for the public report form.
//
// THESE RULES MIRROR api/models.py (the ReportCreate model). The API is the
// source of truth: it checks everything again and may still reject a report.
// The checks here only exist so people see a helpful message straight away.
// If api/models.py changes, change this file to match.

// A TypeScript "type" is like a column definition: it says what values are
// allowed. It is checked when the code is built, not while it runs.
// Mirrors ProblemType in api/models.py.
export type ProblemType =
  | 'pothole'
  | 'damaged_fence'
  | 'signage'
  | 'lighting'
  | 'other'
  | 'damaged_attenuator'
  | 'roadside_littering'
  | 'roadside_accident'

// Who is sending the report. Mirrors UserType in api/models.py.
export type UserType = 'public' | 'staff' | 'stakeholder'

// The JSON body POST /reports expects. Mirrors ReportCreate in api/models.py.
// The API rejects unknown fields, so this must list exactly these six.
export type ReportCreate = {
  user_type: UserType
  location: string
  problem_type: ProblemType
  description: string
  reporter_name: string
  reporter_contact: string
}

export type FieldName = keyof ReportCreate

// What the form holds while the person is typing. Everything is a string here;
// problem_type is '' until an option is chosen, and user_type starts as 'public'.
export type FormValues = Record<FieldName, string>

// One error message per field that has a problem. No entry means the field is fine.
export type FormErrors = Partial<Record<FieldName, string>>

// The order the fields appear on the page (used to find the first invalid one).
export const FIELD_ORDER: FieldName[] = [
  'user_type',
  'location',
  'problem_type',
  'description',
  'reporter_name',
  'reporter_contact',
]

// The label shown above each field. Kept in one place because three things
// use it: the form, the "too short" / "too long" messages below, and the
// error messages built from the API's replies in api.ts.
export const FIELD_LABELS: Record<FieldName, string> = {
  user_type: 'I am reporting as',
  location: 'Location',
  problem_type: 'Problem type',
  description: 'Description',
  reporter_name: 'Your name',
  reporter_contact: 'Contact',
}

// value = what is sent to the API, label = what the person sees.
export const PROBLEM_TYPES: { value: ProblemType; label: string }[] = [
  { value: 'pothole', label: 'Pothole' },
  { value: 'damaged_fence', label: 'Damaged fence' },
  { value: 'signage', label: 'Signage' },
  { value: 'lighting', label: 'Lighting' },
  { value: 'damaged_attenuator', label: 'Damaged attenuator' },
  { value: 'roadside_littering', label: 'Roadside littering' },
  { value: 'roadside_accident', label: 'Roadside accident' },
  { value: 'other', label: 'Other' },
]

export const USER_TYPES: { value: UserType; label: string }[] = [
  { value: 'public', label: 'Member of the public' },
  { value: 'staff', label: 'Roy Jorgensen staff' },
  { value: 'stakeholder', label: 'Stakeholder' },
]

type TextRule = {
  min: number
  max: number
  emptyMessage: string
}

// Lengths copied from the Field(min_length=..., max_length=...) lines in
// ReportCreate. The two drop-down fields (problem_type, user_type) are not
// free text, so they are left out here and checked against their lists below.
const TEXT_RULES: Record<
  Exclude<FieldName, 'problem_type' | 'user_type'>,
  TextRule
> = {
  location: {
    min: 3,
    max: 200,
    emptyMessage: 'Enter where the problem is.',
  },
  description: {
    min: 5,
    max: 2000,
    emptyMessage: "Describe what's wrong.",
  },
  reporter_name: {
    min: 1,
    max: 120,
    emptyMessage: 'Enter your name.',
  },
  reporter_contact: {
    min: 3,
    max: 200,
    emptyMessage: 'Enter an email address or phone number.',
  },
}

function isProblemType(value: string): value is ProblemType {
  return PROBLEM_TYPES.some((option) => option.value === value)
}

function isUserType(value: string): value is UserType {
  return USER_TYPES.some((option) => option.value === value)
}

function checkText(
  value: string,
  label: string,
  rule: TextRule,
): string | undefined {
  // The API trims spaces from both ends before measuring (str_strip_whitespace),
  // so we do the same. [...text].length counts characters the way Python does
  // (an emoji counts as 1; plain .length would count it as 2).
  const length = [...value.trim()].length

  if (length === 0) return rule.emptyMessage
  if (length < rule.min) {
    return `${label} must be at least ${rule.min} characters.`
  }
  if (length > rule.max) {
    return `${label} must be ${rule.max} characters or fewer.`
  }
  return undefined
}

// Checks every field and returns the messages for the ones that fail.
export function validateReport(values: FormValues): FormErrors {
  const errors: FormErrors = {}

  for (const field of FIELD_ORDER) {
    let message: string | undefined
    if (field === 'problem_type') {
      if (!isProblemType(values.problem_type)) message = 'Choose a problem type.'
    } else if (field === 'user_type') {
      if (!isUserType(values.user_type)) message = 'Choose who is reporting.'
    } else {
      message = checkText(values[field], FIELD_LABELS[field], TEXT_RULES[field])
    }

    if (message) errors[field] = message
  }

  return errors
}

// Builds the JSON body for POST /reports, or returns null if the form is not
// valid. Text is trimmed, as the API would do anyway.
export function toReportCreate(values: FormValues): ReportCreate | null {
  if (Object.keys(validateReport(values)).length > 0) return null
  if (!isProblemType(values.problem_type)) return null
  if (!isUserType(values.user_type)) return null

  return {
    user_type: values.user_type,
    location: values.location.trim(),
    problem_type: values.problem_type,
    description: values.description.trim(),
    reporter_name: values.reporter_name.trim(),
    reporter_contact: values.reporter_contact.trim(),
  }
}
