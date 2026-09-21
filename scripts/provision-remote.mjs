import { createClient } from '@supabase/supabase-js';
import { buildProvisioningManifest } from './lib/provision-manifest.mjs';
import {
  validateTargetAndCredentials,
  runProvisioningEngine,
  executeWithClockSkewRetry,
} from './lib/provision-engine.mjs';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || process.env.DRY_RUN === '1';

  console.log('--- Starting Idempotent Production Remote Provisioning ---');

  const supabaseUrl = process.env.PROD_SUPABASE_URL || process.env.SUPABASE_URL;
  const secretKey =
    process.env.PROD_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;
  const publishableKey =
    process.env.PROD_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  const allowRemoteProvision = process.env.ALLOW_REMOTE_PROVISION;

  // Validate security and key constraints
  const config = validateTargetAndCredentials({
    supabaseUrl,
    secretKey,
    publishableKey,
    allowRemoteProvision,
    dryRun,
  });

  const url = new URL(config.supabaseUrl);
  console.log(`Connecting securely to remote Supabase: ${url.origin}...`);
  console.log(`Execution Mode: ${dryRun ? 'DRY-RUN (READ-ONLY)' : 'LIVE PROVISIONING'}`);

  const adminClient = createClient(config.supabaseUrl, config.secretKey, {
    auth: { persistSession: false },
  });

  const manifest = buildProvisioningManifest();

  // Run the provisioning engine
  await runProvisioningEngine({
    adminClient,
    manifest,
    dryRun,
    silent: false,
  });

  if (dryRun) {
    console.log('\n✔ Dry-run inspection complete. No remote data or storage assets were modified.');
    return;
  }

  // Live post-mutation verification using anonymous RLS
  if (config.publishableKey) {
    console.log('\n--- Verifying Public RLS Readability ---');
    const anonClient = createClient(config.supabaseUrl, config.publishableKey, {
      auth: { persistSession: false },
    });

    const [
      { data: pubProf, error: pErr },
      { data: pubProj, error: prErr },
      { data: pubCats, error: cErr },
      { data: pubSkills, error: sErr },
      { data: pubEdu, error: eErr },
      { data: pubSeo, error: seErr },
    ] = await Promise.all([
      executeWithClockSkewRetry(() => anonClient.from('profiles').select('*').eq('is_published', true)),
      executeWithClockSkewRetry(() => anonClient.from('projects').select('*').eq('state', 'live')),
      executeWithClockSkewRetry(() => anonClient.from('skill_categories').select('*').eq('is_published', true)),
      executeWithClockSkewRetry(() => anonClient.from('skills').select('*').eq('is_published', true)),
      executeWithClockSkewRetry(() => anonClient.from('education').select('*').eq('is_published', true)),
      executeWithClockSkewRetry(() => anonClient.from('seo_entries').select('*').eq('is_published', true)),
    ]);

    if (pErr) throw new Error(`Anonymous RLS verification failed on profiles: ${pErr.message}`);
    if (prErr) throw new Error(`Anonymous RLS verification failed on projects: ${prErr.message}`);
    if (cErr) throw new Error(`Anonymous RLS verification failed on skill_categories: ${cErr.message}`);
    if (sErr) throw new Error(`Anonymous RLS verification failed on skills: ${sErr.message}`);
    if (eErr) throw new Error(`Anonymous RLS verification failed on education: ${eErr.message}`);
    if (seErr) throw new Error(`Anonymous RLS verification failed on seo_entries: ${seErr.message}`);

    console.log(`  Profiles visible:          ${pubProf?.length ?? 0}`);
    console.log(`  Live projects visible:     ${pubProj?.length ?? 0}`);
    console.log(`  Skill categories visible:  ${pubCats?.length ?? 0}`);
    console.log(`  Published skills visible:  ${pubSkills?.length ?? 0}`);
    console.log(`  Published education:       ${pubEdu?.length ?? 0}`);
    console.log(`  Published SEO entries:     ${pubSeo?.length ?? 0}`);
    console.log('✔ Public RLS read access verified successfully.');
  }

  console.log('\n✔ Remote production provisioning complete and verified.');
}

main().catch((err) => {
  // Redact potential tokens from error messages
  const safeMessage = (err.message || String(err)).replace(
    /sb_(secret|publishable)_[a-zA-Z0-9_\-]+/g,
    'sb_$1_[REDACTED]'
  );
  console.error('\n✖ Remote Provisioning Failed:', safeMessage);
  process.exit(1);
});
