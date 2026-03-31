export function Footer({ light = false }) {
  const year = new Date().getFullYear()
  const base = light
    ? 'text-white/40 border-white/10'
    : 'text-ink-faint border-surface-border'
  const strong = light ? 'text-white font-semibold' : 'text-ink font-semibold'

  return (
    <footer className={`w-full border-t px-4 py-2.5 text-center text-[11px] leading-relaxed ${base}`}>
      <span className={strong}>
        Powered by Prof. Dr. Najia Saher (Chairperson) &nbsp;·&nbsp; Developed by Mr. Muzammil Ur Rehman (Lecturer)
      </span>
      <br />
      &copy; {year} Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur.
    </footer>
  )
}
