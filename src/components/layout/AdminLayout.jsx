import { Sidebar, MobileNav } from './Sidebar'

export function AdminLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileNav />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 fade-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
