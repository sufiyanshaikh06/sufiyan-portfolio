import { describe, it, expect, vi } from 'vitest';
import {
  validateTargetAndCredentials,
  compareRecords,
  computeDifferential,
  runProvisioningEngine,
  executeWithClockSkewRetry,
  isClockSkewError,
} from '../../scripts/lib/provision-engine.mjs';
import { buildProvisioningManifest, FIXED_IDS } from '../../scripts/lib/provision-manifest.mjs';

describe('Provisioning Engine Safety Guards & Credentials', () => {
  const validUrl = 'https://zxauhsigpwresusmvkbu.supabase.co';
  const validSecret = 'sb_secret_mock_key';
  const validPublishable = 'sb_publishable_mock_key';

  it('rejects localhost and 127.0.0.1 targets', () => {
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: 'http://localhost:54321',
        secretKey: validSecret,
        publishableKey: validPublishable,
        dryRun: true,
      })
    ).toThrow(/Safety Guard: Refusing to run remote provisioning against local target/i);

    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: 'http://127.0.0.1:54321',
        secretKey: validSecret,
        publishableKey: validPublishable,
        dryRun: true,
      })
    ).toThrow(/Safety Guard: Refusing to run remote provisioning against local target/i);
  });

  it('rejects live execution when ALLOW_REMOTE_PROVISION is not 1', () => {
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: validSecret,
        publishableKey: validPublishable,
        allowRemoteProvision: '0',
        dryRun: false,
      })
    ).toThrow(/ALLOW_REMOTE_PROVISION=1 must be explicitly set/i);
  });

  it('permits dry-run without ALLOW_REMOTE_PROVISION=1', () => {
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: validSecret,
        publishableKey: validPublishable,
        allowRemoteProvision: undefined,
        dryRun: true,
      })
    ).not.toThrow();
  });

  it('permits dry-run without publishableKey', () => {
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: validSecret,
        allowRemoteProvision: undefined,
        dryRun: true,
      })
    ).not.toThrow();
  });

  it('rejects live execution when publishableKey is missing', () => {
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: validSecret,
        allowRemoteProvision: '1',
        dryRun: false,
      })
    ).toThrow(/Publishable key \("sb_publishable_\.\.\."\) is required for live post-provisioning verification/i);
  });

  it('rejects legacy JWT keys and requires modern prefixes', () => {
    // Secret key legacy JWT check
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.sig',
        publishableKey: validPublishable,
        dryRun: true,
      })
    ).toThrow(/Legacy JWT keys are not supported.*sb_secret_/i);

    // Secret key missing sb_secret_ prefix
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: 'not_a_secret_key',
        publishableKey: validPublishable,
        dryRun: true,
      })
    ).toThrow(/Secret key must start with "sb_secret_"/i);

    // Publishable key legacy JWT check
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: validSecret,
        publishableKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.sig',
        dryRun: true,
      })
    ).toThrow(/Legacy JWT keys are not supported.*sb_publishable_/i);

    // Publishable key missing sb_publishable_ prefix
    expect(() =>
      validateTargetAndCredentials({
        supabaseUrl: validUrl,
        secretKey: validSecret,
        publishableKey: 'not_a_publishable_key',
        dryRun: true,
      })
    ).toThrow(/Publishable key must start with "sb_publishable_"/i);
  });

  it('redacts credentials in error messages if passed invalid values', () => {
    const sensitiveValue = 'sb_secret_sample_leak';
    try {
      validateTargetAndCredentials({
        supabaseUrl: 'http://localhost:54321',
        secretKey: sensitiveValue,
        publishableKey: validPublishable,
        dryRun: true,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        expect(err.message).not.toContain('sample_leak');
      } else {
        throw err;
      }
    }
  });
});

