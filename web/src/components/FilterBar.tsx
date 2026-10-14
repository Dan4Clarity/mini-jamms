import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { REPORTS_TIME_ZONE_LABEL } from '@/reportDates'
import { hasFilters, NO_FILTERS } from '@/reportFilters'
import type { FilterValues } from '@/reportFilters'
import { REPORT_STATUSES } from '@/reportStatuses'

// The look of the status drop-down: the same classes as the drop-downs on the
// report form (SELECT_CLASS in ReportForm.tsx). h-11 = 44px tall.
const SELECT_CLASS =
  'h-11 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30'

// One label-above-control pair. On a phone it fills the row (the bar stacks);
// from tablet width up (sm:) it is a fixed 11rem wide so the three sit side by
// side.
const FIELD_CLASS = 'flex flex-col gap-2 sm:w-44'

const ERROR_ID = 'filter-error'

// "Props" are the inputs to a component, like parameters to a function.
type FilterBarProps = {
  // What the three controls show. The page holds these values, not this bar.
  filters: FilterValues
  // Called with the complete new set of values when any control changes.
  onChange: (filters: FilterValues) => void
  // The message to show if the last load with filters failed, otherwise null.
  error: string | null
  // True if that failure was the API refusing the values (422), for example
  // From later than To. The date boxes are then marked as invalid.
  rejected: boolean
  // Called when "Try again" is pressed. The button is only shown when the
  // failure was not a refusal: asking again with the same values would just
  // be refused again, but an API that could not be reached may be back.
  onRetry: () => void
}

// The row of filter controls above the admin table: status, From, To and a
// "Clear filters" button. It only reports what was chosen. The page asks the
// API for the matching reports (see AdminPage); no rows are filtered here.
export function FilterBar({
  filters,
  onChange,
  error,
  rejected,
  onRetry,
}: FilterBarProps) {
  // Extra attributes for the two date boxes when the API refused the values:
  // aria-invalid marks the box as wrong (it also gets a red outline), and
  // aria-describedby makes a screen reader read the message out with the box.
  const dateErrorProps = {
    'aria-invalid': rejected ? true : undefined,
    'aria-describedby': rejected ? ERROR_ID : undefined,
  }

  function handleStatusChange(chosen: string) {
    // Look the chosen value up in the list of statuses. "All statuses" has the
    // value '' and is not in the list, so it gives '' (not set). Looking it up
    // also tells TypeScript that the value is a real status code.
    const status =
      REPORT_STATUSES.find((option) => option.value === chosen)?.value ?? ''
    // { ...filters, status } is a copy of filters with only status replaced.
    onChange({ ...filters, status })
  }

  return (
    // role="group" with a name tells screen readers these controls belong
    // together. mb-6 = space below the bar.
    <div role="group" aria-label="Filter reports" className="mb-6 flex flex-col gap-3">
      {/* flex-col = stacked on a phone. From tablet width up: sm:flex-row puts
          them in a row, sm:flex-wrap lets the row wrap if it runs out of room,
          sm:items-end lines the controls up along their bottom edges. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div className={FIELD_CLASS}>
          <Label htmlFor="filter-status" className="text-base">
            Status
          </Label>
          <select
            id="filter-status"
            className={SELECT_CLASS}
            value={filters.status}
            onChange={(event) => handleStatusChange(event.target.value)}
          >
            <option value="">All statuses</option>
            {REPORT_STATUSES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* type="date" is the browser's own date box (a calendar on a
            computer, the date wheel on a phone). Its value is always text in
            the form YYYY-MM-DD, or '' while the date is empty or its month or
            day is missing, whatever way the browser displays it. (A half-typed
            year gives a real date such as 0002-10-13; AdminPage waits for the
            finished year before asking the API.) max keeps the year to
            four digits; it is a typing aid only, the API checks the value. */}
        <div className={FIELD_CLASS}>
          <Label htmlFor="filter-date-from" className="text-base">
            From ({REPORTS_TIME_ZONE_LABEL})
          </Label>
          <Input
            id="filter-date-from"
            type="date"
            max="9999-12-31"
            className="h-11"
            value={filters.dateFrom}
            onChange={(event) =>
              onChange({ ...filters, dateFrom: event.target.value })
            }
            {...dateErrorProps}
          />
        </div>

        <div className={FIELD_CLASS}>
          <Label htmlFor="filter-date-to" className="text-base">
            To ({REPORTS_TIME_ZONE_LABEL})
          </Label>
          <Input
            id="filter-date-to"
            type="date"
            max="9999-12-31"
            className="h-11"
            value={filters.dateTo}
            onChange={(event) =>
              onChange({ ...filters, dateTo: event.target.value })
            }
            {...dateErrorProps}
          />
        </div>

        {/* Only shown when there is something to clear. */}
        {hasFilters(filters) && (
          <Button
            type="button"
            variant="outline"
            className="h-11 px-6 text-base sm:w-auto"
            onClick={() => onChange(NO_FILTERS)}
          >
            Clear filters
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Dates are Eastern Time ({REPORTS_TIME_ZONE_LABEL}). From and To are
        both included.
      </p>

      {/* The API's own message, for example "The From date must not be later
          than the To date." role="alert" makes screen readers read it out at
          once. whitespace-pre-line keeps each line of a longer message on its
          own line. */}
      {error !== null && (
        <div className="flex flex-col items-start gap-2">
          <p
            id={ERROR_ID}
            role="alert"
            className="text-sm font-medium whitespace-pre-line text-destructive"
          >
            {error}
          </p>
          {!rejected && (
            <Button
              type="button"
              variant="outline"
              className="h-11 px-6 text-base"
              onClick={onRetry}
            >
              Try again
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
