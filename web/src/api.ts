// Every call to the Mini-JAMMS API goes through this file.
//
// fetch() is the browser's built-in way to make an HTTP request. It does not
// hand back the answer straight away: it returns a Promise, which is a
// placeholder for a result that arrives later. "await" pauses the function
// until that result is in, and is only allowed inside an "async" function.
// An async function always returns a Promise itself.

import { FIELD_LABELS } from '@/reportValidation'
import type { FieldName, ReportCreate } from '@/reportValidation'

// import.meta.env is how Vite passes settings to the code. Only variables
// whose name starts with VITE_ are included, and their values are copied into
// the JavaScript everyone downloads, so they are public: never a secret.
// See web/.env.example.
const configuredUrl: string | undefined = import.meta.env.VITE_API_URL

// "||" falls back when the variable is missing or empty. The replace() removes
// any "/" from the end, so "http://host/" + "/reports" cannot give "//reports".
const API_URL = (configuredUrl || 'http://localhost:8000').replace(/\/+$/, '')

// One report as the API returns it. Mirrors ReportOut in api/models.py.
// JSON has no date or UUID type, so those arrive as text.
export type Report = {
  id: string // a UUID
  location: string
  problem_type: string
  description: string
  reporter_name: string
  reporter_contact: string
  photo_path: string | null
  status: string
  created_at: string // ISO date and time, e.g. "2026-10-13T09:30:00.123456Z"
  user_type: string
  updated_at: string // ISO date and time
}

// The two shapes of error body FastAPI sends:
//   422 (a field failed validation): {"detail": [{"loc": ["body", "location"], "msg": "..."}]}
//   HTTPException (e.g. 404, 409):   {"detail": "some text"}
type ApiErrorBody = {
  detail?: string | { loc?: (string | number)[]; msg?: string }[]
}

// Turns a failed response into a message a person can read.
async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `The server could not handle the request (error ${response.status}). Please try again.`

  let body: ApiErrorBody | null
  try {
    // "as" tells TypeScript what shape to expect. Nothing is checked while the
    // code runs, which is why each part is tested below before it is used.
    body = (await response.json()) as ApiErrorBody | null
  } catch {
    return fallback // the body was not JSON, e.g. an error page from a proxy
  }

  const detail = body?.detail
  if (typeof detail === 'string' && detail) return detail
  if (!Array.isArray(detail)) return fallback

  // One line per problem, using the form's label for the field, e.g.
  // "Location: String should have at least 3 characters".
  const lines: string[] = []
  for (const item of detail) {
    if (typeof item?.msg !== 'string') continue
    // loc is the path to the field: ["body", "location"]. The last part is its name.
    const field = Array.isArray(item.loc) ? item.loc[item.loc.length - 1] : undefined
    if (typeof field !== 'string' || field === 'body') {
      lines.push(item.msg)
    } else {
      const label = field in FIELD_LABELS ? FIELD_LABELS[field as FieldName] : field
      lines.push(`${label}: ${item.msg}`)
    }
  }
  return lines.length > 0 ? lines.join('\n') : fallback
}

// Sends one request and returns the response, or throws an Error whose message
// can be shown to the person using the page.
async function send(path: string, options?: RequestInit): Promise<Response> {
  let response: Response
  try {
    response = await fetch(API_URL + path, options)
  } catch {
    // fetch only fails like this when no answer came back at all: the API is
    // down, the network dropped, or the browser blocked the call (CORS).
    throw new Error('Could not reach the server. Please try again.')
  }

  // An answer with an error status (4xx, 5xx) does NOT make fetch fail, so it
  // has to be checked. response.ok is true for 200 to 299.
  if (!response.ok) throw new Error(await readErrorMessage(response))

  return response
}

// POST /reports: saves a new report and returns it as stored (with its id).
export async function postReport(report: ReportCreate): Promise<Report> {
  const response = await send('/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report), // turn the object into JSON text
  })
  return (await response.json()) as Report
}

// GET /reports: every report. Not used by a page yet (for the admin page).
export async function getReports(): Promise<Report[]> {
  const response = await send('/reports')
  return (await response.json()) as Report[]
}
