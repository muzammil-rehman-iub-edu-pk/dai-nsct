export function Footer({ light = false }) {
  const year = new Date().getFullYear()
  const base = light
    ? 'text-white/30 border-white/10'
    : 'text-ink-faint border-surface-border'

  return (
    <footer className={`w-full border-t px-4 py-2.5 text-center text-[11px] leading-relaxed ${base}`}>
      Powered by <span className="font-medium">Prof. Dr. Najia Saher</span> (Chairperson) &nbsp;·&nbsp; Developed by <span className="font-medium">Mr. Muzammil Ur Rehman</span> (Lecturer)
      <br className="sm:hidden" />
      <span className="hidden sm:inline"> &nbsp;·&nbsp; </span>
      &copy; {year} Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur.
    </footer>
  )
}
