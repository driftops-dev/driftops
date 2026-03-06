export default function ComingSoon({ page }) {
  const map = {
    scans:      { icon: '🔍', title: 'Scan History',     desc: 'Full history of every pipeline scan, AI reports, and violation details.' },
    compliance: { icon: '🏛️', title: 'Compliance',       desc: 'NIST 800-53 control-by-control breakdown with remediation guidance.' },
    drift:      { icon: '🔄', title: 'Drift Detection',  desc: 'Timeline of every infrastructure change across all repos.' },
    diagrams:   { icon: '📐', title: 'Architecture Diagrams', desc: 'Auto-generated L1–L4 diagrams updated on every deploy.' },
    repos:      { icon: '📦', title: 'Repositories',     desc: 'Manage connected repos, configure per-repo settings and enforcement.' },
  }

  const p = map[page] || { icon: '🔧', title: page, desc: 'Coming soon.' }

  return (
    <div style={styles.page}>
      <div style={styles.card} className="animate-fade">
        <div style={styles.icon}>{p.icon}</div>
        <h2 style={styles.title}>{p.title}</h2>
        <p style={styles.desc}>{p.desc}</p>
        <div style={styles.badge}>Building in Phase 2</div>
        <div style={styles.progress}>
          <div style={styles.progressFill} />
        </div>
        <div style={styles.hint}>
          The core engine is live. Dashboard pages are being built next.<br/>
          <span style={{ color: 'var(--accent)' }}>Check back soon — or contribute on GitHub.</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: {
    flex: 1, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    padding: '2rem',
  },
  card: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '20px', padding: '3rem',
    maxWidth: '480px', width: '100%', textAlign: 'center',
  },
  icon: { fontSize: '3rem', marginBottom: '1rem' },
  title: {
    fontFamily: 'var(--font-display)', fontSize: '1.5rem',
    fontWeight: 700, marginBottom: '0.75rem',
  },
  desc: {
    fontSize: '0.82rem', color: 'var(--muted)',
    lineHeight: 1.7, marginBottom: '1.5rem',
  },
  badge: {
    display: 'inline-block',
    background: 'rgba(0,212,255,0.1)', color: 'var(--accent)',
    border: '1px solid rgba(0,212,255,0.2)',
    borderRadius: '999px', padding: '0.3rem 1rem',
    fontSize: '0.72rem', marginBottom: '1.5rem',
  },
  progress: {
    height: '4px', background: 'var(--border)',
    borderRadius: '2px', overflow: 'hidden',
    marginBottom: '1.5rem',
  },
  progressFill: {
    width: '35%', height: '100%',
    background: 'linear-gradient(90deg, var(--accent), var(--green))',
    borderRadius: '2px',
    animation: 'pulse 2s ease infinite',
  },
  hint: {
    fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.7,
  },
}
