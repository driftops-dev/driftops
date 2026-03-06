import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        onAuth(data.session)
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('Check your email to confirm your account.')
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.bg1} />
      <div style={styles.bg2} />

      <div style={styles.card} className="animate-fade">
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>🧠</div>
          <span style={styles.logoText}>PipelineIQ</span>
        </div>

        <div style={styles.tagline}>Infrastructure Intelligence Platform</div>

        <div style={styles.tabs}>
          {['login', 'signup'].map(t => (
            <button
              key={t}
              onClick={() => setMode(t)}
              style={{ ...styles.tab, ...(mode === t ? styles.tabActive : {}) }}
            >
              {t === 'login' ? 'Sign In' : 'Sign Up'}
            </button>
          ))}
        </div>

        <div style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <button
            onClick={handleSubmit}
            disabled={loading || !email || !password}
            style={{ ...styles.btn, ...(loading ? styles.btnLoading : {}) }}
          >
            {loading ? '...' : mode === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </div>

        <div style={styles.footer}>
          Free forever for individuals &nbsp;·&nbsp;
          <a href="https://github.com/pipelineiq1/pipelineiq" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    position: 'relative',
    overflow: 'hidden',
  },
  bg1: {
    position: 'fixed', top: '-20%', left: '-10%',
    width: '600px', height: '600px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,212,255,0.06) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  bg2: {
    position: 'fixed', bottom: '-20%', right: '-10%',
    width: '500px', height: '500px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(0,255,136,0.05) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: '20px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    position: 'relative',
    zIndex: 1,
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '0.5rem',
  },
  logoIcon: {
    width: '40px', height: '40px',
    background: 'linear-gradient(135deg, var(--accent), var(--green))',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.2rem',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.5rem', fontWeight: 700,
    background: 'linear-gradient(90deg, var(--accent), var(--green))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  tagline: {
    fontSize: '0.7rem', color: 'var(--muted)',
    letterSpacing: '0.1em', textTransform: 'uppercase',
    marginBottom: '2rem',
  },
  tabs: {
    display: 'flex', gap: '0.5rem',
    background: 'var(--surface2)',
    borderRadius: '10px', padding: '4px',
    marginBottom: '1.75rem',
  },
  tab: {
    flex: 1, padding: '0.5rem',
    background: 'transparent', color: 'var(--muted)',
    borderRadius: '8px', fontSize: '0.78rem',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.2s',
  },
  tabActive: {
    background: 'var(--surface)',
    color: 'var(--text)',
    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { fontSize: '0.7rem', color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase' },
  error: {
    background: 'rgba(255,59,92,0.1)', border: '1px solid rgba(255,59,92,0.3)',
    color: 'var(--red)', borderRadius: '8px', padding: '0.6rem 0.9rem',
    fontSize: '0.75rem',
  },
  success: {
    background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)',
    color: 'var(--green)', borderRadius: '8px', padding: '0.6rem 0.9rem',
    fontSize: '0.75rem',
  },
  btn: {
    background: 'linear-gradient(135deg, var(--accent), var(--green))',
    color: '#000', fontWeight: 700, fontSize: '0.85rem',
    padding: '0.8rem', borderRadius: '10px',
    fontFamily: 'var(--font-mono)',
    transition: 'opacity 0.2s, transform 0.1s',
    marginTop: '0.5rem',
  },
  btnLoading: { opacity: 0.6 },
  footer: {
    marginTop: '1.5rem', textAlign: 'center',
    fontSize: '0.68rem', color: 'var(--muted)',
  },
}
