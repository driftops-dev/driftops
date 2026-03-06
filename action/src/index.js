/**
 * DriftOps — Main Action Entry Point
 * Orchestrates: scan → diff → comply → AI report → gate → post comment
 */

const { buildStateSnapshot } = require('./scanner');
const { diffSnapshots } = require('./differ');
const { runNISTChecks, calculateComplianceScore } = require('./nist');
const { generateComplianceReport, formatPRComment } = require('./ai');

// GitHub Actions core (injected at build time via @actions/core)
// For POC we use env vars directly
const getInput = (name) => process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || '';
const setOutput = (name, value) => console.log(`::set-output name=${name}::${value}`);
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
