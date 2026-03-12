import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase, fetchDashboard, fetchScans } from '../lib/supabase'

export default function Overview() {
  const [data, setData] = useState(null)
  const [scans, setScans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastRefresh, setLastRefresh] = useState(null)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const token = session.access_token
      const [dashboard, scanHistory] = await Promise.all([
        fetchDashboard(token),
        fetchScans(token)
      ])
      setData(dashboard)
      setScans(scanHistory || [])
      setLastRefresh(new Date())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={load} />

  const recentScans = scans.slice(0, 10)
  const totalViolations = data?.recent_scans?.reduce((a, s) => a + (s.violations_count || 0), 0) || 0
  const totalCritical = data?.recent_scans?.reduce((a, s) => a + (s.critical_count || 0), 0) || 0
  const driftRepos = data?.recent_scans?.filter(s => s.drift_detected).length || 0

  const scoreTrend = recentScans
    .filter(s => s.score != null)
    .map(s => ({
      date: new Date(s.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: s.score
    }))
    .reverse()

  const stats = [
    { label: 'Avg Compliance Score', value: data?.avg_compliance_score ?? '—', unit: '/100',      color: 'var(--green)',   icon: '📊' },
    { label: 'Repos Monitored',      value: data?.repos_monitored ?? 0,         unit: ' repos',    color: 'var(--accent)',  icon: '📦' },
    { label: 'Total Scans',          value: data?.total_scans ?? 0,             unit: ' scans',    color: 'var(--purple)',  icon: '🔍' },
    { label: 'Total Violations',     value: totalViolations,                    unit: ' open',     color: 'var(--orange)',  icon: '⚠️' },
    { label: 'Critical Violations',  value: totalCritical,                      unit: ' critical', color: 'var(--red)',     icon: '🔴' },
    { label: 'Drift Detected',       value: driftRepos,                         unit: ' repos',    color: 'var(--yellow)',  icon: '🔄' },
  ]

  const timeAgo = (ts) => {
    const diff = Date.now() - new Date(ts)
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Overview</h1>
          <div style={styles.subtitle}>Infrastructure compliance across all repositories</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastRefresh && (
            <div style={styles.lastScan}>
              Refreshed: <span style={{ color: 'var(--green)' }}>{timeAgo(lastRefresh)}</span>
            </div>
          )}
          <button onClick={load} style={styles.refreshBtn}>↻ Refresh</button>
        </div>
      </div>

      <div style={styles.statsGrid}>
        {stats.map(s => (
          <div key={s.label} style={styles.statCard}>
            <div style={styles.statIcon}>{s.icon}</div>
            <div style={{ ...styles.statValue, color: s.color }}>
              {s.value}<span style={styles.statUnit}>{s.unit}</span>
            </div>
            <div style={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>

      {scoreTrend.length > 1 && (
        <div style={{ ...styles.chartCard, marginBottom: '1.5rem' }}>
          <div style={styles.chartTitle}>Compliance Score Trend</div>
          <div style={styles.chartSub}>Recent scans across all repos</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={scoreTrend}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: '#5a6a85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#5a6a85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.75rem' }}
                labelStyle={{ color: 'var(--muted)' }}
                itemStyle={{ color: 'var(--accent)' }}
              />
              <Area type="monotone" dataKey="score" stroke="#00d4ff" strokeWidth={2} fill="url(#scoreGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.chartTitle}>Recent Scans</div>
          <div style={styles.chartSub}>
            {recentScans.length === 0
              ? 'No scans yet — add DriftOps to a pipeline to see results here'
              : `${recentScans.length} most recent pipeline runs`}
          </div>
        </div>
        {recentScans.length === 0 ? <EmptyState /> : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Repository', 'Score', 'Violations', 'Drift', 'Time', 'Status'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentScans.map((scan, i) => {
                const status = scan.critical_count > 0 ? 'blocked' : scan.violations_count > 3 ? 'warning' : 'passed'
                return (
                  <tr key={i} style={styles.tr}>
                    <td style={styles.td}><span style={styles.repoName}>📦 {scan.repo}</span></td>
                    <td style={styles.td}>
                      <span style={{ color: scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                        {scan.score ?? '—'}
                      </span>
                      {scan.score != null && <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>/100</span>}
                    </td>
                    <td style={styles.td}>
                      <span style={{ color: scan.critical_count > 0 ? 'var(--red)' : 'var(--muted)' }}>
                        {scan.violations_count || 0}
                        {scan.critical_count > 0 && <span style={{ color: 'var(--red)' }}> ({scan.critical_count} crit)</span>}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {scan.drift_detected
                        ? <span style={{ color: 'var(--yellow)' }}>⚠️ Detected</span>
                        : <span style={{ color: 'var(--green)' }}>✅ None</span>}
                    </td>
                    <td style={{ ...styles.td, color: 'var(--muted)' }}>{timeAgo(scan.timestamp)}</td>
                    <td style={styles.td}><StatusBadge status={status} /></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    passed:  { label: '✅ Passed',  bg: 'rgba(0,255,136,0.1)',  color: 'var(--green)',  border: 'rgba(0,255,136,0.3)' },
    warning: { label: '⚠️ Warning', bg: 'rgba(255,211,61,0.1)', color: 'var(--yellow)', border: 'rgba(255,211,61,0.3)' },
    blocked: { label: '🚫 Blocked', bg: 'rgba(255,59,92,0.1)',  color: 'var(--red)',    border: 'rgba(255,59,92,0.3)' },
  }
  const s = map[status] || map.passed
  return (
    <span style={{ display: 'inline-block', background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontFamily: 'var(--font-mono)' }}>
      {s.label}
    </span>
  )
}

function LoadingState() {
  return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.85rem' }}>Loading dashboard data...</div>
}

function ErrorState({ error, onRetry }) {
  return (
    <div style={{ padding: '4rem', textAlign: 'center' }}>
      <div style={{ color: 'var(--red)', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</div>
      <button onClick={onRetry} style={{ background: 'var(--accent)', color: 'var(--bg)', border: 'none', padding: '0.5rem 1.25rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Retry</button>
    </div>
  )
}

function EmptyState() {
  return (
    <div style={{ padding: '3rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔍</div>
      <div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.4rem' }}>No scans yet</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.78rem', maxWidth: '360px', margin: '0 auto', lineHeight: 1.6 }}>
        Add DriftOps to a GitHub Actions workflow to start seeing compliance results here.
      </div>
      <a href="https://github.com/driftops-dev/driftops" target="_blank" rel="noreferrer"
        style={{ display: 'inline-block', marginTop: '1rem', color: 'var(--accent)', fontSize: '0.78rem', textDecoration: 'none' }}>
        View setup docs →
      </a>
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { fontSize: '0.75rem', color: 'var(--muted)' },
  lastScan: { fontSize: '0.72rem', color: 'var(--muted)' },
  refreshBtn: { background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', padding: '0.35rem 0.85rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' },
  statCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  statIcon: { fontSize: '1.2rem', marginBottom: '0.25rem' },
  statValue: { fontSize: '1.8rem', fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-display)' },
  statUnit: { fontSize: '0.75rem', fontFamily: 'var(--font-mono)', opacity: 0.7 },
  statLabel: { fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  chartCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.5rem' },
  chartTitle: { fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' },
  chartSub: { fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '1rem' },
  tableCard: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' },
  tableHeader: { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.15em', background: 'var(--surface2)', borderBottom: '1px solid var(--border)' },
  tr: { borderBottom: '1px solid var(--border)' },
  td: { padding: '0.85rem 1rem', fontSize: '0.78rem' },
  repoName: { color: 'var(--text)', fontFamily: 'var(--font-mono)' },
}
