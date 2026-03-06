import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

// Mock data for POC — replace with real API calls
const mockScoreHistory = [
  { date: 'Dec 1', score: 45 }, { date: 'Dec 5', score: 52 },
  { date: 'Dec 10', score: 48 }, { date: 'Dec 15', score: 61 },
  { date: 'Dec 20', score: 67 }, { date: 'Dec 25', score: 71 },
  { date: 'Jan 1', score: 69 }, { date: 'Jan 5', score: 74 },
  { date: 'Jan 10', score: 78 }, { date: 'Jan 15', score: 82 },
]

const mockRecentScans = [
  { repo: 'myorg/infra-prod', score: 82, violations: 3, critical: 0, drift: false, time: '2m ago', status: 'passed' },
  { repo: 'myorg/infra-staging', score: 67, violations: 7, critical: 2, drift: true, time: '1h ago', status: 'warning' },
  { repo: 'myorg/services', score: 91, violations: 1, critical: 0, drift: false, time: '3h ago', status: 'passed' },
  { repo: 'myorg/data-platform', score: 44, violations: 14, critical: 5, drift: true, time: '6h ago', status: 'blocked' },
]

const mockViolationsByFamily = [
  { family: 'SC — System Protection', count: 8, color: '#ff3b5c' },
  { family: 'AC — Access Control', count: 6, color: '#ff6b2b' },
  { family: 'AU — Audit', count: 4, color: '#ffd93d' },
  { family: 'CM — Config Mgmt', count: 3, color: '#a78bfa' },
  { family: 'IA — Authentication', count: 2, color: '#00d4ff' },
]

export default function Overview() {
  const stats = [
    { label: 'Avg Compliance Score', value: '78', unit: '/100', color: 'var(--green)', icon: '📊' },
    { label: 'Repos Monitored', value: '4', unit: ' repos', color: 'var(--accent)', icon: '📦' },
    { label: 'Total Violations', value: '25', unit: ' open', color: 'var(--orange)', icon: '⚠️' },
    { label: 'Critical Violations', value: '7', unit: ' critical', color: 'var(--red)', icon: '🔴' },
    { label: 'Scans Today', value: '12', unit: ' scans', color: 'var(--purple)', icon: '🔍' },
    { label: 'Drift Detected', value: '2', unit: ' repos', color: 'var(--yellow)', icon: '🔄' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Overview</h1>
          <div style={styles.subtitle}>Infrastructure compliance across all repositories</div>
        </div>
        <div style={styles.lastScan}>Last scan: <span style={{ color: 'var(--green)' }}>2 minutes ago</span></div>
      </div>

      {/* Stats Grid */}
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

      {/* Charts Row */}
      <div style={styles.chartsRow}>

        {/* Score Trend */}
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Compliance Score Trend</div>
          <div style={styles.chartSub}>Last 30 days across all repos</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={mockScoreHistory}>
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

        {/* Violations by NIST Family */}
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Violations by NIST Family</div>
          <div style={styles.chartSub}>Current open violations</div>
          <div style={styles.violationBars}>
            {mockViolationsByFamily.map(v => (
              <div key={v.family} style={styles.vBar}>
                <div style={styles.vBarLabel}>{v.family}</div>
                <div style={styles.vBarTrack}>
                  <div style={{ ...styles.vBarFill, width: `${(v.count / 14) * 100}%`, background: v.color }} />
                </div>
                <div style={{ ...styles.vBarCount, color: v.color }}>{v.count}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Recent Scans */}
      <div style={styles.tableCard}>
        <div style={styles.tableHeader}>
          <div style={styles.chartTitle}>Recent Scans</div>
          <div style={styles.chartSub}>Latest pipeline runs across all repos</div>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              {['Repository', 'Score', 'Violations', 'Drift', 'Time', 'Status'].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockRecentScans.map((scan, i) => (
              <tr key={i} style={styles.tr}>
                <td style={styles.td}>
                  <span style={styles.repoName}>📦 {scan.repo}</span>
                </td>
                <td style={styles.td}>
                  <span style={{ color: scan.score >= 80 ? 'var(--green)' : scan.score >= 60 ? 'var(--yellow)' : 'var(--red)', fontWeight: 700 }}>
                    {scan.score}
                  </span>
                  <span style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>/100</span>
                </td>
                <td style={styles.td}>
                  <span style={{ color: scan.critical > 0 ? 'var(--red)' : 'var(--muted)' }}>
                    {scan.violations} {scan.critical > 0 && <span style={{ color: 'var(--red)' }}>({scan.critical} crit)</span>}
                  </span>
                </td>
                <td style={styles.td}>
                  {scan.drift
                    ? <span style={{ color: 'var(--yellow)' }}>⚠️ Detected</span>
                    : <span style={{ color: 'var(--green)' }}>✅ None</span>
                  }
                </td>
                <td style={{ ...styles.td, color: 'var(--muted)' }}>{scan.time}</td>
                <td style={styles.td}>
                  <StatusBadge status={scan.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    passed:  { label: '✅ Passed',  bg: 'rgba(0,255,136,0.1)',   color: 'var(--green)',  border: 'rgba(0,255,136,0.3)' },
    warning: { label: '⚠️ Warning', bg: 'rgba(255,211,61,0.1)',  color: 'var(--yellow)', border: 'rgba(255,211,61,0.3)' },
    blocked: { label: '🚫 Blocked', bg: 'rgba(255,59,92,0.1)',   color: 'var(--red)',    border: 'rgba(255,59,92,0.3)' },
  }
  const s = map[status] || map.passed
  return (
    <span style={{
      display: 'inline-block',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
      borderRadius: '6px', padding: '0.2rem 0.6rem',
      fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
    }}>
      {s.label}
    </span>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '2rem',
  },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { fontSize: '0.75rem', color: 'var(--muted)' },
  lastScan: { fontSize: '0.72rem', color: 'var(--muted)' },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
    gap: '1rem', marginBottom: '1.5rem',
  },
  statCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '12px', padding: '1.25rem',
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    transition: 'border-color 0.2s',
  },
  statIcon: { fontSize: '1.2rem', marginBottom: '0.25rem' },
  statValue: { fontSize: '1.8rem', fontWeight: 700, lineHeight: 1, fontFamily: 'var(--font-display)' },
  statUnit: { fontSize: '0.75rem', fontFamily: 'var(--font-mono)', opacity: 0.7 },
  statLabel: { fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' },
  chartsRow: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '1rem', marginBottom: '1.5rem',
  },
  chartCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '14px', padding: '1.5rem',
  },
  chartTitle: { fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.2rem' },
  chartSub: { fontSize: '0.68rem', color: 'var(--muted)', marginBottom: '1rem' },
  violationBars: { display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' },
  vBar: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  vBarLabel: { fontSize: '0.65rem', color: 'var(--muted)', width: '160px', flexShrink: 0 },
  vBarTrack: { flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' },
  vBarFill: { height: '100%', borderRadius: '3px', transition: 'width 0.5s ease' },
  vBarCount: { fontSize: '0.72rem', fontWeight: 700, width: '20px', textAlign: 'right' },
  tableCard: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '14px', overflow: 'hidden',
  },
  tableHeader: { padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '0.75rem 1rem', textAlign: 'left',
    fontSize: '0.65rem', color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.15em',
    background: 'var(--surface2)',
    borderBottom: '1px solid var(--border)',
  },
  tr: { borderBottom: '1px solid var(--border)', transition: 'background 0.15s' },
  td: { padding: '0.85rem 1rem', fontSize: '0.78rem' },
  repoName: { color: 'var(--text)', fontFamily: 'var(--font-mono)' },
}
