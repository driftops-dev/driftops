/**
 * DriftOps — Main Action Entry Point
 */
const { buildStateSnapshot } = require('./scanner');
const { diffSnapshots } = require('./differ');
const { runNISTChecks, calculateComplianceScore } = require('./nist');
const { generateComplianceReport, formatPRComment } = require('./ai');

const WORKER_URL = 'https://driftops-dev-worker.driftops.workers.dev';

const getInput = (name) => process.env[`INPUT_${name.toUpperCase().replace(/-/g, '_')}`] || '';
const setOutput = (name, value) => {
  const fs = require('fs');
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
};
const setFailed = (msg) => { console.error(`::error::${msg}`); process.exit(1); };
const info = (msg) => console.log(`ℹ️  ${msg}`);
const warning = (msg) => console.log(`⚠️  ${msg}`);
const error = (msg) => console.log(`❌ ${msg}`);

function getWorkerUrl() {
  return process.env.DRIFTOPS_WORKER_URL || WORKER_URL;
}

async function run() {
  try {
    info('DriftOps starting scan...');
    const iacPath         = getInput('iac_path') || './terraform';
    const complianceLevel = getInput('compliance_level') || 'nist-800-53';
    const enforce         = getInput('enforce') === 'true';
    const postPRComment   = getInput('post_pr_comment') !== 'false';
    const pipelineIQToken = process.env.DRIFTOPS_TOKEN;

    info(`Scanning: ${iacPath}`);
    info(`Compliance: ${complianceLevel}`);
    info(`Enforce mode: ${enforce}`);

    info('📸 Scanning infrastructure...');
    const currentSnapshot = buildStateSnapshot(iacPath);
    info(`Found ${currentSnapshot.resource_count} resources across ${currentSnapshot.files_scanned} files`);

    if (currentSnapshot.resource_count === 0) {
      warning(`No IaC resources found in ${iacPath}. Check your iac_path input.`);
    }

    let previousSnapshot = null;
    if (pipelineIQToken) {
      previousSnapshot = await fetchPreviousSnapshot(pipelineIQToken);
    } else {
      warning('No DRIFTOPS_TOKEN set — drift detection disabled. Sign up free at driftops.dev');
    }

    info('🔄 Comparing to prior state...');
    const prevData = previousSnapshot && previousSnapshot.snapshot
      ? previousSnapshot.snapshot
      : previousSnapshot;
    const diff = diffSnapshots(prevData, currentSnapshot);
    info(diff.summary);

    info('🏛️  Running NIST 800-53 compliance checks...');
    const violations = runNISTChecks(currentSnapshot.resources);
    const complianceScore = calculateComplianceScore(violations, currentSnapshot.resource_count);
    const criticalCount = violations.filter(v => v.severity === 'critical').length;
    const highCount = violations.filter(v => v.severity === 'high').length;

    info(`Compliance score: ${complianceScore}/100`);
    info(`Violations: ${violations.length} total (${criticalCount} critical, ${highCount} high)`);

    info('🧠 Generating AI compliance report...');
    const aiReport = await generateComplianceReport({ snapshot: currentSnapshot, diff, violations, complianceScore });

    console.log('\n' + '─'.repeat(60));
    console.log('  AI COMPLIANCE REPORT');
    console.log('─'.repeat(60));
    console.log(aiReport.report);
    console.log('─'.repeat(60) + '\n');

    // Save BEFORE any exit
    if (pipelineIQToken) {
      await saveSnapshot(pipelineIQToken, currentSnapshot);
      await saveScan(pipelineIQToken, { violations, complianceScore, diff });
    }

    const shouldBlock = enforce && criticalCount > 0;
    if (shouldBlock) {
      error(`Blocking deploy — ${criticalCount} critical NIST violations found.`);
    }

    if (postPRComment && process.env.GITHUB_TOKEN) {
      const comment = formatPRComment({ report: aiReport, complianceScore, diff, violations, blocked: shouldBlock });
      await postGitHubComment(comment);
    }

    setOutput('compliance_score', complianceScore);
    setOutput('violations_count', violations.length);
    setOutput('critical_count', criticalCount);
    setOutput('drift_detected', diff.drift_detected);

    console.log('\n' + '═'.repeat(60));
    console.log('  DRIFTOPS SCAN COMPLETE');
    console.log('═'.repeat(60));
    console.log(`  Score:      ${complianceScore}/100`);
    console.log(`  Resources:  ${currentSnapshot.resource_count}`);
    console.log(`  Violations: ${violations.length} (${criticalCount} critical)`);
    console.log(`  Drift:      ${diff.drift_detected ? '⚠️  Detected' : '✅ None'}`);
    console.log(`  Status:     ${shouldBlock ? '🚫 BLOCKED' : '✅ Passed'}`);
    console.log('═'.repeat(60) + '\n');

    if (shouldBlock) {
      setFailed(`DriftOps blocked this deploy — ${criticalCount} critical NIST 800-53 violations must be resolved.`);
    }

  } catch (err) {
    setFailed(`DriftOps error: ${err.message}\n${err.stack}`);
  }
}

async function fetchPreviousSnapshot(token) {
  try {
    const repo = process.env.GITHUB_REPOSITORY || 'unknown/unknown';
    const res = await fetch(`${getWorkerUrl()}/api/snapshots/latest?repo=${encodeURIComponent(repo)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function saveSnapshot(token, snapshot) {
  try {
    const repo = process.env.GITHUB_REPOSITORY || 'unknown/unknown';
    const sha = process.env.GITHUB_SHA || 'unknown';
    const res = await fetch(`${getWorkerUrl()}/api/snapshots`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, sha, snapshot })
    });
    info(`Snapshot saved: ${res.status}`);
  } catch (err) { warning(`Could not save snapshot: ${err.message}`); }
}

async function saveScan(token, { violations, complianceScore, diff }) {
  try {
    const repo = process.env.GITHUB_REPOSITORY || 'unknown/unknown';
    const sha = process.env.GITHUB_SHA || 'unknown';
    const res = await fetch(`${getWorkerUrl()}/api/scans`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo, sha, score: complianceScore, violations, diff })
    });
    info(`Scan saved: ${res.status}`);
  } catch (err) { warning(`Could not save scan: ${err.message}`); }
}

async function postGitHubComment(body) {
  try {
    const token = process.env.GITHUB_TOKEN;
    const [owner, repo] = (process.env.GITHUB_REPOSITORY || '/').split('/');
    const prNumber = process.env.GITHUB_REF?.match(/refs\/pull\/(\d+)/)?.[1];
    if (!prNumber) return;
    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ body })
    });
    info('PR comment posted successfully');
  } catch (err) { warning(`Could not post PR comment: ${err.message}`); }
}

run();
