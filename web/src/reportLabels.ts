// Turning a code into the words a person reads. Used by the admin table
// (ReportRow.tsx) and by the downloads (reportExport.ts), so both always show
// the same label for the same code.

// Looks up the label for a code, like a join to a lookup table. If the code
// is not in the list (the API has a value this page does not know about yet),
// the code itself is shown, so the cell is never blank.
export function labelFor(
  options: { value: string; label: string }[],
  code: string,
): string {
  return options.find((option) => option.value === code)?.label ?? code
}
