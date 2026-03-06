/**
 * PipelineIQ — AI Engine
 * Uses Groq's free API tier (Llama 3) to generate human-readable
 * compliance reports, explain violations, and suggest remediations
 *
 * Groq free tier: https://console.groq.com (no credit card required)
 * Swap GROQ_API_KEY → ANTHROPIC_API_KEY when scaling to production
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile'; // Free on Groq

/**
 * Generate a full AI compliance report from scan results
 */
async function generateComplianceReport({ snapshot, diff, violations, complianceScore }) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.warn('⚠️  No GROQ_API_KEY found — skipping AI report. Add to repo secrets for AI analysis.');
    return buildFallbackReport({ snapshot, diff, violations, complianceScore });
  }

  const prompt = buildPrompt({ snapshot, diff, violations, complianceScore });

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are PipelineIQ, an expert AI infrastructure security and compliance analyst.
You analyze Terraform infrastructure changes and NIST 800-53 compliance violations.
You write clear, actionable reports for DevOps engineers.
Always be specific about what needs to change and why it matters.
Format your response in clean Markdown.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error: ${response.status} — ${err}`);
    }

    const data = await response.json();
    const aiReport = data.choices?.[0]?.message?.content;

    return {
      ai_generated: true,
      model: GROQ_MODEL,
      report: aiReport,
      tokens_used: data.usage?.total_tokens || 0
    };

  } catch (err) {
    console.error('AI report generation failed:', err.message);
    return buildFallbackReport({ snapshot, diff, violations, complianceScore });
  }
}

/**
 * Build the prompt sent to the AI
 */
function buildPrompt({ snapshot, diff, violations, complianceScore }) {
  const criticalViolations = violations.filter(v => v.severity === 'critical');
  const highViolations = violations.filter(v => v.severity === 'high');

  return `
## Infrastructure Scan Results

**Compliance Score:** ${complianceScore}/100
**Total Resources:** ${snapshot.resource_count}
**Providers:** ${snapshot.providers.join(', ') || 'unknown'}
**Scan Time:** ${snapshot.timestamp}

## Infrastructure Changes
${diff.is_first_scan
  ? `This is the first scan. ${snapshot.resource_count} resources inventoried.`
  : `**${diff.summary}**
- Added: ${diff.stats.added} resources
- Removed: ${diff.stats.removed} resources  
- Modified: ${diff.stats.modified} resources
- Risk Level: ${diff.risk_level.toUpperCase()}`
}

${diff.added?.length > 0 ? `
### Added Resources
${diff.added.slice(0, 5).map(r => `- \`${r.id}\` (${r.file}:${r.line})`).join('\n')}
` : ''}

${diff.modified?.length > 0 ? `
### Modified Resources
${diff.modified.slice(0, 5).map(r =>
  `- \`${r.id}\`: ${r.changes.map(c => `${c.field} changed from \`${c.from}\` → \`${c.to}\``).join(', ')}`
).join('\n')}
` : ''}

## NIST 800-53 Violations (${violations.length} total)

${criticalViolations.length > 0 ? `
### 🔴 Critical (${criticalViolations.length})
${criticalViolations.slice(0, 5).map(v =>
  `- **${v.control_id} ${v.control_name}** on \`${v.resource_id}\`\n  ${v.message}`
).join('\n')}
` : ''}

${highViolations.length > 0 ? `
### 🟠 High (${highViolations.length})
${highViolations.slice(0, 5).map(v =>
  `- **${v.control_id} ${v.control_name}** on \`${v.resource_id}\`\n  ${v.message}`
).join('\n')}
` : ''}

---

Please provide:
1. **Executive Summary** (2-3 sentences, non-technical)
2. **Top 3 Immediate Actions** (specific Terraform changes needed)
3. **Risk Assessment** (what could go wrong if violations aren't fixed)
4. **Compliance Trend** (what this score means for an audit)
`;
}

/**
 * Fallback report when no API key is set (still useful, just not AI-written)
 */
function buildFallbackReport({ snapshot, diff, violations, complianceScore }) {
  const critical = violations.filter(v => v.severity === 'critical');
  const high = violations.filter(v => v.severity === 'high');
  const medium = violations.filter(v => v.severity === 'medium');

  const scoreEmoji = complianceScore >= 80 ? '🟢' : complianceScore >= 60 ? '🟡' : '🔴';

  let report = `## PipelineIQ Compliance Report\n\n`;
  report += `${scoreEmoji} **Compliance Score: ${complianceScore}/100**\n\n`;
  report += `**Resources scanned:** ${snapshot.resource_count} | `;
  report += `**Violations:** ${violations.length} (${critical.length} critical, ${high.length} high, ${medium.length} medium)\n\n`;

  if (!diff.is_first_scan) {
    report += `### Infrastructure Changes\n${diff.summary}\n\n`;
  }

  if (critical.length > 0) {
    report += `### 🔴 Critical Violations — Fix Immediately\n`;
    for (const v of critical) {
      report += `- **${v.control_id}** \`${v.resource_id}\`: ${v.message}\n`;
      report += `  *Remediation:* ${v.remediation}\n`;
    }
    report += '\n';
  }

  if (high.length > 0) {
    report += `### 🟠 High Violations\n`;
    for (const v of high.slice(0, 5)) {
      report += `- **${v.control_id}** \`${v.resource_id}\`: ${v.message}\n`;
    }
    report += '\n';
  }

  report += `> 💡 Add \`GROQ_API_KEY\` to your repo secrets for AI-powered analysis and remediation suggestions.\n`;
  report += `> Get your free key at https://console.groq.com — no credit card required.\n`;

  return {
    ai_generated: false,
    model: 'fallback',
    report,
    tokens_used: 0
  };
}

/**
 * Format report as a GitHub PR comment
 */
function formatPRComment({ report, complianceScore, diff, violations, blocked }) {
  const scoreBar = buildScoreBar(complianceScore);
  const statusEmoji = blocked ? '🚫' : complianceScore >= 80 ? '✅' : '⚠️';
  const statusText = blocked ? 'BLOCKED — Critical violations found' : 'Passed';

  return `## ${statusEmoji} PipelineIQ — Infrastructure Compliance Report

${scoreBar}

**Status:** ${statusText}
**Score:** ${complianceScore}/100
**Violations:** ${violations.length} (${violations.filter(v => v.severity === 'critical').length} critical)
**Drift:** ${diff.drift_detected ? `⚠️ ${diff.summary}` : '✅ No drift detected'}

---

${report.report}

---
<sub>🧠 Powered by PipelineIQ • NIST 800-53 Rev 5 • <a href="https://pipelineiq.dev">pipelineiq.dev</a></sub>
`;
}

/**
 * Build a visual score bar
 */
function buildScoreBar(score) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';
  return `${color} \`[${bar}]\` ${score}/100`;
}

module.exports = { generateComplianceReport, formatPRComment };
