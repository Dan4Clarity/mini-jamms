import { PageLayout } from '@/components/PageLayout'
import { ReportForm } from '@/components/ReportForm'

// The public page at "/": a short introduction and the report form.
export function ReportPage() {
  return (
    // PageLayout adds the shared header and footer around the page. "narrow"
    // keeps the form's lines short enough to read on a wide screen.
    <PageLayout navTo="/admin" navLabel="Reports" width="narrow">
      {/* text-3xl on a phone, a size larger from tablet width up (sm:). */}
      <h1 className="text-3xl sm:text-4xl">Report a problem</h1>
      <p className="mt-3 mb-8 text-muted-foreground sm:mb-10">
        Tell us about a problem such as a pothole or a broken light so we can
        look into it. Please fill in every field.
      </p>
      <ReportForm />
    </PageLayout>
  )
}
