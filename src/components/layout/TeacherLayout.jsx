import { Sidebar } from './Sidebar'

/**
 * TeacherLayout — same structure as AdminLayout, sidebar auto-shows teacher nav.
 */
export function TeacherLayout({ children }) {
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
