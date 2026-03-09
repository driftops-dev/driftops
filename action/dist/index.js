/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 343:
/***/ ((module) => {

/**
 * DriftOps — AI Engine
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
            content: `You are DriftOps, an expert AI infrastructure security and compliance analyst.
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

  let report = `## DriftOps Compliance Report\n\n`;
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

  return `## ${statusEmoji} DriftOps — Infrastructure Compliance Report

${scoreBar}

**Status:** ${statusText}
**Score:** ${complianceScore}/100
**Violations:** ${violations.length} (${violations.filter(v => v.severity === 'critical').length} critical)
**Drift:** ${diff.drift_detected ? `⚠️ ${diff.summary}` : '✅ No drift detected'}

---

${report.report}

---
<sub>🧠 Powered by DriftOps • NIST 800-53 Rev 5 • <a href="https://driftops.dev">driftops.dev</a></sub>
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


/***/ }),

/***/ 557:
/***/ ((module) => {

/**
 * PipelineIQ Differ
 * Compares two infrastructure state snapshots and produces a
 * structured diff: added, removed, modified, and drifted resources
 */

/**
 * Compare two state snapshots
 * @param {Object} previous - prior state snapshot
 * @param {Object} current  - current state snapshot
 * @returns {Object} structured diff result
 */
function diffSnapshots(previous, current) {
  if (!previous) {
    return {
      is_first_scan: true,
      summary: 'First scan — no prior state to compare against.',
      added: current.resources,
      removed: [],
      modified: [],
      unchanged: [],
      drift_detected: false,
      risk_level: 'info',
      stats: {
        total_resources: current.resources.length,
        added: current.resources.length,
        removed: 0,
        modified: 0,
        unchanged: 0
      }
    };
  }

  const prevMap = new Map(previous.resources.map(r => [r.id, r]));
  const currMap = new Map(current.resources.map(r => [r.id, r]));

  const added = [];
  const removed = [];
  const modified = [];
  const unchanged = [];

  // Find added + modified
  for (const [id, currResource] of currMap) {
    const prevResource = prevMap.get(id);

    if (!prevResource) {
      added.push({
        ...currResource,
        change_type: 'added'
      });
    } else {
      const changes = getConfigChanges(prevResource.config, currResource.config);
      if (changes.length > 0) {
        modified.push({
          ...currResource,
          change_type: 'modified',
          changes,
          prev_config: prevResource.config
        });
      } else {
        unchanged.push({ ...currResource, change_type: 'unchanged' });
      }
    }
  }

  // Find removed
  for (const [id, prevResource] of prevMap) {
    if (!currMap.has(id)) {
      removed.push({
        ...prevResource,
        change_type: 'removed'
      });
    }
  }

  const driftDetected = added.length > 0 || removed.length > 0 || modified.length > 0;
  const riskLevel = assessRiskLevel(added, removed, modified);

  return {
    is_first_scan: false,
    drift_detected: driftDetected,
    risk_level: riskLevel,
    time_since_last_scan: getTimeDelta(previous.timestamp, current.timestamp),
    summary: buildDiffSummary(added, removed, modified, unchanged),
    added,
    removed,
    modified,
    unchanged,
    stats: {
      total_resources: current.resources.length,
      added: added.length,
      removed: removed.length,
      modified: modified.length,
      unchanged: unchanged.length
    }
  };
}

/**
 * Get field-level changes between two resource configs
 */
function getConfigChanges(prevConfig, currConfig) {
  const changes = [];
  const allKeys = new Set([...Object.keys(prevConfig || {}), ...Object.keys(currConfig || {})]);

  for (const key of allKeys) {
    const prev = prevConfig?.[key];
    const curr = currConfig?.[key];

    if (prev !== curr) {
      changes.push({
        field: key,
        from: prev ?? null,
        to: curr ?? null,
        type: !prev ? 'added_field' : !curr ? 'removed_field' : 'changed'
      });
    }
  }

  return changes;
}

/**
 * Assess overall risk level of the diff
 */
function assessRiskLevel(added, removed, modified) {
  // High-risk resource types
  const criticalTypes = [
    'aws_iam_role', 'aws_iam_policy', 'aws_iam_user',
    'aws_security_group', 'aws_security_group_rule',
    'aws_s3_bucket', 'aws_s3_bucket_policy',
    'aws_kms_key', 'aws_secretsmanager_secret',
    'azurerm_role_assignment', 'azurerm_key_vault',
    'google_iam_binding', 'google_storage_bucket'
  ];

  // High-risk config fields
  const criticalFields = [
    'assume_role_policy', 'policy', 'ingress', 'egress',
    'acl', 'public_access', 'encryption', 'kms_key_id',
    'publicly_accessible', 'skip_final_snapshot'
  ];

  const allChanges = [...added, ...removed, ...modified];

  for (const resource of allChanges) {
    if (criticalTypes.includes(resource.type)) return 'critical';

    const changes = resource.changes || [];
    for (const change of changes) {
      if (criticalFields.includes(change.field)) return 'high';
    }
  }

  if (removed.length > 0) return 'high';
  if (modified.length > 3) return 'medium';
  if (added.length > 0) return 'low';

  return 'info';
}

/**
 * Build a human-readable diff summary
 */
function buildDiffSummary(added, removed, modified, unchanged) {
  if (!added.length && !removed.length && !modified.length) {
    return `No infrastructure changes detected. ${unchanged.length} resources unchanged.`;
  }

  const parts = [];
  if (added.length) parts.push(`${added.length} resource${added.length > 1 ? 's' : ''} added`);
  if (removed.length) parts.push(`${removed.length} resource${removed.length > 1 ? 's' : ''} removed`);
  if (modified.length) parts.push(`${modified.length} resource${modified.length > 1 ? 's' : ''} modified`);

  return `Infrastructure changed: ${parts.join(', ')}. ${unchanged.length} resources unchanged.`;
}

/**
 * Human-readable time delta
 */
function getTimeDelta(from, to) {
  const ms = new Date(to) - new Date(from);
  const minutes = Math.floor(ms / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h ago`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
  return `${minutes}m ago`;
}

module.exports = { diffSnapshots, getConfigChanges, assessRiskLevel };


/***/ }),

/***/ 55:
/***/ ((module) => {

/**
 * PipelineIQ — NIST 800-53 Control Mappings
 * Maps infrastructure resource types and configurations
 * to NIST 800-53 Rev 5 controls for automated compliance checking
 *
 * Controls reference: https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final
 */

const NIST_CONTROLS = {

  // ─── ACCESS CONTROL (AC) ────────────────────────────────────────────────────
  'AC-2': {
    id: 'AC-2',
    family: 'Access Control',
    name: 'Account Management',
    description: 'Manage information system accounts including creation, activation, modification, review, and removal.',
    checks: [
      {
        resource_types: ['aws_iam_user', 'aws_iam_role', 'azurerm_user_assigned_identity'],
        field: null,
        rule: 'exists',
        severity: 'medium',
        message: 'IAM accounts must be explicitly managed and documented.'
      }
    ]
  },

  'AC-3': {
    id: 'AC-3',
    family: 'Access Control',
    name: 'Access Enforcement',
    description: 'Enforce approved authorizations for logical access.',
    checks: [
      {
        resource_types: ['aws_iam_policy', 'aws_iam_role_policy'],
        field: 'policy',
        rule: 'no_wildcard_actions',
        severity: 'critical',
        message: 'IAM policies must not use wildcard (*) actions — violates least privilege.'
      },
      {
        resource_types: ['aws_s3_bucket_acl'],
        field: 'acl',
        rule: 'not_in',
        values: ['public-read', 'public-read-write', 'authenticated-read'],
        severity: 'critical',
        message: 'S3 bucket ACL must not allow public access.'
      }
    ]
  },

  'AC-17': {
    id: 'AC-17',
    family: 'Access Control',
    name: 'Remote Access',
    description: 'Establish and document usage restrictions for remote access.',
    checks: [
      {
        resource_types: ['aws_security_group', 'aws_security_group_rule'],
        field: 'ingress',
        rule: 'no_open_ssh',
        severity: 'critical',
        message: 'Security group must not allow SSH (port 22) from 0.0.0.0/0 — unrestricted remote access.'
      },
      {
        resource_types: ['aws_security_group', 'aws_security_group_rule'],
        field: 'ingress',
        rule: 'no_open_rdp',
        severity: 'critical',
        message: 'Security group must not allow RDP (port 3389) from 0.0.0.0/0.'
      }
    ]
  },

  // ─── AUDIT AND ACCOUNTABILITY (AU) ──────────────────────────────────────────
  'AU-2': {
    id: 'AU-2',
    family: 'Audit and Accountability',
    name: 'Audit Events',
    description: 'Identify the types of events that the system is capable of logging.',
    checks: [
      {
        resource_types: ['aws_cloudtrail'],
        field: null,
        rule: 'exists',
        severity: 'high',
        message: 'CloudTrail must be enabled — required for audit logging (AU-2).'
      },
      {
        resource_types: ['azurerm_monitor_diagnostic_setting'],
        field: null,
        rule: 'exists',
        severity: 'high',
        message: 'Azure Monitor diagnostic settings must be configured for audit logging.'
      }
    ]
  },

  'AU-9': {
    id: 'AU-9',
    family: 'Audit and Accountability',
    name: 'Protection of Audit Information',
    description: 'Protect audit information and tools from unauthorized access.',
    checks: [
      {
        resource_types: ['aws_cloudtrail'],
        field: 'enable_log_file_validation',
        rule: 'equals',
        value: 'true',
        severity: 'high',
        message: 'CloudTrail log file validation must be enabled to protect audit integrity.'
      },
      {
        resource_types: ['aws_s3_bucket'],
        field: 'versioning',
        rule: 'exists',
        severity: 'medium',
        message: 'S3 buckets storing logs should have versioning enabled.'
      }
    ]
  },

  // ─── CONFIGURATION MANAGEMENT (CM) ──────────────────────────────────────────
  'CM-2': {
    id: 'CM-2',
    family: 'Configuration Management',
    name: 'Baseline Configuration',
    description: 'Develop, document, and maintain a baseline configuration of the system.',
    checks: [
      {
        resource_types: ['aws_instance', 'azurerm_virtual_machine', 'google_compute_instance'],
        field: 'tags',
        rule: 'has_required_tags',
        required_tags: ['Environment', 'Owner', 'Project'],
        severity: 'medium',
        message: 'All compute instances must have Environment, Owner, and Project tags for baseline configuration management.'
      }
    ]
  },

  'CM-7': {
    id: 'CM-7',
    family: 'Configuration Management',
    name: 'Least Functionality',
    description: 'Configure the system to provide only essential capabilities.',
    checks: [
      {
        resource_types: ['aws_security_group'],
        field: 'ingress',
        rule: 'no_all_traffic',
        severity: 'high',
        message: 'Security groups must not allow all inbound traffic — violates least functionality.'
      }
    ]
  },

  // ─── IDENTIFICATION AND AUTHENTICATION (IA) ──────────────────────────────────
  'IA-5': {
    id: 'IA-5',
    family: 'Identification and Authentication',
    name: 'Authenticator Management',
    description: 'Manage information system authenticators.',
    checks: [
      {
        resource_types: ['aws_iam_user_login_profile'],
        field: 'password_reset_required',
        rule: 'equals',
        value: 'true',
        severity: 'medium',
        message: 'IAM users must require password reset on first login.'
      },
      {
        resource_types: ['aws_iam_account_password_policy'],
        field: 'minimum_password_length',
        rule: 'gte',
        value: 14,
        severity: 'high',
        message: 'Password policy minimum length must be at least 14 characters.'
      }
    ]
  },

  // ─── SYSTEM AND COMMUNICATIONS PROTECTION (SC) ───────────────────────────────
  'SC-8': {
    id: 'SC-8',
    family: 'System and Communications Protection',
    name: 'Transmission Confidentiality and Integrity',
    description: 'Implement cryptographic mechanisms to protect data in transit.',
    checks: [
      {
        resource_types: ['aws_lb_listener', 'aws_alb_listener'],
        field: 'protocol',
        rule: 'not_equals',
        value: 'HTTP',
        severity: 'high',
        message: 'Load balancer listeners must use HTTPS, not HTTP — data in transit must be encrypted.'
      },
      {
        resource_types: ['aws_db_instance', 'azurerm_postgresql_server'],
        field: 'storage_encrypted',
        rule: 'equals',
        value: 'true',
        severity: 'critical',
        message: 'Database instances must have storage encryption enabled.'
      }
    ]
  },

  'SC-28': {
    id: 'SC-28',
    family: 'System and Communications Protection',
    name: 'Protection of Information at Rest',
    description: 'Implement cryptographic mechanisms to prevent unauthorized disclosure of information at rest.',
    checks: [
      {
        resource_types: ['aws_s3_bucket'],
        field: 'server_side_encryption_configuration',
        rule: 'exists',
        severity: 'critical',
        message: 'S3 buckets must have server-side encryption enabled — data at rest must be protected.'
      },
      {
        resource_types: ['aws_ebs_volume'],
        field: 'encrypted',
        rule: 'equals',
        value: 'true',
        severity: 'critical',
        message: 'EBS volumes must be encrypted at rest.'
      },
      {
        resource_types: ['aws_rds_cluster', 'aws_db_instance'],
        field: 'storage_encrypted',
        rule: 'equals',
        value: 'true',
        severity: 'critical',
        message: 'RDS instances must have storage encryption enabled.'
      }
    ]
  },

  // ─── SYSTEM AND INFORMATION INTEGRITY (SI) ───────────────────────────────────
  'SI-2': {
    id: 'SI-2',
    family: 'System and Information Integrity',
    name: 'Flaw Remediation',
    description: 'Identify, report, and correct information system flaws.',
    checks: [
      {
        resource_types: ['aws_db_instance'],
        field: 'auto_minor_version_upgrade',
        rule: 'equals',
        value: 'true',
        severity: 'medium',
        message: 'RDS instances should have auto minor version upgrade enabled for flaw remediation.'
      }
    ]
  }
};

/**
 * Run all NIST checks against a list of resources
 * Returns array of violations
 */
function runNISTChecks(resources) {
  const violations = [];

  for (const resource of resources) {
    for (const [controlId, control] of Object.entries(NIST_CONTROLS)) {
      for (const check of control.checks) {
        if (!check.resource_types.includes(resource.type)) continue;

        const violation = evaluateCheck(resource, check, control);
        if (violation) violations.push(violation);
      }
    }
  }

  return violations;
}

/**
 * Evaluate a single check against a resource
 */
function evaluateCheck(resource, check, control) {
  const config = resource.config || {};
  let violated = false;

  switch (check.rule) {
    case 'exists':
      if (check.field) {
        violated = config[check.field] === undefined || config[check.field] === null;
      }
      break;

    case 'equals':
      if (check.field && config[check.field] !== undefined) {
        violated = String(config[check.field]) !== String(check.value);
      }
      break;

    case 'not_equals':
      if (check.field && config[check.field] !== undefined) {
        violated = String(config[check.field]) === String(check.value);
      }
      break;

    case 'not_in':
      if (check.field && config[check.field] !== undefined) {
        violated = check.values.includes(config[check.field]);
      }
      break;

    case 'gte':
      if (check.field && config[check.field] !== undefined) {
        violated = Number(config[check.field]) < check.value;
      }
      break;

    case 'no_wildcard_actions':
      // Check if policy contains wildcard actions
      if (config.policy) {
        violated = config.policy.includes('"Action": "*"') ||
                   config.policy.includes('"Action":"*"');
      }
      break;

    case 'has_required_tags':
      // Simplified — in real impl would parse tags block
      violated = false;
      break;

    default:
      violated = false;
  }

  if (!violated) return null;

  return {
    control_id: control.id,
    control_name: control.name,
    control_family: control.family,
    resource_id: resource.id,
    resource_type: resource.type,
    resource_name: resource.name,
    file: resource.file,
    line: resource.line,
    severity: check.severity,
    message: check.message,
    remediation: getRemediation(control.id, resource.type)
  };
}

/**
 * Get remediation guidance for a violation
 */
function getRemediation(controlId, resourceType) {
  const remediations = {
    'SC-28': {
      'aws_s3_bucket': 'Add server_side_encryption_configuration block with AES256 or aws:kms algorithm.',
      'aws_ebs_volume': 'Set encrypted = true in the aws_ebs_volume resource.',
      'aws_db_instance': 'Set storage_encrypted = true in the aws_db_instance resource.'
    },
    'SC-8': {
      'aws_lb_listener': 'Change protocol from HTTP to HTTPS and add certificate_arn.',
    },
    'AC-17': {
      'aws_security_group': 'Remove ingress rules allowing port 22 or 3389 from 0.0.0.0/0. Use AWS Systems Manager Session Manager instead.'
    }
  };

  return remediations[controlId]?.[resourceType] || 'Review the NIST 800-53 control and update resource configuration accordingly.';
}

/**
 * Calculate compliance score (0-100)
 */
function calculateComplianceScore(violations, totalResources) {
  if (totalResources === 0) return 100;

  const criticalWeight = 10;
  const highWeight = 5;
  const mediumWeight = 2;
  const lowWeight = 1;

  let penaltyPoints = 0;
  for (const v of violations) {
    switch (v.severity) {
      case 'critical': penaltyPoints += criticalWeight; break;
      case 'high':     penaltyPoints += highWeight; break;
      case 'medium':   penaltyPoints += mediumWeight; break;
      case 'low':      penaltyPoints += lowWeight; break;
    }
  }

  const baseline = Math.max(totalResources, 20);
  const maxPossiblePenalty = baseline * criticalWeight;
  const score = Math.max(0, Math.round(100 - (penaltyPoints / maxPossiblePenalty) * 100));
  return score;
}

module.exports = { NIST_CONTROLS, runNISTChecks, calculateComplianceScore };


/***/ }),

/***/ 863:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fs = __nccwpck_require__(896);
const path = __nccwpck_require__(928);

/**
 * PipelineIQ Scanner
 * Reads Terraform / ARM / Bicep / CDK files and extracts
 * a normalized resource inventory for diff + compliance analysis
 */

const SUPPORTED_EXTENSIONS = ['.tf', '.json', '.bicep', '.ts', '.yaml', '.yml'];

/**
 * Recursively find all IaC files in a directory
 */
function findIaCFiles(dirPath) {
  const results = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) return;
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      // Skip common non-IaC dirs
      if (entry.isDirectory()) {
        if (['.git', 'node_modules', '.terraform', '__pycache__'].includes(entry.name)) continue;
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_EXTENSIONS.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dirPath);
  return results;
}

/**
 * Parse a Terraform .tf file into a normalized resource map
 * Returns array of resource objects: { type, name, config, file, line }
 */
function parseTerraformFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const resources = [];
  const lines = content.split('\n');

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // Match: resource "aws_instance" "web" {
    const resourceMatch = line.match(/^resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/);
    if (resourceMatch) {
      const [, type, name] = resourceMatch;
      const startLine = i + 1;
      const block = extractBlock(lines, i);

      resources.push({
        type,
        name,
        id: `${type}.${name}`,
        config: block.content,
        file: filePath,
        line: startLine,
        provider: type.split('_')[0], // aws, azurerm, google, etc.
        raw: block.raw
      });

      i = block.endLine;
      continue;
    }

    // Match: data "aws_vpc" "main" {
    const dataMatch = line.match(/^data\s+"([^"]+)"\s+"([^"]+)"\s*\{/);
    if (dataMatch) {
      const [, type, name] = dataMatch;
      const block = extractBlock(lines, i);

      resources.push({
        type: `data.${type}`,
        name,
        id: `data.${type}.${name}`,
        config: block.content,
        file: filePath,
        line: i + 1,
        provider: type.split('_')[0],
        raw: block.raw,
        isData: true
      });

      i = block.endLine;
      continue;
    }

    i++;
  }

  return resources;
}

/**
 * Extract a {} block starting at lineIndex
 */
function extractBlock(lines, startIndex) {
  let depth = 0;
  let started = false;
  let content = {};
  let rawLines = [];
  let endLine = startIndex;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    rawLines.push(line);

    for (const char of line) {
      if (char === '{') { depth++; started = true; }
      if (char === '}') { depth--; }
    }

    if (started && depth === 0) {
      endLine = i + 1;
      break;
    }
  }

  // Simple key-value extraction from the block
  const blockText = rawLines.join('\n');
  const kvMatches = blockText.matchAll(/^\s{2,4}(\w+)\s*=\s*"?([^"\n{]+)"?\s*$/gm);
  for (const [, key, value] of kvMatches) {
    content[key] = value.trim();
  }

  return { content, raw: blockText, endLine };
}

/**
 * Detect which cloud providers are in use
 */
function detectProviders(resources) {
  const providers = new Set();
  for (const r of resources) {
    if (r.provider) providers.add(r.provider);
  }
  return [...providers];
}

/**
 * Build a normalized infrastructure state snapshot
 */
function buildStateSnapshot(iacPath) {
  const files = findIaCFiles(iacPath);
  const allResources = [];
  const errors = [];

  for (const file of files) {
    try {
      const ext = path.extname(file).toLowerCase();
      if (ext === '.tf') {
        const resources = parseTerraformFile(file);
        allResources.push(...resources);
      }
      // TODO: ARM, Bicep, CDK parsers in next sessions
    } catch (err) {
      errors.push({ file, error: err.message });
    }
  }

  return {
    timestamp: new Date().toISOString(),
    iac_path: iacPath,
    files_scanned: files.length,
    resource_count: allResources.length,
    providers: detectProviders(allResources),
    resources: allResources,
    errors,
    // Fingerprint for quick diff comparison
    fingerprint: generateFingerprint(allResources)
  };
}

/**
 * Generate a simple fingerprint for change detection
 */
function generateFingerprint(resources) {
  const ids = resources.map(r => `${r.id}:${JSON.stringify(r.config)}`).sort();
  // Simple hash — no external deps needed
  let hash = 0;
  const str = ids.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

module.exports = { buildStateSnapshot, findIaCFiles, parseTerraformFile };


/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ 928:
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
/**
 * DriftOps — Main Action Entry Point
 * Orchestrates: scan → diff → comply → AI report → gate → post comment
 */

const { buildStateSnapshot } = __nccwpck_require__(863);
const { diffSnapshots } = __nccwpck_require__(557);
const { runNISTChecks, calculateComplianceScore } = __nccwpck_require__(55);
const { generateComplianceReport, formatPRComment } = __nccwpck_require__(343);

// GitHub Actions core (injected at build time via @actions/core)
// For POC we use env vars directly
const getInput = (name) => process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || '';
const setOutput = (name, value) => { const fs = __nccwpck_require__(896); const envFile = process.env.GITHUB_OUTPUT; if (envFile) { fs.appendFileSync(envFile, `${name}=${value}\n`); } else { console.log(`${name}=${value}`); } };
const setFailed = (msg) => { console.error(`::error::${msg}`); process.exit(1); };
const info = (msg) => console.log(`ℹ️  ${msg}`);
const warning = (msg) => console.log(`⚠️  ${msg}`);
const error = (msg) => console.log(`❌ ${msg}`);

async function run() {
  try {
    info('DriftOps starting scan...');

    // ── 1. Read inputs ──────────────────────────────────────────────────────
    const iacPath         = getInput('iac_path') || './terraform';
    const complianceLevel = getInput('compliance_level') || 'nist-800-53';
    const enforce         = getInput('enforce') === 'true';
    const generateDiagram = getInput('generate_diagram') !== 'false';
    const postPRComment   = getInput('post_pr_comment') !== 'false';
    const severityThreshold = getInput('severity_threshold') || 'critical';
    const pipelineIQToken = process.env.DRIFTOPS_TOKEN;

    info(`Scanning: ${iacPath}`);
    info(`Compliance: ${complianceLevel}`);
    info(`Enforce mode: ${enforce}`);

    // ── 2. Scan current state ───────────────────────────────────────────────
    info('📸 Scanning infrastructure...');
    const currentSnapshot = buildStateSnapshot(iacPath);
    info(`Found ${currentSnapshot.resource_count} resources across ${currentSnapshot.files_scanned} files`);

    if (currentSnapshot.resource_count === 0) {
      warning(`No IaC resources found in ${iacPath}. Check your iac_path input.`);
    }

    // ── 3. Fetch previous snapshot ──────────────────────────────────────────
    let previousSnapshot = null;
    if (pipelineIQToken) {
      previousSnapshot = await fetchPreviousSnapshot(pipelineIQToken);
    } else {
      warning('No DRIFTOPS_TOKEN set — drift detection disabled for this run. Sign up free at driftops.dev');
    }

    // ── 4. Diff ─────────────────────────────────────────────────────────────
    info('🔄 Comparing to prior state...');
    const diff = diffSnapshots(previousSnapshot, currentSnapshot);
    info(diff.summary);

    // ── 5. NIST compliance checks ───────────────────────────────────────────
    info('🏛️  Running NIST 800-53 compliance checks...');
    const violations = runNISTChecks(currentSnapshot.resources);
    const complianceScore = calculateComplianceScore(violations, currentSnapshot.resource_count);

    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    info(`Compliance score: ${complianceScore}/100`);
    info(`Violations: ${violations.length} total (${criticalCount} critical, ${highCount} high)`);

    // ── 6. AI report ────────────────────────────────────────────────────────
    info('🧠 Generating AI compliance report...');
    const aiReport = await generateComplianceReport({
      snapshot: currentSnapshot,
      diff,
      violations,
      complianceScore
    });

    console.log('\n' + '─'.repeat(60))
    console.log('  AI COMPLIANCE REPORT')
    console.log('─'.repeat(60))
    console.log(aiReport.report)
    console.log('─'.repeat(60) + '\n')
    
    // ── 7. Determine if we should block ────────────────────────────────────
    const shouldBlock = enforce && criticalCount > 0;
    if (shouldBlock) {
      error(`Blocking deploy — ${criticalCount} critical NIST violations found.`);
    }

    // ── 8. Post PR comment ─────────────────────────────────────────────────
    if (postPRComment && process.env.GITHUB_TOKEN) {
      const comment = formatPRComment({
        report: aiReport,
        complianceScore,
        diff,
        violations,
        blocked: shouldBlock
      });
      await postGitHubComment(comment);
    }

    // ── 9. Save snapshot ────────────────────────────────────────────────────
    if (pipelineIQToken) {
      await saveSnapshot(pipelineIQToken, currentSnapshot);
    }

    // ── 10. Set outputs ─────────────────────────────────────────────────────
    setOutput('compliance_score', complianceScore);
    setOutput('violations_count', violations.length);
    setOutput('critical_count', criticalCount);
    setOutput('drift_detected', diff.drift_detected);

    // Print summary to console
    console.log('\n' + '═'.repeat(60));
    console.log('  DRIFTOPS SCAN COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Score:      ${complianceScore}/100`);
    console.log(`  Resources:  ${currentSnapshot.resource_count}`);
    console.log(`  Violations: ${violations.length} (${criticalCount} critical)`);
    console.log(`  Drift:      ${diff.drift_detected ? '⚠️  Detected' : '✅ None'}`);
    console.log(`  Status:     ${shouldBlock ? '🚫 BLOCKED' : '✅ Passed'}`);
    console.log('═'.repeat(60) + '\n');

    // ── 11. Fail if enforcing and critical violations exist ─────────────────
    if (shouldBlock) {
      setFailed(`DriftOps blocked this deploy — ${criticalCount} critical NIST 800-53 violations must be resolved.`);
    }

  } catch (err) {
    setFailed(`DriftOps error: ${err.message}\n${err.stack}`);
  }
}

/**
 * Fetch previous snapshot from DriftOps API
 */
async function fetchPreviousSnapshot(token) {
  try {
    const workerUrl = process.env.DRIFTOPS_WORKER_URL || 'https://driftops-dev-worker.workers.dev';
    const repo = process.env.GITHUB_REPOSITORY || 'unknown/unknown';

    const res = await fetch(`${workerUrl}/api/snapshots/latest?repo=${encodeURIComponent(repo)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status === 404) return null;
    if (!res.ok) return null;

    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Save current snapshot to DriftOps API
 */
async function saveSnapshot(token, snapshot) {
  try {
    const workerUrl = process.env.DRIFTOPS_WORKER_URL || 'https://driftops-dev-worker.workers.dev';
    const repo = process.env.GITHUB_REPOSITORY || 'unknown/unknown';
    const sha = process.env.GITHUB_SHA || 'unknown';

    await fetch(`${workerUrl}/api/snapshots`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ repo, sha, snapshot })
    });
  } catch (err) {
    warning(`Could not save snapshot: ${err.message}`);
  }
}

/**
 * Post comment to GitHub PR
 */
async function postGitHubComment(body) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '/').split('/');
    const prNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)/)?.[1];

    if (!prNumber) return;

    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ body })
    });

    info('PR comment posted successfully');
  } catch (err) {
    warning(`Could not post PR comment: ${err.message}`);
  }
}

run();

module.exports = __webpack_exports__;
/******/ })()
;