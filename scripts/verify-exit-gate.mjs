import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const TEST_PORT = 3001;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`[EXEC] ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...options,
    });

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Command "${command} ${args.join(' ')}" exited with code ${code}`));
      } else {
        resolve();
      }
    });
  });
}

async function waitForServerReady(url, maxWaitMs = 20000) {
  const start = Date.now();
  let delay = 200;

  while (Date.now() - start < maxWaitMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
      if (res.status === 200) {
        return;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay * 1.5, 1000);
  }

  throw new Error(`Timeout waiting for production server at ${url} to respond.`);
}

async function scanDirectoryForCanaries(dirPath, forbiddenStrings) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'cache') continue;
      await scanDirectoryForCanaries(fullPath, forbiddenStrings);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.html') || entry.name.endsWith('.json'))) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const str of forbiddenStrings) {
        if (str && content.includes(str)) {
          throw new Error(`Canary Leak Detected in ${fullPath}: contains forbidden string "${str}"`);
        }
      }
    }
  }
}

async function main() {
  console.log('===========================================================');
  console.log('--- Phase 4C Exit Gate Verification ---');
  console.log('===========================================================');

  // 1. Verify build exists
  const nextDir = path.join(rootDir, '.next');
  if (!fs.existsSync(nextDir)) {
    throw new Error('Production build (.next) does not exist. Run "npm run build:next" before running verify:gate.');
  }

  // 2. Safety Guard for stopping local Supabase
  const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
  const urlObj = new URL(supabaseUrl);
  const isLocal = urlObj.hostname === '127.0.0.1' || urlObj.hostname === 'localhost';

  if (!isLocal) {
    throw new Error(`Safety Guard: Refusing to stop Supabase because host is non-local (${urlObj.hostname}).`);
  }

  const allowStop = process.env.EXIT_GATE_ALLOW_LOCAL_STOP === '1' || process.argv.includes('--allow-stop');
  let supabaseWasStopped = false;

  if (allowStop) {
    console.log('Stopping local Supabase to prove zero database dependency...');
    try {
      await runCommand(npxCommand, ['supabase', 'stop']);
      supabaseWasStopped = true;
      console.log('Local Supabase stopped successfully.');
    } catch (err) {
      console.warn('Warning: Could not stop local Supabase (it may already be stopped):', err.message);
    }
  } else {
    console.log('EXIT_GATE_ALLOW_LOCAL_STOP is not 1; skipping local Supabase shutdown.');
  }

  // 3. Start Next.js production server via Node entrypoint
  const nextBinPath = path.resolve(rootDir, 'node_modules', 'next', 'dist', 'bin', 'next');
  if (!fs.existsSync(nextBinPath)) {
    throw new Error(`Next.js binary not found at ${nextBinPath}`);
  }

  console.log(`Starting Next.js production server on port ${TEST_PORT}...`);
  let serverProcess = null;
  let serverPrematureExit = null;
  let exitGateError = null;

  try {
    serverProcess = spawn(process.execPath, [nextBinPath, 'start', '-p', String(TEST_PORT)], {
      cwd: rootDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(TEST_PORT), NODE_ENV: 'production' },
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (process.env.DEBUG_GATE) console.log(`[NEXT STDOUT] ${msg.trim()}`);
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      // Next.js emits "Internal: NoFallbackError" to stderr when serving a
      // statically-generated 404 page for an unknown route. This is expected
      // behaviour during the unknown-slug probe and must not be surfaced as a
      // gate failure or confuse process supervisors.
      if (msg.includes('NoFallbackError')) return;
      console.error(`[NEXT STDERR] ${msg}`);
    });

    serverProcess.on('exit', (code) => {
      if (code !== null && code !== 0) {
        serverPrematureExit = new Error(`Next.js server exited prematurely with code ${code}`);
      }
    });

    // Wait for server readiness
    await waitForServerReady(BASE_URL);
    if (serverPrematureExit) throw serverPrematureExit;
    console.log('Next.js production server is ready at', BASE_URL);

    // 4. Raw HTTP Probes
    console.log('\n--- Running HTTP Probes ---');

    // Homepage Probe
    const homeRes = await fetch(`${BASE_URL}/`);
    console.log(`Probe GET / -> HTTP ${homeRes.status}`);
    if (homeRes.status !== 200) throw new Error(`Expected HTTP 200 for /, got ${homeRes.status}`);

    const homeHtml = await homeRes.text();
    if (!homeHtml.includes('SUFIYAN SHAIKH')) {
      throw new Error('Initial HTML for / missing "SUFIYAN SHAIKH" before hydration.');
    }
    if (!homeHtml.includes('Computer Science Student')) {
      throw new Error('Initial HTML for / missing verified headline before hydration.');
    }
    if (!homeHtml.includes('Integrum')) {
      throw new Error('Initial HTML for / missing featured project "Integrum".');
    }

    // Integrum Case Study Probe
    const integrumRes = await fetch(`${BASE_URL}/projects/integrum`);
    console.log(`Probe GET /projects/integrum -> HTTP ${integrumRes.status}`);
    if (integrumRes.status !== 200) throw new Error(`Expected HTTP 200 for /projects/integrum, got ${integrumRes.status}`);

    const integrumHtml = await integrumRes.text();
    if (!integrumHtml.includes('Integrum')) {
      throw new Error('Initial HTML for /projects/integrum missing "Integrum".');
    }
    if (!integrumHtml.includes('Overview')) {
      throw new Error('Initial HTML for /projects/integrum missing "Overview" section.');
    }

    // Dynamic Project Slug Probes
    const snapshotPath = path.resolve(rootDir, 'lib/generated/public-snapshot.json');
    const snapshotJson = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const isIotInSnapshot = (snapshotJson.projects || []).some((p) => p.slug === 'iot-temp-monitor');

    const iotRes = await fetch(`${BASE_URL}/projects/iot-temp-monitor`);
    const expectedIotStatus = isIotInSnapshot ? 200 : 404;
    console.log(`Probe GET /projects/iot-temp-monitor -> HTTP ${iotRes.status} (Expected ${expectedIotStatus})`);
    if (iotRes.status !== expectedIotStatus) {
      throw new Error(`Expected HTTP ${expectedIotStatus} for /projects/iot-temp-monitor, got ${iotRes.status}`);
    }
    if (isIotInSnapshot) {
      const iotHtml = await iotRes.text();
      if (!iotHtml.includes('IoT Body Temperature Monitoring System')) {
        throw new Error('Initial HTML for /projects/iot-temp-monitor missing project title.');
      }
    }

    // Unknown Slug Probe (Must 404)
    const unknownRes = await fetch(`${BASE_URL}/projects/unknown-slug-xyz`);
    console.log(`Probe GET /projects/unknown-slug-xyz -> HTTP ${unknownRes.status} (Expected 404)`);
    if (unknownRes.status !== 404) throw new Error(`Expected HTTP 404 for unknown slug, got ${unknownRes.status}`);

    // Phase 4B Static Route Probes
    console.log('\n--- Phase 4B: New Static Route Probes ---');

    const aboutRes = await fetch(`${BASE_URL}/about`);
    console.log(`Probe GET /about -> HTTP ${aboutRes.status}`);
    if (aboutRes.status !== 200) throw new Error(`Expected HTTP 200 for /about, got ${aboutRes.status}`);
    const aboutHtml = await aboutRes.text();
    if (!aboutHtml.includes('Sufiyan Shaikh')) {
      throw new Error('/about HTML missing profile full name.');
    }
    const isEduInSnapshot = (snapshotJson.education || []).length > 0;
    if (isEduInSnapshot && !aboutHtml.includes('R.K. Talreja College')) {
      throw new Error('/about HTML missing verified education institution.');
    }

    const projectsListRes = await fetch(`${BASE_URL}/projects`);
    console.log(`Probe GET /projects -> HTTP ${projectsListRes.status}`);
    if (projectsListRes.status !== 200) throw new Error(`Expected HTTP 200 for /projects, got ${projectsListRes.status}`);
    const projectsHtml = await projectsListRes.text();
    if (!projectsHtml.includes('Integrum')) {
      throw new Error('/projects HTML missing at least one project title.');
    }

    const skillsRes = await fetch(`${BASE_URL}/skills`);
    console.log(`Probe GET /skills -> HTTP ${skillsRes.status}`);
    if (skillsRes.status !== 200) throw new Error(`Expected HTTP 200 for /skills, got ${skillsRes.status}`);
    const isSkillsInSnapshot = (snapshotJson.skillCategories || []).length > 0;
    const skillsHtml = await skillsRes.text();
    if (isSkillsInSnapshot && !skillsHtml.includes('TypeScript')) {
      throw new Error('/skills HTML missing verified skills.');
    }

    const experienceRes = await fetch(`${BASE_URL}/experience`);
    console.log(`Probe GET /experience -> HTTP ${experienceRes.status}`);
    if (experienceRes.status !== 200) throw new Error(`Expected HTTP 200 for /experience, got ${experienceRes.status}`);

    // Image Caching Probe
    const imgMatch = homeHtml.match(/\/generated\/snapshot\/[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+/);
    if (imgMatch) {
      const imgPath = imgMatch[0];
      const imgRes = await fetch(`${BASE_URL}${imgPath}`);
      console.log(`Probe GET ${imgPath} -> HTTP ${imgRes.status}`);
      if (imgRes.status !== 200) throw new Error(`Image ${imgPath} failed to load: HTTP ${imgRes.status}`);

      const cacheControl = imgRes.headers.get('cache-control');
      console.log(`Cache-Control header: ${cacheControl}`);
      if (!cacheControl || !cacheControl.includes('immutable')) {
        throw new Error(`Expected immutable Cache-Control for ${imgPath}, got: ${cacheControl}`);
      }
    }

    // 5. Canary Scanner
    console.log('\n--- Running Canary Scanner on Emitted Assets ---');
    const forbidden = [
      process.env.SUPABASE_PUBLISHABLE_KEY,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      'sb_secret_',
      'SERVICE_ROLE_KEY',
      'three.module.js',
      '@react-three',
      'gsap.min.js',
    ].filter(Boolean);

    await scanDirectoryForCanaries(path.join(rootDir, '.next', 'static'), forbidden);
    console.log('Canary scan passed cleanly: Zero forbidden strings found in client assets.');

    // 6. Playwright E2E Execution
    console.log('\n--- Running Playwright E2E Suite Against Disconnected Server ---');
    await runCommand(npxCommand, ['playwright', 'test'], {
      env: { ...process.env, BASE_URL },
    });
    console.log('Playwright E2E suite passed completely.');

    console.log('\n===========================================================');
    console.log('✔ Phase 4C Exit Gate Verification PASSED Successfully!');
    console.log('===========================================================');
  } catch (err) {
    console.error('\n✖ Phase 4C Exit Gate Verification FAILED:', err);
    exitGateError = err;
  } finally {
    // Clean up server process
    if (serverProcess) {
      console.log('Terminating Next.js test server...');
      serverProcess.kill('SIGTERM');
      // Wait a moment and force kill if still alive
      await new Promise((r) => setTimeout(r, 500));
      try {
        serverProcess.kill('SIGKILL');
      } catch {
        // Ignored
      }
    }

    // Restart local Supabase if it was stopped during test
    if (supabaseWasStopped) {
      console.log('Restoring local Supabase service...');
      try {
        await runCommand(npxCommand, ['supabase', 'start']);
        console.log('Local Supabase restored.');
      } catch (restartErr) {
        console.error('Failed to restart local Supabase after test:', restartErr);
      }
    }

    if (exitGateError) {
      throw exitGateError;
    }
  }
}

main().catch((err) => {
  console.error('Fatal exit gate failure:', err);
  process.exit(1);
});
