import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import AuthPage from './components/AuthPage'
import Sidebar from './components/Sidebar'
import Overview from './components/Overview'
import Settings from './components/Settings'
import ComingSoon from './components/ComingSoon'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState('overview')

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
  }

  if (loading) return <LoadingScreen />
  if (!session) return <AuthPage onAuth={setSession} />

  const renderPage = () => {
    switch (page) {
      case 'overview':   return <Overview />
      case 'settings':   return <Settings user={session.user} />
      default:           return <ComingSoon page={page} />
    }
  }

  return (
    <div style={styles.app}>
      <Sidebar
        page={page}
        setPage={setPage}
        user={session.user}
        onSignOut={handleSignOut}
      />
      <main style={styles.main} className="animate-fade">
        {renderPage()}
      </main>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={styles.loading}>
      <div style={styles.loadingLogo}>🧠</div>
      <div style={styles.loadingText}>PipelineIQ</div>
      <div style={styles.loadingDots}>
        <span style={{ animationDelay: '0s' }} className="animate-pulse">▪</span>
        <span style={{ animationDelay: '0.2s' }} className="animate-pulse">▪</span>
        <span style={{ animationDelay: '0.4s' }} className="animate-pulse">▪</span>
      </div>
    </div>
  )
}

const styles = {
  app: {
    display: 'flex', height: '100vh', overflow: 'hidden',
    background: 'var(--bg)',
  },
  main: {
    flex: 1, overflowY: 'auto',
    background: 'var(--bg)',
    backgroundImage: 'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(0,212,255,0.04) 0%, transparent 60%)',
  },
  loading: {
    height: '100vh', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
  },
  loadingLogo: { fontSize: '2.5rem', marginBottom: '0.5rem' },
  loadingText: {
    fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
    background: 'linear-gradient(90deg, var(--accent), var(--green))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  loadingDots: { display: 'flex', gap: '0.25rem', color: 'var(--accent)', fontSize: '1.2rem' },
}
