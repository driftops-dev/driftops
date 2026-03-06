export default function Sidebar({ page, setPage, user, onSignOut }) {
  const nav = [
    { id: 'overview',    icon: '📊', label: 'Overview' },
    { id: 'scans',       icon: '🔍', label: 'Scans' },
    { id: 'compliance',  icon: '🏛️', label: 'Compliance' },
    { id: 'drift',       icon: '🔄', label: 'Drift' },
    { id: 'diagrams',    icon: '📐', label: 'Diagrams' },
    { id: 'repos',       icon: '📦', label: 'Repositories' },
    { id: 'settings',    icon: '⚙️',  label: 'Settings' },
  ]

  return (
    <aside style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logo}>
        <div style={styles.logoIcon}>🧠</div>
        <div>
          <div style={styles.logoText}>PipelineIQ</div>
          <div style={styles.logoSub}>Infrastructure Intelligence</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={styles.nav}>
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setPage(item.id)}
            style={{
              ...styles.navItem,
              ...(page === item.id ? styles.navActive : {})
            }}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
            {page === item.id && <span style={styles.navDot} />}
          </button>
        ))}
      </nav>

      {/* Install snippet */}
      <div style={styles.installBox}>
        <div style={styles.installLabel}>Quick Install</div>
        <div style={styles.installCode}>
          uses: pipelineiq/<br />
          &nbsp;&nbsp;pipelineiq@v1
        </div>
      </div>

      {/* User */}
      <div style={styles.user}>
        <div style={styles.userAvatar}>
          {user?.email?.[0]?.toUpperCase() || '?'}
        </div>
        <div style={styles.userInfo}>
          <div style={styles.userEmail}>{user?.email || 'user'}</div>
          <div style={styles.userPlan}>Free Plan</div>
        </div>
        <button onClick={onSignOut} style={styles.signOut} title="Sign out">↩</button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: {
    width: '240px', flexShrink: 0,
    background: 'var(--surface)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    padding: '1.5rem 1rem',
    gap: '0.5rem',
    height: '100vh',
    position: 'sticky', top: 0,
    overflowY: 'auto',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    marginBottom: '1.5rem', paddingBottom: '1.5rem',
    borderBottom: '1px solid var(--border)',
  },
  logoIcon: {
    width: '36px', height: '36px', flexShrink: 0,
    background: 'linear-gradient(135deg, var(--accent), var(--green))',
    borderRadius: '9px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '1.1rem',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '1rem', fontWeight: 700,
    background: 'linear-gradient(90deg, var(--accent), var(--green))',
    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
  },
  logoSub: { fontSize: '0.6rem', color: 'var(--muted)', letterSpacing: '0.05em' },
  nav: { display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.6rem 0.75rem',
    borderRadius: '9px',
    background: 'transparent',
    color: 'var(--muted)',
    fontSize: '0.8rem',
    fontFamily: 'var(--font-mono)',
    transition: 'all 0.15s',
    position: 'relative',
    textAlign: 'left',
  },
  navActive: {
    background: 'rgba(0,212,255,0.08)',
    color: 'var(--accent)',
    border: '1px solid rgba(0,212,255,0.15)',
  },
  navIcon: { fontSize: '1rem', width: '20px', textAlign: 'center' },
  navDot: {
    width: '6px', height: '6px', borderRadius: '50%',
    background: 'var(--accent)',
    marginLeft: 'auto',
  },
  installBox: {
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    padding: '0.75rem',
    margin: '0.5rem 0',
  },
  installLabel: { fontSize: '0.6rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.4rem' },
  installCode: { fontSize: '0.65rem', color: 'var(--green)', lineHeight: 1.6 },
  user: {
    display: 'flex', alignItems: 'center', gap: '0.6rem',
    padding: '0.75rem',
    borderTop: '1px solid var(--border)',
    marginTop: '0.5rem',
  },
  userAvatar: {
    width: '30px', height: '30px', borderRadius: '50%',
    background: 'linear-gradient(135deg, var(--accent), var(--purple))',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.75rem', fontWeight: 700, color: '#000',
    flexShrink: 0,
  },
  userInfo: { flex: 1, overflow: 'hidden' },
  userEmail: { fontSize: '0.7rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  userPlan: { fontSize: '0.6rem', color: 'var(--green)' },
  signOut: {
    background: 'transparent', color: 'var(--muted)',
    fontSize: '1rem', padding: '0.25rem',
    borderRadius: '6px',
    transition: 'color 0.2s',
  },
}
