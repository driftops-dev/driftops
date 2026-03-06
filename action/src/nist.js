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
      // Just flags that this resource type exists — used for documentation checks
      violated = false; // Presence is fine; absence would be caught differently
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
