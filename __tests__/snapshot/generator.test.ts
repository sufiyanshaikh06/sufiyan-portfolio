import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  scanPayloadForLeaks,
  promoteSnapshotAtomically,
} from '../../scripts/lib/snapshot-pipeline.mjs';

describe('Snapshot Pipeline Atomic Promotion & Leak Detection', () => {
  let tempTestDir: string;
  let targetMediaDir: string;
  let targetManifestDir: string;
  let stagingMediaDir: string;
  let stagingManifestFile: string;

  beforeEach(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pipe-test-'));
    targetMediaDir = path.join(tempTestDir, 'public', 'generated', 'snapshot');
    targetManifestDir = path.join(tempTestDir, 'lib', 'generated');
    stagingMediaDir = path.join(tempTestDir, 'staging-media');
    const stagingManifestDir = path.join(tempTestDir, 'staging-manifest');

    fs.mkdirSync(targetMediaDir, { recursive: true });
    fs.mkdirSync(targetManifestDir, { recursive: true });
    fs.mkdirSync(stagingMediaDir, { recursive: true });
    fs.mkdirSync(stagingManifestDir, { recursive: true });

    stagingManifestFile = path.join(stagingManifestDir, 'public-snapshot.json');
  });

  afterEach(() => {
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  describe('scanPayloadForLeaks', () => {
    const validPayload = {
      profile: {
        fullName: 'Sufiyan Shaikh',
        headline: 'Student',
        avatar: {
          localPath: '/generated/snapshot/avatar-0d3348f370413ed8.jpg',
        },
      },
      projects: [
        {
          slug: 'integrum',
          title: 'Integrum',
          sections: [
            {
              title: 'Overview',
              media: [
                {
                  localPath: '/generated/snapshot/ui-0d3348f370413ed8.jpg',
                },
              ],
            },
          ],
        },
      ],
    };

    it('passes compliant payload with no sensitive keys or values', () => {
      expect(() =>
        scanPayloadForLeaks(validPayload, JSON.stringify(validPayload), ['secret-token-123'])
      ).not.toThrow();
    });

    it('rejects forbidden internal database keys (e.g. id, bucket_id, storage_path)', () => {
      const leakyPayload = {
        ...validPayload,
        profile: {
          ...validPayload.profile,
          bucket_id: 'public_assets',
        },
      };

      expect(() =>
        scanPayloadForLeaks(leakyPayload, JSON.stringify(leakyPayload), [])
      ).toThrow(/Forbidden key in snapshot/);
    });

    it('rejects UUID-shaped values in presentation DTOs', () => {
      const leakyPayload = {
        ...validPayload,
        projects: [
          {
            ...validPayload.projects[0],
            leaked_id: '10000000-0000-0000-0000-000000000050',
          },
        ],
      };

      expect(() =>
        scanPayloadForLeaks(leakyPayload, JSON.stringify(leakyPayload), [])
      ).toThrow(/Forbidden UUID value in page DTO/);
    });

    it('rejects configured sensitive tokens or secret keys in serialized JSON', () => {
      const token = 'sb_secret_very_sensitive_key_value';
      const json = JSON.stringify({ ...validPayload, text: `leaked: ${token}` });

      expect(() => scanPayloadForLeaks(validPayload, json, [token])).toThrow(
        /Configured sensitive token found in snapshot/
      );
    });
  });

  describe('promoteSnapshotAtomically Failure Injection & Rollback', () => {
    it('promotes media and manifest atomically while preserving existing media', () => {
      // Pre-existing media file
      const existingMedia = path.join(targetMediaDir, 'existing-0d3348f370413ed8.jpg');
      fs.writeFileSync(existingMedia, 'existing-media-content');

      // Staged media file
      const newMedia = path.join(stagingMediaDir, 'new_asset-a1b2c3d4e5f60718.jpg');
      fs.writeFileSync(newMedia, 'new-media-content');

      // Staged manifest referencing both
      const manifestJson = JSON.stringify({
        mediaPaths: [
          '/generated/snapshot/existing-0d3348f370413ed8.jpg',
          '/generated/snapshot/new_asset-a1b2c3d4e5f60718.jpg',
        ],
      });
      fs.writeFileSync(stagingManifestFile, manifestJson);

      const finalManifestFile = path.join(targetManifestDir, 'public-snapshot.json');

      promoteSnapshotAtomically({
        stagingMediaDir,
        stagingManifestFile,
        finalMediaDir: targetMediaDir,
        finalManifestFile,
        referencedLocalPaths: [
          '/generated/snapshot/existing-0d3348f370413ed8.jpg',
          '/generated/snapshot/new_asset-a1b2c3d4e5f60718.jpg',
        ],
      });

      // Both media exist
      expect(fs.existsSync(existingMedia)).toBe(true);
      expect(fs.existsSync(path.join(targetMediaDir, 'new_asset-a1b2c3d4e5f60718.jpg'))).toBe(true);

      // Manifest committed
      expect(fs.existsSync(finalManifestFile)).toBe(true);
      expect(fs.readFileSync(finalManifestFile, 'utf8')).toBe(manifestJson);
    });

    it('rolls back newly copied files on pre-commit manifest error and preserves existing media', () => {
      // Pre-existing media
      const existingMedia = path.join(targetMediaDir, 'existing-0d3348f370413ed8.jpg');
      fs.writeFileSync(existingMedia, 'existing-media-content');

      // Staged media
      const newMedia = path.join(stagingMediaDir, 'new_asset-a1b2c3d4e5f60718.jpg');
      fs.writeFileSync(newMedia, 'new-media-content');

      // Staged manifest does not exist -> triggers manifest promotion failure!
      const nonExistentStagingManifest = path.join(tempTestDir, 'nonexistent-manifest.json');
      const finalManifestFile = path.join(targetManifestDir, 'public-snapshot.json');

      expect(() =>
        promoteSnapshotAtomically({
          stagingMediaDir,
          stagingManifestFile: nonExistentStagingManifest,
          finalMediaDir: targetMediaDir,
          finalManifestFile,
          referencedLocalPaths: [],
        })
      ).toThrow();

      // Pre-existing media is still preserved
      expect(fs.existsSync(existingMedia)).toBe(true);

      // Newly copied media was rolled back and deleted from targetMediaDir
      expect(fs.existsSync(path.join(targetMediaDir, 'new_asset-a1b2c3d4e5f60718.jpg'))).toBe(false);
    });

    it('cleans up stale unreferenced media post-commit without failing the build', () => {
      // Stale media file in target
      const staleMedia = path.join(targetMediaDir, 'stale_old-0d3348f370413ed8.jpg');
      fs.writeFileSync(staleMedia, 'stale-content');

      // Staged media
      const activeMedia = path.join(stagingMediaDir, 'active-a1b2c3d4e5f60718.jpg');
      fs.writeFileSync(activeMedia, 'active-content');

      const manifestJson = JSON.stringify({ active: true });
      fs.writeFileSync(stagingManifestFile, manifestJson);
      const finalManifestFile = path.join(targetManifestDir, 'public-snapshot.json');

      promoteSnapshotAtomically({
        stagingMediaDir,
        stagingManifestFile,
        finalMediaDir: targetMediaDir,
        finalManifestFile,
        referencedLocalPaths: ['/generated/snapshot/active-a1b2c3d4e5f60718.jpg'],
      });

      // Active media exists
      expect(fs.existsSync(path.join(targetMediaDir, 'active-a1b2c3d4e5f60718.jpg'))).toBe(true);
      // Stale media was cleaned up
      expect(fs.existsSync(staleMedia)).toBe(false);
      // Manifest exists
      expect(fs.existsSync(finalManifestFile)).toBe(true);
    });
  });
});
