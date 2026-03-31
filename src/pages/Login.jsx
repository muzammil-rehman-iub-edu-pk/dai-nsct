import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Footer } from '../components/layout/Footer'
import { BookOpen, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { signIn, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  // When profile loads after sign-in, redirect to the role's home page.
  // ForcePasswordChange in App.jsx will intercept and show the modal if needed.
  useEffect(() => {
    if (!loading && profile) {
      const dest = `/${profile.role}`
      navigate(dest, { replace: true })
    }
  }, [profile, loading, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(form.email, form.password)
      // Navigation handled by the useEffect above once profile loads
    } catch (err) {
      setError(err.message || 'Invalid email or password')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-secondary-dark flex flex-col items-center justify-center p-4">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-5"
           style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative z-10 w-full max-w-md flex-1 flex flex-col items-center justify-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur mb-4">
            <BookOpen size={32} className="text-white" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white mb-1">DAI-NSCT</h1>
          <p className="text-white/60 text-sm">Department of Artificial Intelligence - National Skills Competency Test</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl3 p-5 sm:p-8 shadow-lift w-full">
          <h2 className="font-display text-2xl text-white mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div>
              <label className="form-label text-white/80">Email Address</label>
              <input
                className="form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/60"
                type="email"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@example.com"
                required autoFocus
              />
            </div>

            <div>
              <label className="form-label text-white/80">Password</label>
              <div className="relative">
                <input
                  className="form-input bg-white/10 border-white/20 text-white placeholder-white/30 focus:border-white/60 pr-10"
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Your password"
                  required
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-danger/20 border border-danger/30 text-sm text-white">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || loading}
              className="btn bg-white text-primary font-semibold hover:bg-white/90 w-full justify-center mt-2">
              {submitting || loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-6">
            Hint: Use your roll_number@iub.edu.pk as email.
          </p>
        </div>
      </div>

      <div className="relative z-10 w-full">
        <Footer light />
      </div>
    </div>
  )
}
