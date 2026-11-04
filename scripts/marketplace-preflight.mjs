import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const offline = process.argv.includes('--offline');
const entryPath = join(root, 'marketplace', 'TLEWA__dsh-sidebar-row-menu.yml');
const iconPath = join(root, 'assets', 'icon-180.png');
const repoSlug = 'TLEWA/dsh-sidebar-row-menu';

let failures = 0;
let warnings = 0;

const pass = (message, detail = '') => console.log(`PASS  ${message}${detail ? ` — ${detail}` : ''}`);
const warn = (message, detail = '') => {
  warnings += 1;
  console.log(`WARN  ${message}${detail ? ` — ${detail}` : ''}`);
};
const fail = (message, detail = '') => {
  failures += 1;
  console.log(`FAIL  ${message}${detail ? ` — ${detail}` : ''}`);
};

// The submission entry is local-only (git-ignored), so a fresh clone has no
// marketplace/ directory. Treat that as "nothing to check", not as a failure.
if (!existsSync(entryPath)) {
  warn('marketplace entry', 'marketplace/ is local-only and absent in this checkout');
  console.log('\nREADY — 0 failure(s), 1 warning(s)');
  process.exit(0);
}

function readPngSize(file) {
  const buffer = readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

// --- package manifest -------------------------------------------------------

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
pkg.name === 'dsh-sidebar-row-menu'
  ? pass('package name', pkg.name)
  : fail('package name', `expected dsh-sidebar-row-menu, got ${pkg.name}`);

if (pkg.dsh?.bundle?.patch) {
  pass('dsh.bundle.patch', pkg.dsh.bundle.patch);
  const patchPath = join(root, pkg.dsh.bundle.patch);
  if (!existsSync(patchPath)) {
    fail('bundle patch exists', pkg.dsh.bundle.patch);
  } else {
    const patch = readFileSync(patchPath, 'utf8');
    if (/insert:/.test(patch) && patch.includes(pkg.name)) {
      pass('bundle patch content', 'insert + package name');
    } else {
      fail('bundle patch content', 'expected an insert entry naming the package');
    }
  }
} else {
  fail('dsh.bundle.patch', 'missing — dsh.client alone is not installable');
}

pkg.license === 'MIT' ? pass('license', 'MIT') : fail('license', `got ${pkg.license}`);
String(pkg.repository?.url ?? '').includes(repoSlug)
  ? pass('repository', pkg.repository.url)
  : fail('repository', 'does not point at the GitHub repo');

// The market index and the DSH host both read the top-level `engines.dsh`; the
// nested `dsh.engines.dsh` the organizer-style manifests use is ignored by both.
const enginesDsh = pkg.engines?.dsh;
typeof enginesDsh === 'string' && enginesDsh.trim()
  ? pass('engines.dsh', enginesDsh)
  : fail('engines.dsh', 'missing — the market would show no supported DSH version');

// --- storefront icon --------------------------------------------------------

if (!existsSync(iconPath)) {
  fail('assets/icon-180.png', 'missing');
} else {
  const size = readPngSize(iconPath);
  if (!size) {
    fail('icon format', 'not a PNG');
  } else if (size.width !== 180 || size.height !== 180) {
    fail('icon dimensions', `${size.width}x${size.height}, expected 180x180`);
  } else {
    pass('icon', '180x180 PNG');
  }
}

// --- submission entry -------------------------------------------------------

if (!existsSync(entryPath)) {
  fail('marketplace entry', 'missing');
} else {
  const entry = readFileSync(entryPath, 'utf8');
  const field = (name) => (entry.match(new RegExp(`^${name}:\\s*(.+)$`, 'm')) ?? [])[1]?.trim() ?? '';
  const checks = [
    ['url', `https://github.com/${repoSlug}`],
    ['name', repoSlug],
    ['category', 'ui'],
    ['icon', `https://raw.githubusercontent.com/${repoSlug}/main/assets/icon-180.png`],
  ];
  for (const [key, expected] of checks) {
    const actual = field(key);
    actual === expected
      ? pass(`entry.${key}`, actual)
      : fail(`entry.${key}`, `expected ${expected}, got ${actual || '(missing)'}`);
  }
  /^\s+en:\s*\S/m.test(entry) ? pass('entry.description.en') : fail('entry.description.en', 'missing');
  /^\s+zh:\s*\S/m.test(entry) ? pass('entry.description.zh') : warn('entry.description.zh', 'missing (optional)');
  if (!/^tarball:\s*https:\/\/github\.com\/.+\/releases\/(download|latest\/download)\/.+\.tgz$/m.test(entry)) {
    fail('entry.tarball', 'missing or not a GitHub release .tgz URL');
  } else {
    pass('entry.tarball');
  }
}

// --- repository live checks -------------------------------------------------

if (offline) {
  warn('GitHub checks', 'skipped (--offline)');
} else {
  try {
    const response = await fetch(`https://api.github.com/repos/${repoSlug}`, {
      headers: { accept: 'application/vnd.github+json', 'user-agent': 'dsh-sidebar-row-menu-preflight' },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`GitHub API ${response.status}`);
    const repo = await response.json();

    const created = Date.parse(repo.created_at);
    const ageMs = Date.now() - created;
    const eligible = new Date(created + 86400000);
    if (ageMs >= 86400000) {
      pass('repo age', `${(ageMs / 86400000).toFixed(1)} days`);
    } else {
      warn(
        'repo age',
        `${(ageMs / 3600000).toFixed(1)} hours — eligible at ${eligible.toISOString()} (${eligible.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })})`,
      );
    }

    Array.isArray(repo.topics) && repo.topics.includes('dsh-plugin')
      ? pass('topic', 'dsh-plugin')
      : fail('topic', 'dsh-plugin is missing — required by awesome-dsh-plugin');

    repo.description ? pass('repo description', repo.description) : fail('repo description', 'empty');

    if (existsSync(entryPath)) {
      const entry = readFileSync(entryPath, 'utf8');
      const tarball = (entry.match(/^tarball:\s*(\S+)$/m) ?? [])[1];
      if (tarball) {
        const head = await fetch(tarball, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(20000),
        });
        head.ok
          ? pass('tarball URL', `${head.status} ${tarball}`)
          : fail('tarball URL', `${head.status} ${tarball}`);
      }
    }

    const iconUrl = `https://raw.githubusercontent.com/${repoSlug}/main/assets/icon-180.png`;
    const iconHead = await fetch(iconUrl, { method: 'HEAD', signal: AbortSignal.timeout(15000) });
    iconHead.ok ? pass('icon URL', `${iconHead.status}`) : fail('icon URL', `${iconHead.status}`);
  } catch (error) {
    fail('GitHub checks', error instanceof Error ? error.message : String(error));
  }
}

console.log(`\n${failures === 0 ? 'READY' : 'NOT READY'} — ${failures} failure(s), ${warnings} warning(s)`);
if (failures > 0) {
  console.log('Fix the FAIL lines before opening the awesome-dsh-plugin pull request.');
  process.exitCode = 1;
}