describe('Differential Comparison Engine', () => {
  it('ignores server-controlled columns (created_at, updated_at)', () => {
    const manifestRow = {
      id: FIXED_IDS.PROFILE,
      full_name: 'Sufiyan Shaikh',
      headline: 'Student',
      email: null,
    };

    const remoteRow = {
      id: FIXED_IDS.PROFILE,
      full_name: 'Sufiyan Shaikh',
      headline: 'Student',
      email: null,
      created_at: '2026-08-29T00:00:00Z',
      updated_at: '2026-09-15T12:00:00Z',
    };

    const managedColumns = ['id', 'full_name', 'headline', 'email'];
    expect(compareRecords(manifestRow, remoteRow, managedColumns)).toBe(true);
  });

  it('canonicalizes arrays and nullable fields', () => {
    const manifestRow = {
      technologies: ['React', 'TypeScript', 'Node.js'],
      subtitle: null,
    };

    const remoteRow = {
      technologies: ['TypeScript', 'Node.js', 'React'], // Same set, different order
      subtitle: undefined, // undefined vs null
    };

    const managedColumns = ['technologies', 'subtitle'];
    expect(compareRecords(manifestRow, remoteRow, managedColumns)).toBe(true);
  });

  it('detects genuine field differences', () => {
    const manifestRow = {
      id: FIXED_IDS.PROJECT_IOT,
      title: 'IoT Body Temperature Monitoring System',
      tier: 'featured',
    };

    const remoteRow = {
      id: FIXED_IDS.PROJECT_IOT,
      title: 'IoT Old Title',
      tier: 'featured',
    };

    const managedColumns = ['id', 'title', 'tier'];
    expect(compareRecords(manifestRow, remoteRow, managedColumns)).toBe(false);
  });

  it('computes differential inserting new records and preserving unchanged records', () => {
    const manifest = buildProvisioningManifest();
    const mockRemote = {
      mediaAssets: [manifest.mediaAssets[0]], // avatar exists
      profiles: [manifest.profile], // profile exists unchanged
      projects: [],
      projectSections: [],
      projectSectionMedia: [],
      skillCategories: [],
      skills: [],
      education: [],
      seoEntries: [],
    };

    const actions = computeDifferential(manifest, mockRemote);
    const profileAction = actions.find((a) => a.entity === 'profiles');
    expect(profileAction?.action).toBe('UNCHANGED');

    const projectActions = actions.filter((a) => a.entity === 'projects');
    expect(projectActions).toHaveLength(2);
    expect(projectActions.every((p) => p.action === 'INSERT')).toBe(true);
  });
});

describe('Dry-Run Read-Only Guarantee', () => {
  it('proves --dry-run never invokes any mutation function on storage or database', async () => {
    const manifest = buildProvisioningManifest();

    // Mock client tracking calls
    const uploadSpy = vi.fn();
    const insertSpy = vi.fn();
    const upsertSpy = vi.fn();
    const updateSpy = vi.fn();
    const deleteSpy = vi.fn();
    const rpcSpy = vi.fn();

    const mockAdminClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadSpy,
          update: uploadSpy,
          remove: uploadSpy,
          download: vi.fn().mockResolvedValue({
            data: Buffer.from('<svg></svg>'),
            error: null,
          }),
          list: vi.fn().mockImplementation((folder?: string) => {
            if (folder === 'portraits') return Promise.resolve({ data: [{ name: 'avatar.svg' }], error: null });
            if (folder === 'projects') return Promise.resolve({ data: [{ name: 'integrum.svg' }], error: null });
            return Promise.resolve({ data: [{ name: 'avatar.svg' }, { name: 'integrum.svg' }], error: null });
          }),
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
        insert: insertSpy,
        upsert: upsertSpy,
        update: updateSpy,
        delete: deleteSpy,
      }),
      rpc: rpcSpy,
    } as unknown as Parameters<typeof runProvisioningEngine>[0]['adminClient'];

    const result = await runProvisioningEngine({
      adminClient: mockAdminClient,
      manifest,
      dryRun: true,
      silent: true,
    });

    expect(result.dryRun).toBe(true);
    expect(result.summary.archivalCandidates).toBe(0);

    // Assert zero write calls
    expect(uploadSpy).not.toHaveBeenCalled();
    expect(insertSpy).not.toHaveBeenCalled();
    expect(upsertSpy).not.toHaveBeenCalled();
    expect(updateSpy).not.toHaveBeenCalled();
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(rpcSpy).not.toHaveBeenCalled();
  });
});

