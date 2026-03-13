import { Sidebar } from './Sidebar'

/**
 * AdminLayout — full-screen layout with fixed sidebar for admin pages.
 */
export function AdminLayout({ children }) {
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
