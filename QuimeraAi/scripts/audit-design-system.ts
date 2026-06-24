import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

type FindingKind =
  | 'hex-color'
  | 'rgb-color'
  | 'inline-style'
  | 'arbitrary-shadow'
  | 'arbitrary-radius'
  | 'legacy-button'
  | 'legacy-card'
  | 'duplicate-component-name';

type FindingScope = 'default' | 'visual-locked' | 'shell' | 'ds-internal' | 'approved-legacy-wrapper';

interface Finding {
  kind: FindingKind;
  file: string;
  line: number;
  sample: string;
  scope?: FindingScope;
  baselineAllowed?: boolean;
}

const root = process.cwd();
const args = process.argv.slice(2);
const strict = args.includes('--strict');
const changedOnly = args.includes('--changed');
const visualLockedOnly = args.includes('--visual-locked') || args.includes('--editor-locked') || args.includes('--locked');
const shellOnly = args.includes('--shell');
const showBaseline = args.includes('--baseline') || args.includes('--show-baseline');

function readPathArgs() {
  const paths: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--path' || arg === '--paths') {
      const next = args[index + 1];
      if (next && !next.startsWith('--')) {
        paths.push(next);
        index += 1;
      }
      continue;
    }
    if (!arg.startsWith('--')) {
      paths.push(arg);
    }
  }
  return paths;
}

const scanRoots = [
  'components',
  'contexts',
  'hooks',
  'routes',
  'src',
  'utils',
].filter((dir) => existsSync(path.join(root, dir)));

const ignoredPathParts = new Set([
  'node_modules',
  'dist',
  'playwright-report',
  'test-results',
  'tests',
  'backups',
  '.git',
]);

const ignoredFiles = new Set([
  'scripts/audit-design-system.ts',
]);

const allowedFiles = new Set([
  'components/ui/EmptyState.tsx',
  'components/ui/alert.tsx',
  'components/ui/button.tsx',
  'components/ui/input.tsx',
  'components/ui/select.tsx',
  'components/ui/table.tsx',
  'components/ui/tabs.tsx',
  'components/ui/textarea.tsx',
  'components/ui/primitives/Button.tsx',
  'components/ui/primitives/Card.tsx',
  'components/ui/system/AppButton.tsx',
  'components/ui/system/AppCard.tsx',
  'components/ui/system/StatusBadge.tsx',
  'scripts/audit-design-system.ts',
  'src/styles/main.css',
  'src/styles/tokens.css',
  'src/styles/theme.css',
]);

const visualLockedPathInputs = [
  'components/ui/EditorControlPrimitives.tsx',
  'components/ui/EcommerceControls.tsx',
  'components/controls',
  'components/ui/ComponentTree.tsx',
  'components/ui/ColorControl.tsx',
  'components/dashboard/admin/LandingPageEditor.tsx',
  'components/dashboard/admin/LandingPageControls.tsx',
  'components/dashboard/BioPageBuilder.tsx',
  'components/dashboard/ecommerce/views/StorefrontEditorView.tsx',
  'components/dashboard/ai/AiAssistantDashboard.tsx',
];

const shellPathInputs = [
  'src/design-system/components/AppShell.tsx',
  'components/dashboard/Dashboard.tsx',
  'components/dashboard/DashboardHeader.tsx',
  'components/dashboard/DashboardSidebar.tsx',
  'components/dashboard/DashboardDraggableSection.tsx',
  'components/dashboard/settings/SettingsPage.tsx',
  'components/dashboard/settings/SettingsStatCard.tsx',
  'components/ui/sidebar.tsx',
  'components/ui/system/AppButton.tsx',
  'components/ui/system/AppCard.tsx',
  'components/ui/system/StatusBadge.tsx',
  'components/ui/AppSelect.tsx',
  'components/ui/DashboardSelect.tsx',
];

const sourceExtensions = new Set(['.ts', '.tsx', '.css']);

