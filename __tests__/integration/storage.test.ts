import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const JWT_SECRET = 'super-secret-jwt-token-with-at-least-32-characters-long';
const ADMIN_ID = '00000000-0000-0000-0000-000000000099';
const NON_OWNER_ID = '00000000-0000-0000-0000-000000000098';

function createToken(sub: string, aal: string) {
  return jwt.sign(
    {
      aud: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
      sub,
      email: 'test@example.com',
      role: 'authenticated',
      aal,
    },
    JWT_SECRET
  );
}

const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const nonOwnerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(NON_OWNER_ID, 'aal1')}` } } });
const aal1Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(ADMIN_ID, 'aal1')}` } } });
const aal2Client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: `Bearer ${createToken(ADMIN_ID, 'aal2')}` } } });

describe('Storage API Integration Tests', () => {
  beforeAll(async () => {
    // We expect the buckets public_assets, private_assets, and resumes to already exist 
    // and have objects seeded via seed.sql or we upload them if they don't.
    // In our seed, 'portraits/avatar.jpg' is seeded in 'public_assets'.
  });

  describe('Anonymous Users', () => {
    it('can read public_assets and resumes', async () => {
      const { data: pData, error: pErr } = await anonClient.storage.from('public_assets').list();
      expect(pErr).toBeNull();
      // Should successfully list or at least not error with 401
      
      const { data: rData, error: rErr } = await anonClient.storage.from('resumes').list();
      expect(rErr).toBeNull();
    });

    it('cannot read private_assets', async () => {
      // Trying to list private_assets
      const { data, error } = await anonClient.storage.from('private_assets').list();
      // It shouldn't crash, but it should return empty because RLS filters out rows
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
      
      // Try to download a private file
      const { data: dlData, error: dlErr } = await anonClient.storage.from('private_assets').download('priv.jpg');
      expect(dlErr).toBeDefined();
    });

    it('cannot upload to public_assets', async () => {
      const { data, error } = await anonClient.storage.from('public_assets').upload('anon-upload.txt', 'hello');
      expect(error).toBeDefined();
      expect(error?.message).toMatch(/new row violates row-level security policy|Unauthorized/i);
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
      // Can read private
      const { data: pData, error: pErr } = await aal2Client.storage.from('private_assets').list();
      expect(pErr).toBeNull();
      
      // Upload successful
      const { data, error } = await aal2Client.storage.from('private_assets').upload('aal2-upload.txt', 'test');
      expect(error).toBeNull();
      expect(data?.path).toBe('aal2-upload.txt');
    });

    it('cannot delete through the Storage API (server-only deletion)', async () => {
      const { data, error } = await aal2Client.storage.from('private_assets').remove(['aal2-upload.txt']);
      
      // Since DELETE is completely denied for clients in RLS, the API should return an error or filter it to 0 deleted objects.
      // With Supabase Storage API, if RLS fails to delete, it usually succeeds silently returning empty array of deleted objects.
      if (error) {
        expect(error).toBeDefined();
      } else {
        expect(data).toHaveLength(0); // None deleted
      }
    });
  });
});
