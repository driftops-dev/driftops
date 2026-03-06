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
