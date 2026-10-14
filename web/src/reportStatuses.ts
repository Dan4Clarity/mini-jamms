// The nine report statuses, for the status drop-down on the admin page.
//
// THIS LIST MIRRORS THE DATABASE. The codes, labels and order are copied from
// the rows seeded into public.report_statuses in
// db/migrations/001_initial_schema.sql (code, label, in sort_order order).
// The same codes are listed in api/models.py (ReportStatus) and api/rules.py
// (STATUSES). The API has no endpoint that lists statuses, so they are
// repeated here. The API remains the source of truth: it decides which status
// changes are allowed and may refuse one. If a status is added or relabelled
// in the database, change this file to match.

// Mirrors ReportStatus in api/models.py.
export type ReportStatus =
  | 'open'
  | 'pending'
  | 'scheduled'
  | 'released'
  | 'in_progress'
  | 'rework'
  | 'rework_completed'
  | 'completed'
  | 'closed'

// value = what is sent to the API, label = what the person sees.
export const REPORT_STATUSES: { value: ReportStatus; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'released', label: 'Released' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'rework', label: 'Rework' },
  { value: 'rework_completed', label: 'Rework completed' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
]
