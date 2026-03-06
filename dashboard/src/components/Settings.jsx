import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Settings({ user }) {
  const [token, setToken] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [enforce, setEnforce] = useState(false)
  const [threshold, setThreshold] = useState('critical')

  const generateToken = async () => {
    setGenerating(true)
    // Generate a random token (in prod this goes to Supabase + hashed)
    const raw = 'piq_' + Array.from(crypto.getRandomValues(new Uint8Array(24)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    setToken(raw)
    setGenerating(false)
  }

  const copyToken = () => {
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Settings</h1>
        <div style={styles.subtitle}>Configure PipelineIQ for your organization</div>
      </div>

      {/* API Token */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>🔑 API Token</div>
        <div style={styles.sectionDesc}>
          Add this token as <code style={styles.code}>PIPELINEIQ_TOKEN</code> in your GitHub repo secrets to enable drift detection and state storage.
        </div>
        {!token ? (
          <button onClick={generateToken} disabled={generating} style={styles.btn}>
            {generating ? 'Generating...' : 'Generate Token →'}
          </button>
        ) : (
          <div style={styles.tokenBox}>
            <div style={styles.tokenWarning}>⚠️ Copy this now — it won't be shown again</div>
            <div style={styles.tokenRow}>
              <code style={styles.tokenValue}>{token}</code>
              <button onClick={copyToken} style={styles.copyBtn}>
                {copied ? '✅ Copied' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enforce Mode */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>⚡ Enforce Mode</div>
        <div style={styles.sectionDesc}>
          When enabled, PipelineIQ will block deploys that introduce violations above the severity threshold. This is a global setting — you can also override per-repo in your workflow YAML.
        </div>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>Block non-compliant deploys</div>
            <div style={styles.toggleSub}>Requires admin approval to enable</div>
          </div>
          <div
            onClick={() => setEnforce(!enforce)}
            style={{ ...styles.toggle, background: enforce ? 'var(--green)' : 'var(--border)' }}
          >
            <div style={{ ...styles.toggleKnob, transform: enforce ? 'translateX(20px)' : 'translateX(2px)' }} />
          </div>
        </div>

        {enforce && (
          <div style={styles.thresholdRow}>
            <label style={styles.label}>Severity threshold</label>
            <select value={threshold} onChange={e => setThreshold(e.target.value)} style={styles.select}>
              <option value="critical">Critical only</option>
              <option value="high">High and above</option>
              <option value="medium">Medium and above</option>
            </select>
          </div>
        )}
      </div>

      {/* Compliance Frameworks */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>🏛️ Compliance Frameworks</div>
        <div style={styles.sectionDesc}>Select which frameworks to benchmark against on every scan.</div>
        <div style={styles.frameworkGrid}>
          {[
            { id: 'nist', label: 'NIST 800-53 Rev 5', sub: 'Full control family coverage', enabled: true, locked: false },
            { id: 'cis', label: 'CIS Benchmarks', sub: 'AWS / Azure / GCP', enabled: false, locked: false },
            { id: 'soc2', label: 'SOC 2 Type II', sub: 'Coming in Phase 2', enabled: false, locked: true },
            { id: 'iso', label: 'ISO 27001', sub: 'Coming in Phase 2', enabled: false, locked: true },
          ].map(f => (
            <div key={f.id} style={{ ...styles.frameworkCard, opacity: f.locked ? 0.5 : 1 }}>
              <div style={styles.frameworkInfo}>
                <div style={styles.frameworkName}>{f.label}</div>
                <div style={styles.frameworkSub}>{f.sub}</div>
              </div>
              {f.locked
                ? <span style={styles.comingSoon}>Soon</span>
                : <div style={{ ...styles.toggle, background: f.enabled ? 'var(--green)' : 'var(--border)', width: '36px', height: '20px' }}>
                    <div style={{ ...styles.toggleKnob, transform: f.enabled ? 'translateX(18px)' : 'translateX(2px)', width: '14px', height: '14px', top: '3px' }} />
                  </div>
              }
            </div>
          ))}
        </div>
      </div>

      {/* Install Instructions */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>📋 Quick Install</div>
        <div style={styles.sectionDesc}>Add this to <code style={styles.code}>.github/workflows/pipelineiq.yml</code> in any repo:</div>
        <div style={styles.codeBlock}>
          <div style={styles.codeHeader}>
            <span>pipelineiq.yml</span>
          </div>
          <pre style={styles.codePre}>{`- name: PipelineIQ Scan
  uses: pipelineiq1/pipelineiq@v1
  with:
    iac_path: './terraform'
    compliance_level: 'nist-800-53'
    enforce: false
  env:
    PIPELINEIQ_TOKEN: \${{ secrets.PIPELINEIQ_TOKEN }}
    GROQ_API_KEY: \${{ secrets.GROQ_API_KEY }}
    GITHUB_TOKEN: \${{ secrets.GITHUB_TOKEN }}`}
          </pre>
        </div>
      </div>

      {/* Account */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>👤 Account</div>
        <div style={styles.accountRow}>
          <div>
            <div style={styles.accountEmail}>{user?.email}</div>
            <div style={styles.accountPlan}>Free Plan · Upgrade for unlimited repos</div>
          </div>
          <button style={styles.upgradeBtn}>Upgrade to Pro →</button>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { padding: '2rem', maxWidth: '800px', margin: '0 auto' },
  header: { marginBottom: '2rem' },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 700, marginBottom: '0.25rem' },
  subtitle: { fontSize: '0.75rem', color: 'var(--muted)' },
  section: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    borderRadius: '14px', padding: '1.5rem', marginBottom: '1.25rem',
  },
  sectionTitle: { fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.4rem' },
  sectionDesc: { fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1rem' },
  code: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '4px', padding: '0.1rem 0.4rem',
    fontSize: '0.75rem', color: 'var(--accent)',
  },
  btn: {
    background: 'linear-gradient(135deg, var(--accent), var(--green))',
    color: '#000', fontWeight: 700, fontSize: '0.82rem',
    padding: '0.65rem 1.25rem', borderRadius: '9px',
    fontFamily: 'var(--font-mono)',
  },
  tokenBox: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '10px', padding: '1rem',
  },
  tokenWarning: { fontSize: '0.7rem', color: 'var(--yellow)', marginBottom: '0.75rem' },
  tokenRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  tokenValue: { flex: 1, fontSize: '0.72rem', color: 'var(--green)', wordBreak: 'break-all' },
  copyBtn: {
    background: 'var(--surface)', border: '1px solid var(--border)',
    color: 'var(--text)', fontSize: '0.72rem', padding: '0.4rem 0.75rem',
    borderRadius: '7px', fontFamily: 'var(--font-mono)', flexShrink: 0,
  },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' },
  toggleLabel: { fontSize: '0.82rem', fontWeight: 500 },
  toggleSub: { fontSize: '0.68rem', color: 'var(--muted)' },
  toggle: {
    width: '44px', height: '24px', borderRadius: '12px',
    position: 'relative', cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
  },
  toggleKnob: {
    position: 'absolute', top: '4px',
    width: '16px', height: '16px', borderRadius: '50%',
    background: '#fff', transition: 'transform 0.2s',
  },
  thresholdRow: { display: 'flex', alignItems: 'center', gap: '1rem' },
  label: { fontSize: '0.72rem', color: 'var(--muted)', whiteSpace: 'nowrap' },
  select: { maxWidth: '220px' },
  frameworkGrid: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  frameworkCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '9px', padding: '0.85rem 1rem',
  },
  frameworkInfo: {},
  frameworkName: { fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.2rem' },
  frameworkSub: { fontSize: '0.65rem', color: 'var(--muted)' },
  comingSoon: {
    fontSize: '0.6rem', padding: '0.2rem 0.5rem',
    background: 'rgba(167,139,250,0.1)', color: 'var(--purple)',
    border: '1px solid rgba(167,139,250,0.3)', borderRadius: '4px',
  },
  codeBlock: {
    background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: '10px', overflow: 'hidden',
  },
  codeHeader: {
    padding: '0.6rem 1rem', borderBottom: '1px solid var(--border)',
    fontSize: '0.68rem', color: 'var(--muted)',
  },
  codePre: {
    padding: '1rem', fontSize: '0.72rem', color: 'var(--green)',
    overflowX: 'auto', margin: 0, lineHeight: 1.8,
  },
  accountRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' },
  accountEmail: { fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.2rem' },
  accountPlan: { fontSize: '0.68rem', color: 'var(--muted)' },
  upgradeBtn: {
    background: 'rgba(0,212,255,0.1)', color: 'var(--accent)',
    border: '1px solid rgba(0,212,255,0.3)',
    fontSize: '0.75rem', padding: '0.5rem 1rem',
    borderRadius: '8px', fontFamily: 'var(--font-mono)',
    transition: 'background 0.2s',
  },
}
