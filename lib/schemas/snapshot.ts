import { z } from 'zod';

// ============================================================================
// Raw Database Row Schemas (Validated when queried from Supabase)
// ============================================================================

export const DbProfileSchema = z.object({
  id: z.string().uuid(),
  full_name: z.literal('Sufiyan Shaikh'),
  professional_name: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  github_url: z.string().url().refine((val) => val.startsWith('https://github.com/'), {
    message: 'GitHub URL must start with https://github.com/',
  }),
  linkedin_url: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  is_published: z.literal(true),
  avatar_asset_id: z.string().uuid().nullable().optional(),
});

export const DbProjectSchema = z.object({
  id: z.string().uuid(),
  slug: z.literal('integrum'),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  category: z.string().min(1),
  tier: z.literal('featured'),
  description: z.string().min(1),
  technologies: z.array(z.string().min(1)).min(1),
  featured_asset_id: z.string().uuid().nullable().optional(),
  demo_url: z.string().url().nullable().optional(),
  github_url: z.string().url().nullable().optional(),
  display_order: z.number().int().nonnegative(),
  state: z.literal('live'),
  is_archived: z.literal(false),
});

export const DbSectionSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  display_order: z.number().int().nonnegative(),
});

export const DbMediaAssetSchema = z.object({
  id: z.string().uuid(),
  bucket_id: z.string().min(1),
  file_name: z.string().min(1),
  file_type: z.string().min(1),
  file_size: z.number().int().positive(),
  storage_path: z.string().min(1),
  alt_text: z.string().min(1),
  caption: z.string().nullable().optional(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  is_archived: z.literal(false),
});

// ============================================================================
// Page-Facing Snapshot Schemas (Local paths only; no bucketId/storagePath)
// ============================================================================

export const LocalMediaAssetSchema = z.object({
  fileName: z.string().min(1),
  localPath: z.string().regex(/^\/generated\/snapshot\/[a-zA-Z0-9_.-]+-[a-f0-9]{16}\.[a-zA-Z0-9]+$/),
  altText: z.string().min(1),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const ProjectSectionSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
  media: z.array(LocalMediaAssetSchema),
});

export const ProjectCaseStudySchema = z.object({
  id: z.string().uuid(),
  slug: z.literal('integrum'),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  category: z.string().min(1),
  tier: z.literal('featured'),
  description: z.string().min(1),
  technologies: z.array(z.string().min(1)).min(1),
  featuredAsset: LocalMediaAssetSchema.nullable().optional(),
  demoUrl: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  sections: z.array(ProjectSectionSchema).min(1),
});

export const ProfileSchema = z.object({
  fullName: z.literal('Sufiyan Shaikh'),
  professionalName: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  githubUrl: z.string().url().refine((val) => val.startsWith('https://github.com/'), {
    message: 'GitHub URL must start with https://github.com/',
  }),
  avatar: LocalMediaAssetSchema.nullable().optional(),
});

export const PublicSnapshotSchema = z.object({
  profile: ProfileSchema,
  integrum: ProjectCaseStudySchema,
  generatedAt: z.string().datetime(),
});

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

export type DbProfile = z.infer<typeof DbProfileSchema>;
export type DbProject = z.infer<typeof DbProjectSchema>;
export type DbSection = z.infer<typeof DbSectionSchema>;
export type DbMediaAsset = z.infer<typeof DbMediaAssetSchema>;

export type LocalMediaAsset = z.infer<typeof LocalMediaAssetSchema>;
export type ProjectSection = z.infer<typeof ProjectSectionSchema>;
export type ProjectCaseStudy = z.infer<typeof ProjectCaseStudySchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type PublicSnapshot = z.infer<typeof PublicSnapshotSchema>;
