import { Sidebar } from './Sidebar'

/**
 * StudentLayout — same structure, sidebar auto-shows student nav.
 */
export function StudentLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 fade-up min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}
