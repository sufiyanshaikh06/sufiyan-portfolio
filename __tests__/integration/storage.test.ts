import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import sharp from 'sharp';
import { seedStorage, assertLocalHostname } from '../../scripts/seed-storage.mjs';

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JWT_SECRET = process.env.TEST_SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

// Safety Guard: Refuse to execute destructive integration tests against non-local environments
const url = new URL(SUPABASE_URL);
if (url.hostname !== '127.0.0.1' && url.hostname !== 'localhost') {
  throw new Error(`Safety Guard: Refusing to run storage integration tests against non-local host: ${url.hostname}`);
}

// Test admin user seeded in seed.sql
const TEST_ADMIN_ID = '00000000-0000-0000-0000-000000000001';
const NON_OWNER_ID = '00000000-0000-0000-0000-000000000098';

function createToken(sub: string, aal: string) {
  return jwt.sign(
    { 
      aud: 'authenticated', 
      exp: Math.floor(Date.now() / 1000) + 3600, 
      sub, 
      email: 'test@example.com', 
      role: 'authenticated', 
      aal 
    },
    JWT_SECRET
  );
}

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    storageKey: 'service-client-auth',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'anon-client-auth',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const nonOwnerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'non-owner-client-auth',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { headers: { Authorization: `Bearer ${createToken(NON_OWNER_ID, 'aal1')}` } },
});

const aal1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'aal1-client-auth',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { headers: { Authorization: `Bearer ${createToken(TEST_ADMIN_ID, 'aal1')}` } },
});

const aal2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'aal2-client-auth',
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { headers: { Authorization: `Bearer ${createToken(TEST_ADMIN_ID, 'aal2')}` } },
});

describe('Storage Seeder Safety Guards', () => {
  it('rejects remote URLs before creating clients or executing uploads', async () => {
    await expect(seedStorage('https://xyz.supabase.co', 'test-key'))
      .rejects.toThrow('Safety Guard: Refusing to seed storage fixtures against non-local host: xyz.supabase.co');

    await expect(seedStorage('http://192.168.1.100:54321', 'test-key'))
      .rejects.toThrow('Safety Guard: Refusing to seed storage fixtures against non-local host: 192.168.1.100');
  });

  it('permits localhost and 127.0.0.1 hostnames', () => {
    expect(() => assertLocalHostname('http://127.0.0.1:54321')).not.toThrow();
    expect(() => assertLocalHostname('http://localhost:54321')).not.toThrow();
  });
});

