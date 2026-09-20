import fs from 'node:fs';
import path from 'node:path';

const FORBIDDEN_KEYS = new Set([
  'id',
  'project_id',
  'section_id',
  'category_id',
  'media_asset_id',
  'bucket_id',
  'bucketId',
  'storage_path',
  'storagePath',
  'service_role',
  'is_archived',
]);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Recursively scans object keys and values for leakages, UUID patterns, and forbidden tokens.
 */
export function scanPayloadForLeaks(payload, jsonString, sensitiveValues = []) {
  function traverse(node, currentPath = '') {
    if (!node || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      for (let i = 0; i < node.length; i++) {
        traverse(node[i], `${currentPath}[${i}]`);
      }
      return;
    }

    for (const key of Object.keys(node)) {
      const fieldPath = currentPath ? `${currentPath}.${key}` : key;

      if (FORBIDDEN_KEYS.has(key)) {
        throw new Error(`Forbidden key in snapshot detected at ${fieldPath}: "${key}"`);
      }

      const val = node[key];
      if (typeof val === 'string' && UUID_REGEX.test(val)) {
        throw new Error(`Forbidden UUID value in page DTO detected at ${fieldPath}: "${val}"`);
      }

      if (val && typeof val === 'object') {
        traverse(val, fieldPath);
      }
    }
  }

  // 1. Recursive key and value inspection
  traverse(payload);

  // 2. Sensitive values search in serialized JSON
  const filteredTokens = (sensitiveValues || []).filter(
    (v) => typeof v === 'string' && v.trim().length > 0
  );

  for (const token of filteredTokens) {
    if (jsonString.includes(token)) {
      throw new Error(`Configured sensitive token found in snapshot JSON output: "${token}"`);
    }
  }

  // 3. Canary string signatures
  const canarySignatures = [
    'sb_secret_',
    'SERVICE_ROLE',
    'bucket_id',
    'storage_path',
    'resumes',
    'private_assets',
    '/storage/v1/',
  ];

  for (const sig of canarySignatures) {
    if (jsonString.includes(sig)) {
      throw new Error(`Forbidden canary signature found in snapshot JSON: "${sig}"`);
    }
  }
}

/**
 * Promotes content-hashed media and JSON manifest atomically with rollback tracking.
 * @param {Object} options
 * @param {string} options.stagingMediaDir
 * @param {string} options.stagingManifestFile
 * @param {string} options.finalMediaDir
 * @param {string} options.finalManifestFile
 * @param {string[]} [options.referencedLocalPaths]
 */
export function promoteSnapshotAtomically({
  stagingMediaDir,
  stagingManifestFile,
  finalMediaDir,
  finalManifestFile,
  referencedLocalPaths = [],
}) {
  fs.mkdirSync(finalMediaDir, { recursive: true });
  fs.mkdirSync(path.dirname(finalManifestFile), { recursive: true });

  const copiedFiles = new Set();
  let tempManifestPath = null;

  try {
    // 1. Copy staged media to target (recording newly created targets for rollback)
    if (fs.existsSync(stagingMediaDir)) {
      const mediaFiles = fs.readdirSync(stagingMediaDir);
      for (const file of mediaFiles) {
        const sourcePath = path.join(stagingMediaDir, file);
        const targetPath = path.join(finalMediaDir, file);

        if (!fs.existsSync(targetPath)) {
          // Register in rollback set BEFORE copying begins
          copiedFiles.add(targetPath);
          fs.copyFileSync(sourcePath, targetPath);
        }
      }
    }

    // 2. Write temp sibling manifest in final directory
    const tempName = `public-snapshot.json.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    tempManifestPath = path.join(path.dirname(finalManifestFile), tempName);

    if (!fs.existsSync(stagingManifestFile)) {
      throw new Error(`Staged manifest file missing: ${stagingManifestFile}`);
    }

    fs.copyFileSync(stagingManifestFile, tempManifestPath);

    // 3. Atomic commit boundary (rename within same directory)
    fs.renameSync(tempManifestPath, finalManifestFile);
    tempManifestPath = null; // Successfully committed
  } catch (err) {
    // Pre-commit rollback: Remove ONLY newly created target media files
    for (const targetPath of copiedFiles) {
      try {
        if (fs.existsSync(targetPath)) {
          fs.unlinkSync(targetPath);
        }
      } catch {
        // Ignored in rollback
      }
    }

    if (tempManifestPath) {
      try {
        if (fs.existsSync(tempManifestPath)) {
          fs.unlinkSync(tempManifestPath);
        }
      } catch {
        // Ignored
      }
    }

    throw err;
  }

  // 4. Post-commit best-effort cleanup of stale media
  try {
    const allowedBasenames = new Set(
      referencedLocalPaths.map((p) => path.basename(p))
    );

    const onDiskMedia = fs.readdirSync(finalMediaDir);
    for (const file of onDiskMedia) {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.png', '.webp', '.svg'].includes(ext)) {
        if (!allowedBasenames.has(file)) {
          fs.unlinkSync(path.join(finalMediaDir, file));
        }
      }
    }
  } catch (cleanupErr) {
    console.warn(
      `Warning: Post-commit stale media cleanup encountered non-fatal error: ${cleanupErr.message}`
    );
  }
}
