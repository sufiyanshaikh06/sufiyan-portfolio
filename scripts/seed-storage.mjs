import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export const DEFAULT_LOCAL_SUPABASE_URL = 'http://127.0.0.1:54321';
export const DEFAULT_LOCAL_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export function assertLocalHostname(targetUrl) {
  const parsed = new URL(targetUrl);
  if (parsed.hostname !== '127.0.0.1' && parsed.hostname !== 'localhost') {
    throw new Error(
      `Safety Guard: Refusing to seed storage fixtures against non-local host: ${parsed.hostname}. Storage seeding is strictly restricted to local environments (127.0.0.1 or localhost).`
    );
  }
  return parsed;
}

export async function seedStorage(
  targetUrl = process.env.TEST_SUPABASE_URL || DEFAULT_LOCAL_SUPABASE_URL,
  targetKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY || DEFAULT_LOCAL_SERVICE_ROLE_KEY
) {
  // Enforce local-only target URL BEFORE creating any client or initiating network requests
  assertLocalHostname(targetUrl);

  const serviceClient = createClient(targetUrl, targetKey, {
    auth: {
      storageKey: 'seed-storage-auth',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const files = [
    {
      bucket: 'public_assets',
      path: 'portraits/avatar.jpg',
      contentType: 'image/jpeg',
      file: 'fixtures/storage/portraits/avatar.jpg',
    },
    {
      bucket: 'public_assets',
      path: 'projects/integrum.jpg',
      contentType: 'image/jpeg',
      file: 'fixtures/storage/projects/integrum.jpg',
    },
    {
      bucket: 'public_assets',
      path: 'projects/iot-temp-monitor.jpg',
      contentType: 'image/jpeg',
      file: 'fixtures/storage/projects/iot-temp-monitor.jpg',
    },
    {
      bucket: 'resumes',
      path: 'docs/sufiyan_shaikh_resume.pdf',
      contentType: 'application/pdf',
      file: 'fixtures/storage/docs/sufiyan_shaikh_resume.pdf',
    },
  ];

  for (const item of files) {
    const fullPath = path.resolve(process.cwd(), item.file);
    const content = fs.readFileSync(fullPath);
    const { error } = await serviceClient.storage.from(item.bucket).upload(item.path, content, {
      contentType: item.contentType,
      upsert: true,
    });
    if (error) {
      throw new Error(`Failed to upload ${item.bucket}/${item.path}: ${error.message}`);
    }
  }
}

if (process.argv[1] && import.meta.url.includes(path.basename(process.argv[1]))) {
  seedStorage()
    .then(() => {
      console.log('Seeded storage fixtures successfully');
    })
    .catch((err) => {
      console.error(err.message || err);
      process.exit(1);
    });
}