describe('Action-Specific Operations & Managed Column Boundary Regressions', () => {
  const manifest = buildProvisioningManifest();

  it('generates updatePayload containing ONLY changed managed columns (avatar alt_text)', () => {
    const mockRemote = {
      mediaAssets: [
        {
          id: FIXED_IDS.AVATAR_ASSET,
          bucket_id: 'public_assets',
          file_name: 'avatar.svg',
          file_type: 'image/svg+xml',
          file_size: 1136,
          storage_path: 'portraits/avatar.svg',
          alt_text: 'Sufiyan Shaikh verified vector portrait placeholder',
          width: 800,
          height: 800,
          is_archived: false,
          created_at: '2026-08-29T00:00:00Z',
          updated_at: '2026-09-01T00:00:00Z',
        },
      ],
      profiles: [],
      projects: [],
      projectSections: [],
      projectSectionMedia: [],
      skillCategories: [],
      skills: [],
      education: [],
      seoEntries: [],
    };

    const actions = computeDifferential(manifest, mockRemote);
    const avatarAction = actions.find((a) => a.entity === 'media_assets' && a.key === FIXED_IDS.AVATAR_ASSET);

    expect(avatarAction).toBeDefined();
    expect(avatarAction?.action).toBe('UPDATE');
    // Crucial: updatePayload must contain ONLY alt_text. Must NOT contain file_size, path, created_at, or updated_at.
    expect(avatarAction?.updatePayload).toEqual({
      alt_text: 'Sufiyan Shaikh existing geometric profile visualization',
    });
    expect(avatarAction?.updatePayload).not.toHaveProperty('file_size');
    expect(avatarAction?.updatePayload).not.toHaveProperty('storage_path');
    expect(avatarAction?.updatePayload).not.toHaveProperty('created_at');
    expect(avatarAction?.updatePayload).not.toHaveProperty('updated_at');
    expect(avatarAction?.insertPayload).toBeNull();
  });

  it('skips unchanged records completely with null payloads', () => {
    const mockRemote = {
      mediaAssets: [
        {
          id: FIXED_IDS.INTEGRUM_ASSET,
          alt_text: 'Integrum Student Success Platform interface visualization',
        },
      ],
      profiles: [],
      projects: [],
      projectSections: [],
      projectSectionMedia: [],
      skillCategories: [],
      skills: [],
      education: [],
      seoEntries: [],
    };

    const actions = computeDifferential(manifest, mockRemote);
    const integrumAction = actions.find((a) => a.entity === 'media_assets' && a.key === FIXED_IDS.INTEGRUM_ASSET);

    expect(integrumAction).toBeDefined();
    expect(integrumAction?.action).toBe('UNCHANGED');
    expect(integrumAction?.insertPayload).toBeNull();
    expect(integrumAction?.updatePayload).toBeNull();
  });

  it('ensures insertPayload contains complete allowlisted columns and never created_at / updated_at', () => {
    const mockRemote = {
      mediaAssets: [],
      profiles: [],
      projects: [],
      projectSections: [],
      projectSectionMedia: [],
      skillCategories: [],
      skills: [],
      education: [],
      seoEntries: [],
    };

    const actions = computeDifferential(manifest, mockRemote);
    const iotAction = actions.find((a) => a.entity === 'media_assets' && a.key === FIXED_IDS.IOT_ASSET);

    expect(iotAction).toBeDefined();
    expect(iotAction?.action).toBe('INSERT');
    expect(iotAction?.updatePayload).toBeNull();
    expect(iotAction?.insertPayload).toHaveProperty('file_size');
    expect(typeof iotAction?.insertPayload?.file_size).toBe('number');
    expect(iotAction?.insertPayload).not.toHaveProperty('created_at');
    expect(iotAction?.insertPayload).not.toHaveProperty('updated_at');
  });

  it('guarantees deterministic delta across repeated runs with identical input', () => {
    const mockRemote = {
      mediaAssets: [
        {
          id: FIXED_IDS.AVATAR_ASSET,
          alt_text: 'Old alt text',
        },
      ],
      profiles: [manifest.profile],
      projects: manifest.projects,
      projectSections: manifest.projectSections,
      projectSectionMedia: manifest.projectSectionMedia,
      skillCategories: manifest.skillCategories,
      skills: manifest.skills,
      education: manifest.education,
      seoEntries: manifest.seoEntries,
    };

    const run1 = computeDifferential(manifest, mockRemote);
    const run2 = computeDifferential(manifest, mockRemote);

    expect(run1).toEqual(run2);
    expect(run1.filter((a) => a.action === 'UPDATE')).toHaveLength(1);
    expect(run1.filter((a) => a.action === 'INSERT')).toHaveLength(2); // IoT media + Integrum media
  });

  it('executes action-specific operations in live mode and skips unchanged records', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    const updateEqMock = vi.fn().mockResolvedValue({ error: null });
    const updateMock = vi.fn().mockReturnValue({ eq: updateEqMock });

    const mockAdminClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          download: vi.fn().mockResolvedValue({ data: Buffer.from(manifest.svgAssetsToUpload[0].content), error: null }),
        }),
      },
      from: vi.fn().mockImplementation((table: string) => {
        return {
          select: vi.fn().mockImplementation(() => {
            const promise = Promise.resolve({
              data: table === 'profiles' ? [manifest.profile] : [],
              error: null,
            });
            return Object.assign(promise, {
              limit: vi.fn().mockResolvedValue({ data: [{ id: 'mock' }], error: null }),
            });
          }),
          insert: insertMock,
          update: updateMock,
        };
      }),
    } as unknown as Parameters<typeof runProvisioningEngine>[0]['adminClient'];

    const result = await runProvisioningEngine({
      adminClient: mockAdminClient,
      manifest,
      dryRun: false,
      silent: true,
    });

    expect(result.dryRun).toBe(false);
    expect(result.success).toBe(true);

    // Profile was UNCHANGED, so insert and update should never be called for profile
    const profileInsertCalls = insertMock.mock.calls.filter(([arg]) => arg?.id === FIXED_IDS.PROFILE);
    expect(profileInsertCalls).toHaveLength(0);
  });

  it('aborts immediately and never retries when a live mutation fails', async () => {
    const insertMock = vi.fn().mockResolvedValue({ error: { message: 'JWT issued at future', code: 'PGRST303' } });

    const mockAdminClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: vi.fn().mockResolvedValue({ error: null }),
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          download: vi.fn().mockResolvedValue({ data: Buffer.from(manifest.svgAssetsToUpload[0].content), error: null }),
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockImplementation(() => {
          const promise = Promise.resolve({ data: [], error: null });
          return Object.assign(promise, {
            limit: vi.fn().mockResolvedValue({ data: [{ id: 'mock' }], error: null }),
          });
        }),
        insert: insertMock,
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      })),
    } as unknown as Parameters<typeof runProvisioningEngine>[0]['adminClient'];

    await expect(
      runProvisioningEngine({
        adminClient: mockAdminClient,
        manifest,
        dryRun: false,
        silent: true,
      })
    ).rejects.toThrow(/Insert failed.*JWT issued at future/);

    // Mutation MUST NOT be retried: called exactly once and aborted
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('aborts live execution during preflight without executing any mutations if preflight fails', async () => {
    const insertMock = vi.fn();
    const uploadMock = vi.fn();

    const mockAdminClient = {
      storage: {
        from: vi.fn().mockReturnValue({
          upload: uploadMock,
          list: vi.fn().mockResolvedValue({ data: [], error: null }),
          download: vi.fn().mockResolvedValue({ data: Buffer.from(manifest.svgAssetsToUpload[0].content), error: null }),
        }),
      },
      from: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockImplementation(() => {
          const promise = Promise.resolve({ data: [], error: null });
          return Object.assign(promise, {
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'JWT issued at future', code: 'PGRST303' },
            }),
          });
        }),
        insert: insertMock,
        update: vi.fn(),
      })),
    } as unknown as Parameters<typeof runProvisioningEngine>[0]['adminClient'];

    await expect(
      runProvisioningEngine({
        adminClient: mockAdminClient,
        manifest,
        dryRun: false,
        silent: true,
      })
    ).rejects.toThrow(/Preflight authentication check failed/);

    // Assert zero mutations executed
    expect(insertMock).not.toHaveBeenCalled();
    expect(uploadMock).not.toHaveBeenCalled();
  });
});

