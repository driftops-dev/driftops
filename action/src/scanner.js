const fs = require('fs');
const path = require('path');

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
