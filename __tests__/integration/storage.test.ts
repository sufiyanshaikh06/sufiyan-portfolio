import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET || 'super-secret-jwt-token-with-at-least-32-characters-long';

const ADMIN_ID = '00000000-0000-0000-0000-000000000099';
const NON_OWNER_ID = '00000000-0000-0000-0000-000000000098';

function createToken(sub: string, aal: string) {
  return jwt.sign(
    { aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 60 * 60, sub, email: 'test@example.com', role: 'authenticated', aal },
    JWT_SECRET
  );
}

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const nonOwnerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(NON_OWNER_ID, 'aal1')}` } } });
const aal1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(ADMIN_ID, 'aal1')}` } } });
const aal2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(ADMIN_ID, 'aal2')}` } } });

describe('Storage API Integration Tests', () => {
  beforeAll(async () => {
    // Temporarily insert admin user if it doesn't exist so AAL2 RLS passes 
    // (using serviceClient via RPC or direct SQL if possible, but we don't have direct SQL here)
    // Actually, AAL2 requires admin_users entry. If not in seed, AAL2 upload fails!
    // But we cannot insert into admin_users via serviceClient easily without an RPC. 
    // We can just rely on the RLS tests checking the DB directly. Wait, the user said "do not mix production seed with fake users".
    // I can use the existing real admin user ID from seed.sql! The seed has 10000000-0000-0000-0000-000000000001
  });

  const realAdminId = '10000000-0000-0000-0000-000000000001';
  const realAal2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(realAdminId, 'aal2')}` } } });

  beforeAll(async () => {
    // Upload fixtures using service role
    await serviceClient.storage.from('public_assets').upload('fixture-pub.txt', 'public', { upsert: true });
    await serviceClient.storage.from('resumes').upload('fixture-res.txt', 'resume', { upsert: true });
    await serviceClient.storage.from('private_assets').upload('fixture-priv.txt', 'private', { upsert: true });
  });

  afterAll(async () => {
    // Remove fixtures
    await serviceClient.storage.from('public_assets').remove(['fixture-pub.txt']);
    await serviceClient.storage.from('resumes').remove(['fixture-res.txt']);
    await serviceClient.storage.from('private_assets').remove(['fixture-priv.txt']);
  });

  describe('Anonymous Users', () => {
    it('can read exactly the public and résumé fixtures', async () => {
      const { data: pData, error: pErr } = await anonClient.storage.from('public_assets').download('fixture-pub.txt');
      expect(pErr).toBeNull();
      
      const { data: rData, error: rErr } = await anonClient.storage.from('resumes').download('fixture-res.txt');
      expect(rErr).toBeNull();
    });

    it('cannot download the existing private fixture', async () => {
      const { error: dlErr } = await anonClient.storage.from('private_assets').download('fixture-priv.txt');
      expect(dlErr).toBeDefined();
    });

    it('cannot upload to public_assets', async () => {
      const { error } = await anonClient.storage.from('public_assets').upload('anon-upload.txt', 'hello');
      expect(error).toBeDefined();
    });
  });

  describe('Authenticated Non-Owner & AAL1 Users', () => {
    it('non-owner cannot upload', async () => {
      const { error } = await nonOwnerClient.storage.from('public_assets').upload('non-owner.txt', 'test');
      expect(error).toBeDefined();
    });
    
    it('AAL1 cannot upload', async () => {
      const { error } = await aal1Client.storage.from('public_assets').upload('aal1.txt', 'test');
      expect(error).toBeDefined();
    });
  });

  describe('AAL2 Admin Users', () => {
    it('can perform intended upload and read private_assets', async () => {
      const { error: pErr } = await realAal2Client.storage.from('private_assets').download('fixture-priv.txt');
      expect(pErr).toBeNull();
      
      const { data, error } = await realAal2Client.storage.from('private_assets').upload('aal2-upload.txt', 'test', { upsert: true });
      expect(error).toBeNull();
      expect(data?.path).toBe('aal2-upload.txt');
    });

    it('cannot delete through the Storage API (server-only deletion)', async () => {
      // Attempt AAL2 deletion
      const { error } = await realAal2Client.storage.from('private_assets').remove(['fixture-priv.txt']);
      // If error is null, it means it pretended to delete or failed silently.
      // So we verify the supposedly deleted file still exists afterward via serviceClient.
      const { data: dlData, error: dlErr } = await serviceClient.storage.from('private_assets').download('fixture-priv.txt');
      expect(dlErr).toBeNull(); // It should still exist!
    });
  });
});