describe('Storage API Integration Tests', () => {
  beforeAll(async () => {
    // Seed physical files from fixtures into storage buckets
    await seedStorage();

    // Upload test fixtures via service role; fail immediately on any error
    const pubRes = await serviceClient.storage.from('public_assets').upload('fixture-pub.txt', 'public-fixture-data', { upsert: true });
    if (pubRes.error) throw new Error(`Failed to upload public fixture: ${pubRes.error.message}`);

    const resRes = await serviceClient.storage.from('resumes').upload('fixture-res.txt', 'resume-fixture-data', { upsert: true });
    if (resRes.error) throw new Error(`Failed to upload resume fixture: ${resRes.error.message}`);

    const privRes = await serviceClient.storage.from('private_assets').upload('fixture-priv.txt', 'private-fixture-data', { upsert: true });
    if (privRes.error) throw new Error(`Failed to upload private fixture: ${privRes.error.message}`);
  });

  afterAll(async () => {
    // Clean up test-specific fixtures created during testing
    await serviceClient.storage.from('public_assets').remove(['fixture-pub.txt', 'aal2-pub.txt']);
    await serviceClient.storage.from('resumes').remove(['fixture-res.txt']);
    await serviceClient.storage.from('private_assets').remove(['fixture-priv.txt', 'aal2-upload.txt']);
  });

  describe('Anonymous Users', () => {
    it('can read exactly public assets fixture', async () => {
      const { data: pData, error: pErr } = await anonClient.storage.from('public_assets').download('fixture-pub.txt');
      expect(pErr).toBeNull();
      expect(pData).toBeDefined();
      expect(await pData!.text()).toBe('public-fixture-data');
    });

    it('cannot directly download résumé from private bucket', async () => {
      const { data: rData, error: rErr } = await anonClient.storage.from('resumes').download('fixture-res.txt');
      expect(rErr).toBeDefined();
      expect(rData).toBeNull();
    });

    it('cannot download the existing private fixture', async () => {
      const { data: privData, error: dlErr } = await anonClient.storage.from('private_assets').download('fixture-priv.txt');
      expect(dlErr).toBeDefined();
      expect(privData).toBeNull();
    });

    it('cannot upload to public_assets', async () => {
      const { error } = await anonClient.storage.from('public_assets').upload('anon-upload.txt', 'hello');
      expect(error).toBeDefined();
    });
  });

  describe('Authenticated Non-Owner & AAL1 Users', () => {
    it('non-owner cannot upload to public_assets', async () => {
      const { error } = await nonOwnerClient.storage.from('public_assets').upload('non-owner.txt', 'test');
      expect(error).toBeDefined();
    });

    it('AAL1 cannot upload to public_assets', async () => {
      const { error } = await aal1Client.storage.from('public_assets').upload('aal1.txt', 'test');
      expect(error).toBeDefined();
    });
  });

  describe('AAL2 Admin Users', () => {
    it('can preview candidate résumé from private resumes bucket', async () => {
      const { data: rData, error: rErr } = await aal2Client.storage.from('resumes').download('fixture-res.txt');
      expect(rErr).toBeNull();
      expect(rData).toBeDefined();
      expect(await rData!.text()).toBe('resume-fixture-data');
    });

    it('can upload a new file to private staging bucket (private_assets)', async () => {
      const { data: pData, error: pErr } = await aal2Client.storage.from('private_assets').download('fixture-priv.txt');
      expect(pErr).toBeNull();
      expect(pData).toBeDefined();
      expect(await pData!.text()).toBe('private-fixture-data');

      const { data, error } = await aal2Client.storage.from('private_assets').upload('aal2-upload.txt', 'aal2-data');
      expect(error).toBeNull();
      expect(data?.path).toBe('aal2-upload.txt');
    });

    it('cannot upload directly to public_assets (promotion happens via server publishing)', async () => {
      const { error } = await aal2Client.storage.from('public_assets').upload('aal2-pub.txt', 'malicious-data');
      expect(error).toBeDefined();
    });

    it('cannot update or overwrite existing files in storage (server-only mutation)', async () => {
      const { error: updateErr } = await aal2Client.storage.from('private_assets').update('fixture-priv.txt', 'hacked-content');
      expect(updateErr).toBeDefined();

      const { error: upsertErr } = await aal2Client.storage.from('private_assets').upload('fixture-priv.txt', 'overwrite-attempt', { upsert: true });
      expect(upsertErr).toBeDefined();
    });

    it('cannot delete through the Storage API (server-only deletion)', async () => {
      await aal2Client.storage.from('private_assets').remove(['fixture-priv.txt']);

      const { data: dlData, error: dlErr } = await serviceClient.storage.from('private_assets').download('fixture-priv.txt');
      expect(dlErr).toBeNull();
      expect(dlData).toBeDefined();
      expect(await dlData!.text()).toBe('private-fixture-data');
    });
  });

  describe('Service Role & Database Integration', () => {
    it('can retrieve active résumé for static build', async () => {
      const { data: rData, error: rErr } = await serviceClient.storage.from('resumes').download('fixture-res.txt');
      expect(rErr).toBeNull();
      expect(rData).toBeDefined();
      expect(await rData!.text()).toBe('resume-fixture-data');
    });

    it('resolves active resume version to media asset and downloads valid PDF starting with %PDF- and ending with %%EOF', async () => {
      const { data: resumeVersion, error: resumeErr } = await serviceClient
        .from('resume_versions')
        .select('*, media_assets(*)')
        .eq('is_active', true)
        .eq('is_archived', false)
        .single();

      expect(resumeErr).toBeNull();
      expect(resumeVersion).toBeDefined();
      expect(resumeVersion?.media_assets).toBeDefined();
      expect(resumeVersion?.version_label).toBe('Development Fixture Resume');

      const asset = resumeVersion!.media_assets;
      const { data: fileBlob, error: downloadErr } = await serviceClient
        .storage
        .from(asset.bucket_id)
        .download(asset.storage_path);

      expect(downloadErr).toBeNull();
      expect(fileBlob).toBeDefined();

      const buffer = Buffer.from(await fileBlob!.arrayBuffer());
      const text = buffer.toString('utf8');
      expect(text.startsWith('%PDF-')).toBe(true);
      expect(text.trim().endsWith('%%EOF')).toBe(true);
      expect(text).toContain('Development Fixture Resume');
    });

    it('ensures all non-archived seeded media assets exist and strictly match database metadata', async () => {
      const { data: assets, error } = await serviceClient
        .from('media_assets')
        .select('*')
        .eq('is_archived', false);

      expect(error).toBeNull();
      expect(assets).toBeDefined();
      expect(assets!.length).toBeGreaterThan(0);

      for (const asset of assets!) {
        const { data: blob, error: dlErr } = await serviceClient
          .storage
          .from(asset.bucket_id)
          .download(asset.storage_path);

        expect(dlErr).toBeNull();
        expect(blob).toBeDefined();

        const buffer = Buffer.from(await blob!.arrayBuffer());

        // 1. Stored size equals media_assets.file_size
        expect(buffer.length).toBe(asset.file_size);

        // 2. MIME type matches file_type
        expect(blob!.type).toBe(asset.file_type);

        if (asset.file_type === 'image/jpeg') {
          // 3. Every image has JPEG end marker
          expect(buffer.slice(-2).toString('hex')).toBe('ffd9');

          // 4. Decoded width and height equal database values
          const metadata = await sharp(buffer).metadata();
          expect(metadata.format).toBe('jpeg');
          expect(metadata.width).toBe(asset.width);
          expect(metadata.height).toBe(asset.height);

          // 5. Every image can actually be decoded into raw pixels
          const raw = await sharp(buffer).raw().toBuffer({ resolveWithObject: true });
          expect(raw.data.length).toBe(asset.width! * asset.height! * 3);
        } else if (asset.file_type === 'application/pdf') {
          // 6. PDF has both %PDF- header and %%EOF terminator
          const text = buffer.toString('utf8');
          expect(text.startsWith('%PDF-')).toBe(true);
          expect(text.trim().endsWith('%%EOF')).toBe(true);
        }
      }
    });
  });
});