const patterns: Array<{ kind: FindingKind; regex: RegExp }> = [
  { kind: 'hex-color', regex: /#[0-9A-Fa-f]{3,8}\b/g },
  { kind: 'rgb-color', regex: /\brgba?\([^)]*\)/g },
  { kind: 'inline-style', regex: /style=\{\{/g },
  { kind: 'arbitrary-shadow', regex: /shadow-\[[^\]]+\]/g },
  { kind: 'arbitrary-radius', regex: /rounded-\[[^\]]+\]/g },
];

const legacyButtonRegex = /<button\b|className=["'`][^"'`]*(?:btn-|button-)/g;
const legacyCardRegex = /className=["'`][^"'`]*(?:card-|Card)|<Card\b|<MotionCard\b/g;

function toRelative(file: string) {
  return path.relative(root, file).replaceAll(path.sep, '/');
}

function normalizeInput(input: string) {
  return input.replaceAll(path.sep, '/').replace(/\/$/, '');
}

function relativeMatchesInput(relative: string, input: string) {
  const normalized = normalizeInput(input);
  return relative === normalized || relative.startsWith(`${normalized}/`);
}

function relativeMatchesAny(relative: string, inputs: string[]) {
  return inputs.some((input) => relativeMatchesInput(relative, input));
}

function scopeForRelative(relative: string): FindingScope {
  if (relative.startsWith('src/design-system/')) return 'ds-internal';
  if (allowedFiles.has(relative) || relative.startsWith('src/components/ui/')) return 'approved-legacy-wrapper';
  if (relativeMatchesAny(relative, visualLockedPathInputs)) return 'visual-locked';
  if (relativeMatchesAny(relative, shellPathInputs)) return 'shell';
  return 'default';
}

function isBaselineAllowed(scope: FindingScope) {
  return scope === 'visual-locked' || scope === 'approved-legacy-wrapper' || scope === 'ds-internal';
}

function shouldIgnore(file: string, includeBaselineScopes = false) {
  const relative = toRelative(file);
  if (ignoredFiles.has(relative)) return true;
  if (relative.split('/').some((part) => ignoredPathParts.has(part))) return true;
  if (includeBaselineScopes) return false;
  if (allowedFiles.has(relative)) return true;
  if (relative.startsWith('src/design-system/')) return true;
  if (relative.startsWith('src/components/ui/')) return true;
  return false;
}

function walk(dir: string, includeBaselineScopes = false): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    if (shouldIgnore(fullPath, includeBaselineScopes)) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath, includeBaselineScopes));
      continue;
    }

    if (stat.isFile() && sourceExtensions.has(path.extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

function resolvePathInput(input: string) {
  return path.isAbsolute(input) ? input : path.join(root, input);
}

function filesFromInputs(inputs: string[]) {
  const files: string[] = [];

  for (const input of inputs) {
    const fullPath = resolvePathInput(input);
    if (!existsSync(fullPath) || shouldIgnore(fullPath, true)) continue;

    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath, true));
      continue;
    }

    if (stat.isFile() && sourceExtensions.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }

  return [...new Set(files)];
}

function getChangedPathInputs() {
  try {
    const tracked = execFileSync('git', ['diff', '--name-only', '--diff-filter=ACMRTUXB', '--relative', '--', '.'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', '.'], {
      cwd: root,
      encoding: 'utf8',
    })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return [...tracked, ...untracked];
  } catch {
    return [];
  }
}

function lineNumberForIndex(content: string, index: number) {
  return content.slice(0, index).split('\n').length;
}

function addRegexFindings(findings: Finding[], file: string, content: string, kind: FindingKind, regex: RegExp) {
  const relative = toRelative(file);
  const scope = scopeForRelative(relative);

  regex.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content))) {
    if (
      (kind === 'arbitrary-radius' || kind === 'arbitrary-shadow') &&
      /var\(--(q-|radius|shadow)/.test(match[0])
    ) {
      continue;
    }

    findings.push({
      kind,
      file: relative,
      line: lineNumberForIndex(content, match.index),
      sample: match[0].slice(0, 120),
      scope,
      baselineAllowed: isBaselineAllowed(scope),
    });
  }
}

function scanFile(file: string): Finding[] {
  const content = readFileSync(file, 'utf8');
  const findings: Finding[] = [];

  for (const pattern of patterns) {
    addRegexFindings(findings, file, content, pattern.kind, pattern.regex);
  }

  addRegexFindings(findings, file, content, 'legacy-button', legacyButtonRegex);
  addRegexFindings(findings, file, content, 'legacy-card', legacyCardRegex);

  return findings;
}

