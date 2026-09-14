import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.TEST_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.TEST_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JWT_SECRET = process.env.TEST_SUPABASE_JWT_SECRET || process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

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

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const nonOwnerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${createToken(NON_OWNER_ID, 'aal1')}` } },
});
const aal1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${createToken(TEST_ADMIN_ID, 'aal1')}` } },
});
const aal2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${createToken(TEST_ADMIN_ID, 'aal2')}` } },
});

describe('Storage API Integration Tests', () => {
  beforeAll(async () => {
    // Upload fixtures via service role; fail immediately on any error
    const pubRes = await serviceClient.storage.from('public_assets').upload('fixture-pub.txt', 'public-fixture-data', { upsert: true });
    if (pubRes.error) throw new Error(`Failed to upload public fixture: ${pubRes.error.message}`);

    const resRes = await serviceClient.storage.from('resumes').upload('fixture-res.txt', 'resume-fixture-data', { upsert: true });
    if (resRes.error) throw new Error(`Failed to upload resume fixture: ${resRes.error.message}`);

    const privRes = await serviceClient.storage.from('private_assets').upload('fixture-priv.txt', 'private-fixture-data', { upsert: true });
    if (privRes.error) throw new Error(`Failed to upload private fixture: ${privRes.error.message}`);
  });

  afterAll(async () => {
    // Clean up every fixture created during testing
    await serviceClient.storage.from('public_assets').remove(['fixture-pub.txt']);
    await serviceClient.storage.from('resumes').remove(['fixture-res.txt']);
    await serviceClient.storage.from('private_assets').remove(['fixture-priv.txt', 'aal2-upload.txt']);
  });

  describe('Anonymous Users', () => {
    it('can read exactly the public and résumé fixtures', async () => {
      const { data: pData, error: pErr } = await anonClient.storage.from('public_assets').download('fixture-pub.txt');
      expect(pErr).toBeNull();
      expect(pData).toBeDefined();
      expect(await pData!.text()).toBe('public-fixture-data');

      const { data: rData, error: rErr } = await anonClient.storage.from('resumes').download('fixture-res.txt');
      expect(rErr).toBeNull();
      expect(rData).toBeDefined();
      expect(await rData!.text()).toBe('resume-fixture-data');
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
    it('can perform intended upload and read private_assets', async () => {
      const { data: pData, error: pErr } = await aal2Client.storage.from('private_assets').download('fixture-priv.txt');
      expect(pErr).toBeNull();
      expect(pData).toBeDefined();
      expect(await pData!.text()).toBe('private-fixture-data');

      const { data, error } = await aal2Client.storage.from('private_assets').upload('aal2-upload.txt', 'aal2-data', { upsert: true });
      expect(error).toBeNull();
      expect(data?.path).toBe('aal2-upload.txt');
    });

    it('cannot delete through the Storage API (server-only deletion)', async () => {
      // Attempt AAL2 client deletion of existing private fixture
      await aal2Client.storage.from('private_assets').remove(['fixture-priv.txt']);

      // Verify the file still exists in storage via service role
      const { data: dlData, error: dlErr } = await serviceClient.storage.from('private_assets').download('fixture-priv.txt');
      expect(dlErr).toBeNull();
      expect(dlData).toBeDefined();
      expect(await dlData!.text()).toBe('private-fixture-data');
    });
  });
});