describe('isClockSkewError', () => {
  it('identifies exact PGRST303 code or JWT issued at future message', () => {
    expect(isClockSkewError({ code: 'PGRST303', message: 'Some error' })).toBe(true);
    expect(isClockSkewError({ code: 'OTHER', message: 'JWT issued at future' })).toBe(true);
    expect(isClockSkewError('PGRST303: JWT issued at future')).toBe(true);
  });

  it('strictly rejects non-clock-skew errors and generic 401s', () => {
    expect(isClockSkewError({ code: '42P01', message: 'relation does not exist' })).toBe(false);
    expect(isClockSkewError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(isClockSkewError({ status: 401, message: 'Invalid API key' })).toBe(false);
    expect(isClockSkewError({ message: 'Unauthorized' })).toBe(false);
    expect(isClockSkewError(null)).toBe(false);
    expect(isClockSkewError(undefined)).toBe(false);
  });
});

describe('executeWithClockSkewRetry', () => {
  it('returns immediately without delay on successful response', async () => {
    const fn = vi.fn().mockResolvedValue({ data: [{ id: 1 }], error: null });
    const res = await executeWithClockSkewRetry(fn, 3, 10);
    expect(res).toEqual({ data: [{ id: 1 }], error: null });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on JWT issued at future error and succeeds on subsequent attempt', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'JWT issued at future', code: 'PGRST303' } })
      .mockResolvedValueOnce({ data: [{ id: 'ok' }], error: null });

    const res = await executeWithClockSkewRetry(fn, 3, 10);
    expect(res).toEqual({ data: [{ id: 'ok' }], error: null });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('retries when function throws an error containing JWT issued at future', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('PGRST303: JWT issued at future'))
      .mockResolvedValueOnce({ data: [{ id: 'recovered' }], error: null });

    const res = await executeWithClockSkewRetry(fn, 3, 10);
    expect(res).toEqual({ data: [{ id: 'recovered' }], error: null });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('returns final error when maxRetries exhausted on persistent clock skew', async () => {
    const fn = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'JWT issued at future', code: 'PGRST303' } });

    const res = await executeWithClockSkewRetry(fn, 2, 10);
    expect(res.error.message).toBe('JWT issued at future');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry on unrelated errors or generic 401s', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { message: 'Relation not found', code: '42P01' } });

    const res = await executeWithClockSkewRetry(fn, 3, 10);
    expect(res.error.code).toBe('42P01');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

