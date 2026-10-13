import { ReportForm } from '@/components/ReportForm'

// The public page at "/": a short introduction and the report form.
export function ReportPage() {
  return (
    // max-w-xl keeps lines readable on wide screens; mx-auto centres the column.
    // px-4 / py-6 = padding on a phone; sm: applies from tablet width up.
    <main className="mx-auto w-full max-w-xl px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-semibold">Report a problem</h1>
      <p className="mt-2 mb-6 text-base text-muted-foreground">
        Tell us about a problem such as a pothole or a broken light so we can
        look into it. Please fill in every field.
      </p>
      <ReportForm />
    </main>
  )
}
