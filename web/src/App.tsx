import { Route, Routes } from 'react-router'
import { AdminPage } from '@/pages/AdminPage'
import { ReportPage } from '@/pages/ReportPage'

// Maps each URL path to the page component that should be shown for it.
function App() {
  return (
    <Routes>
      <Route path="/" element={<ReportPage />} />
      <Route path="/admin" element={<AdminPage />} />
    </Routes>
  )
}

export default App