function findDuplicateComponentNames(files: string[]): Finding[] {
  const componentNames = new Map<string, string[]>();

  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const regex = /(?:export\s+)?(?:const|function)\s+([A-Z][A-Za-z0-9]+)\b/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content))) {
      const name = match[1];
      const entries = componentNames.get(name) || [];
      entries.push(file);
      componentNames.set(name, entries);
    }
  }

  const findings: Finding[] = [];
  for (const [name, matches] of componentNames.entries()) {
    const uniqueFiles = [...new Set(matches.map(toRelative))];
    if (uniqueFiles.length <= 1) continue;
    if (!['Button', 'Card', 'Modal', 'Input', 'Select', 'Badge', 'EmptyState', 'Table'].includes(name)) continue;

    findings.push({
      kind: 'duplicate-component-name',
      file: uniqueFiles.join(', '),
      line: 1,
      sample: `${name} appears in ${uniqueFiles.length} files`,
      scope: uniqueFiles.some((file) => relativeMatchesAny(file, visualLockedPathInputs)) ? 'visual-locked' : 'default',
      baselineAllowed: uniqueFiles.some((file) => relativeMatchesAny(file, visualLockedPathInputs)),
    });
  }

  return findings;
}

function selectFiles(requestedPaths: string[]) {
  if (changedOnly) return filesFromInputs(getChangedPathInputs());
  if (requestedPaths.length > 0) return filesFromInputs(requestedPaths);
  if (visualLockedOnly) return filesFromInputs(visualLockedPathInputs);
  if (shellOnly) return filesFromInputs(shellPathInputs);
  return scanRoots.flatMap((dir) => walk(path.join(root, dir)));
}

const requestedPaths = readPathArgs();
const files = selectFiles(requestedPaths);
const findings = [...files.flatMap(scanFile), ...findDuplicateComponentNames(files)];

const grouped = findings.reduce<Record<FindingKind, Finding[]>>((acc, finding) => {
  acc[finding.kind] ||= [];
  acc[finding.kind].push(finding);
  return acc;
}, {} as Record<FindingKind, Finding[]>);

console.log('Quimera Design System Audit');
if (changedOnly) {
  console.log('Mode: changed files');
} else if (visualLockedOnly) {
  console.log('Mode: visual locked areas');
} else if (shellOnly) {
  console.log('Mode: shell scope');
} else if (requestedPaths.length > 0) {
  console.log(`Mode: paths (${requestedPaths.join(', ')})`);
}
console.log(`Scanned files: ${files.length}`);
console.log(`Findings: ${findings.length}`);
if (showBaseline || visualLockedOnly || shellOnly) {
  const scopeCounts = findings.reduce<Record<FindingScope, number>>((acc, finding) => {
    const scope = finding.scope || 'default';
    acc[scope] ||= 0;
    acc[scope] += 1;
    return acc;
  }, {} as Record<FindingScope, number>);
  const baselineAllowed = findings.filter((finding) => finding.baselineAllowed).length;
  const needsReview = findings.length - baselineAllowed;
  console.log(`Baseline-allowed findings: ${baselineAllowed}`);
  console.log(`Needs-review findings: ${needsReview}`);
  console.log(`Scopes: ${Object.entries(scopeCounts).map(([scope, count]) => `${scope}=${count}`).join(', ') || 'none'}`);
  if (visualLockedOnly) {
    console.log('Visual locked findings are approved baseline debt unless the touched line/file changes visual output.');
  }
}
console.log('');

for (const kind of Object.keys(grouped).sort() as FindingKind[]) {
  const items = grouped[kind];
  console.log(`${kind}: ${items.length}`);
  for (const item of items.slice(0, 12)) {
    console.log(`  - ${item.file}:${item.line} ${item.sample}`);
  }
  if (items.length > 12) {
    console.log(`  ... ${items.length - 12} more`);
  }
  console.log('');
}

if (strict && findings.length > 0) {
  process.exitCode = 1;
}
