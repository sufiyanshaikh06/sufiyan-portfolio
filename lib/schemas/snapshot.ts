import { z } from 'zod';
import { IsoDateStringSchema, IsoTimestampSchema, normalizeRoutePath } from './helpers.ts';

// ============================================================================
// Raw Database Row Schemas (Validated when queried from Supabase)
// ============================================================================

export const DbProfileSchema = z.strictObject({
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

export const DbProjectSchema = z.strictObject({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  category: z.string().min(1),
  tier: z.enum(['featured', 'standard', 'mini']),
  description: z.string().min(1),
  problem_statement: z.string().nullable().optional(),
  architecture_overview: z.string().nullable().optional(),
  key_features: z.array(z.string().min(1)).nullable().optional(),
  technologies: z.array(z.string().min(1)).min(1),
  featured_asset_id: z.string().uuid().nullable().optional(),
  demo_url: z.string().url().nullable().optional(),
  github_url: z.string().url().nullable().optional(),
  display_order: z.number().int().nonnegative(),
  state: z.literal('live'),
  is_archived: z.literal(false),
});

export const DbSectionSchema = z.strictObject({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  title: z.string().min(1),
  content: z.string().min(1),
  display_order: z.number().int().nonnegative(),
});

export const DbSectionMediaSchema = z.strictObject({
  id: z.string().uuid(),
  section_id: z.string().uuid(),
  media_asset_id: z.string().uuid(),
  display_order: z.number().int().nonnegative(),
});

export const DbSkillCategorySchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().min(1),
  display_order: z.number().int().nonnegative(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbSkillSchema = z.strictObject({
  id: z.string().uuid(),
  category_id: z.string().uuid(),
  name: z.string().min(1),
  proficiency_level: z.string().min(1),
  icon_identifier: z.string().nullable().optional(),
  vector_position_x: z.coerce.number().optional(),
  vector_position_y: z.coerce.number().optional(),
  display_order: z.number().int().nonnegative(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbEducationSchema = z.strictObject({
  id: z.string().uuid(),
  institution: z.string().min(1),
  degree: z.string().min(1),
  field_of_study: z.string().nullable().optional(),
  start_date: IsoDateStringSchema.nullable().optional(),
  end_date: IsoDateStringSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbExperienceSchema = z.strictObject({
  id: z.string().uuid(),
  organization: z.string().min(1),
  role_title: z.string().min(1),
  type: z.string().min(1),
  location: z.string().nullable().optional(),
  start_date: IsoDateStringSchema,
  end_date: IsoDateStringSchema.nullable().optional(),
  description_points: z.array(z.string().min(1)),
  display_order: z.number().int().nonnegative(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbCertificationSchema = z.strictObject({
  id: z.string().uuid(),
  name: z.string().min(1),
  issuing_organization: z.string().min(1),
  issue_date: IsoDateStringSchema.nullable().optional(),
  credential_url: z.string().url().nullable().optional(),
  certificate_asset_id: z.string().uuid().nullable().optional(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbAchievementSchema = z.strictObject({
  id: z.string().uuid(),
  title: z.string().min(1),
  date: IsoDateStringSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  achievement_asset_id: z.string().uuid().nullable().optional(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbSeoEntrySchema = z.strictObject({
  id: z.string().uuid(),
  route_path: z.string().regex(/^\/[a-zA-Z0-9_\-\/]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string().min(1)).nullable().optional(),
  og_image_asset_id: z.string().uuid().nullable().optional(),
  is_published: z.literal(true),
  is_archived: z.literal(false),
});

export const DbResumeVersionSchema = z.strictObject({
  id: z.string().uuid(),
  version_label: z.string().min(1),
  file_asset_id: z.string().uuid(),
  is_active: z.literal(true),
  is_archived: z.literal(false),
  uploaded_at: IsoTimestampSchema,
});

export const DbMediaAssetSchema = z.strictObject({
  id: z.string().uuid(),
  bucket_id: z.literal('public_assets'),
  file_name: z.string().min(1),
  file_type: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
  file_size: z.number().int().positive(),
  storage_path: z.string().min(1),
  alt_text: z.string().min(1),
  caption: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  is_archived: z.literal(false),
});

// ============================================================================
// Page-Facing Snapshot Schemas (Local paths only; no bucketId/storagePath)
// ============================================================================

export const LocalMediaAssetSchema = z.strictObject({
  fileName: z.string().regex(/^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$/),
  localPath: z.string().regex(/^\/generated\/snapshot\/[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$/),
  altText: z.string().min(1),
  caption: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
});

export const SectionMediaSchema = z.strictObject({
  localPath: z.string().regex(/^\/generated\/snapshot\/[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$/),
  altText: z.string().min(1),
  caption: z.string().nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  displayOrder: z.number().int().nonnegative(),
});

export const ProjectSectionSchema = z.strictObject({
  title: z.string().min(1),
  content: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
  media: z.array(SectionMediaSchema),
});

export const ProjectCaseStudySchema = z.strictObject({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1),
  subtitle: z.string().nullable().optional(),
  category: z.string().min(1),
  tier: z.enum(['featured', 'standard', 'mini']),
  description: z.string().min(1),
  problemStatement: z.string().nullable().optional(),
  architectureOverview: z.string().nullable().optional(),
  keyFeatures: z.array(z.string().min(1)).nullable().optional(),
  technologies: z.array(z.string().min(1)).min(1),
  featuredAsset: LocalMediaAssetSchema.nullable().optional(),
  demoUrl: z.string().url().nullable().optional(),
  githubUrl: z.string().url().nullable().optional(),
  displayOrder: z.number().int().nonnegative(),
  sections: z.array(ProjectSectionSchema),
}).refine((project) => {
  if (project.tier === 'featured' || project.tier === 'standard') {
    return project.sections.length >= 1;
  }
  return true; // mini projects may have 0 sections
}, {
  message: 'Featured and standard projects must contain at least 1 section. Mini projects may have 0 sections.',
  path: ['sections'],
});

export const SkillSchema = z.strictObject({
  name: z.string().min(1),
  proficiencyLevel: z.string().min(1),
  iconIdentifier: z.string().nullable().optional(),
  displayOrder: z.number().int().nonnegative(),
});

export const SkillCategorySchema = z.strictObject({
  name: z.string().min(1),
  displayOrder: z.number().int().nonnegative(),
  skills: z.array(SkillSchema).min(1),
});

export const EducationSchema = z.strictObject({
  institution: z.string().min(1),
  degree: z.string().min(1),
  fieldOfStudy: z.string().nullable().optional(),
  startDate: IsoDateStringSchema.nullable().optional(),
  endDate: IsoDateStringSchema.nullable().optional(),
  description: z.string().nullable().optional(),
});

export const ExperienceSchema = z.strictObject({
  organization: z.string().min(1),
  roleTitle: z.string().min(1),
  type: z.string().min(1),
  location: z.string().nullable().optional(),
  startDate: IsoDateStringSchema,
  endDate: IsoDateStringSchema.nullable().optional(),
  descriptionPoints: z.array(z.string().min(1)),
  displayOrder: z.number().int().nonnegative(),
});

export const CertificationSchema = z.strictObject({
  name: z.string().min(1),
  issuingOrganization: z.string().min(1),
  issueDate: IsoDateStringSchema.nullable().optional(),
  credentialUrl: z.string().url().nullable().optional(),
  certificateAsset: LocalMediaAssetSchema.nullable().optional(),
});

export const AchievementSchema = z.strictObject({
  title: z.string().min(1),
  date: IsoDateStringSchema.nullable().optional(),
  description: z.string().nullable().optional(),
  achievementAsset: LocalMediaAssetSchema.nullable().optional(),
});

export const SeoEntrySchema = z.strictObject({
  routePath: z.string().regex(/^\/[a-zA-Z0-9_\-\/]*$/),
  title: z.string().min(1),
  description: z.string().min(1),
  keywords: z.array(z.string().min(1)).nullable().optional(),
  ogImageAsset: LocalMediaAssetSchema.nullable().optional(),
});

export const ActiveResumeMetadataSchema = z.strictObject({
  versionLabel: z.string().min(1),
  uploadedAt: IsoTimestampSchema,
});

export const ProfileSchema = z.strictObject({
  fullName: z.literal('Sufiyan Shaikh'),
  professionalName: z.string().min(1),
  headline: z.string().min(1),
  bio: z.string().min(1),
  githubUrl: z.string().url().refine((val) => val.startsWith('https://github.com/'), {
    message: 'GitHub URL must start with https://github.com/',
  }),
  linkedinUrl: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
  avatar: LocalMediaAssetSchema.nullable().optional(),
});

export const PublicSnapshotSchema = z.strictObject({
  profile: ProfileSchema,
  projects: z.array(ProjectCaseStudySchema).min(1),
  skillCategories: z.array(SkillCategorySchema),
  education: z.array(EducationSchema),
  experiences: z.array(ExperienceSchema),
  certifications: z.array(CertificationSchema),
  achievements: z.array(AchievementSchema),
  seoEntries: z.array(SeoEntrySchema),
  activeResume: ActiveResumeMetadataSchema.nullable(),
  generatedAt: IsoTimestampSchema,
}).superRefine((data, ctx) => {
  // 1. Slug uniqueness
  const slugs = new Set<string>();
  for (let i = 0; i < data.projects.length; i++) {
    const p = data.projects[i];
    if (slugs.has(p.slug)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate project slug: "${p.slug}"`,
        path: ['projects', i, 'slug'],
      });
    }
    slugs.add(p.slug);

    // 2. Section displayOrder uniqueness within project
    const sectionOrders = new Set<number>();
    for (let j = 0; j < p.sections.length; j++) {
      const s = p.sections[j];
      if (sectionOrders.has(s.displayOrder)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate section displayOrder ${s.displayOrder} in project "${p.slug}"`,
          path: ['projects', i, 'sections', j, 'displayOrder'],
        });
      }
      sectionOrders.add(s.displayOrder);

      // 3. Media displayOrder uniqueness within section
      const mediaOrders = new Set<number>();
      for (let k = 0; k < s.media.length; k++) {
        const m = s.media[k];
        if (mediaOrders.has(m.displayOrder)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate media displayOrder ${m.displayOrder} in section "${s.title}" of project "${p.slug}"`,
            path: ['projects', i, 'sections', j, 'media', k, 'displayOrder'],
          });
        }
        mediaOrders.add(m.displayOrder);
      }
    }
  }

  // 4. Skill category uniqueness
  const catNames = new Set<string>();
  const catOrders = new Set<number>();
  for (let i = 0; i < data.skillCategories.length; i++) {
    const cat = data.skillCategories[i];
    const normalizedCatName = cat.name.trim().toLowerCase();
    if (catNames.has(normalizedCatName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate skill category name: "${cat.name}"`,
        path: ['skillCategories', i, 'name'],
      });
    }
    catNames.add(normalizedCatName);

    if (catOrders.has(cat.displayOrder)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate skill category displayOrder: ${cat.displayOrder}`,
        path: ['skillCategories', i, 'displayOrder'],
      });
    }
    catOrders.add(cat.displayOrder);

    // 5. Skill uniqueness within category
    const skillNames = new Set<string>();
    const skillOrders = new Set<number>();
    for (let j = 0; j < cat.skills.length; j++) {
      const sk = cat.skills[j];
      const normalizedSkillName = sk.name.trim().toLowerCase();
      if (skillNames.has(normalizedSkillName)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate skill name "${sk.name}" in category "${cat.name}"`,
          path: ['skillCategories', i, 'skills', j, 'name'],
        });
      }
      skillNames.add(normalizedSkillName);

      if (skillOrders.has(sk.displayOrder)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate skill displayOrder ${sk.displayOrder} in category "${cat.name}"`,
          path: ['skillCategories', i, 'skills', j, 'displayOrder'],
        });
      }
      skillOrders.add(sk.displayOrder);
    }
  }

  // 6. Normalized SEO route path uniqueness using shared normalizeRoutePath
  const routes = new Set<string>();
  for (let i = 0; i < data.seoEntries.length; i++) {
    const seo = data.seoEntries[i];
    const normalizedRoute = normalizeRoutePath(seo.routePath);
    if (routes.has(normalizedRoute)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate SEO route path: "${seo.routePath}" (normalized: "${normalizedRoute}")`,
        path: ['seoEntries', i, 'routePath'],
      });
    }
    routes.add(normalizedRoute);
  }
});

// ============================================================================
// Inferred TypeScript Types
// ============================================================================

export type DbProfile = z.infer<typeof DbProfileSchema>;
export type DbProject = z.infer<typeof DbProjectSchema>;
export type DbSection = z.infer<typeof DbSectionSchema>;
export type DbSectionMedia = z.infer<typeof DbSectionMediaSchema>;
export type DbSkillCategory = z.infer<typeof DbSkillCategorySchema>;
export type DbSkill = z.infer<typeof DbSkillSchema>;
export type DbEducation = z.infer<typeof DbEducationSchema>;
export type DbExperience = z.infer<typeof DbExperienceSchema>;
export type DbCertification = z.infer<typeof DbCertificationSchema>;
export type DbAchievement = z.infer<typeof DbAchievementSchema>;
export type DbSeoEntry = z.infer<typeof DbSeoEntrySchema>;
export type DbResumeVersion = z.infer<typeof DbResumeVersionSchema>;
export type DbMediaAsset = z.infer<typeof DbMediaAssetSchema>;

export type LocalMediaAsset = z.infer<typeof LocalMediaAssetSchema>;
export type SectionMedia = z.infer<typeof SectionMediaSchema>;
export type ProjectSection = z.infer<typeof ProjectSectionSchema>;
export type ProjectCaseStudy = z.infer<typeof ProjectCaseStudySchema>;
export type Skill = z.infer<typeof SkillSchema>;
export type SkillCategory = z.infer<typeof SkillCategorySchema>;
export type Education = z.infer<typeof EducationSchema>;
export type Experience = z.infer<typeof ExperienceSchema>;
export type Certification = z.infer<typeof CertificationSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type SeoEntry = z.infer<typeof SeoEntrySchema>;
export type ActiveResumeMetadata = z.infer<typeof ActiveResumeMetadataSchema>;
export type Profile = z.infer<typeof ProfileSchema>;
export type PublicSnapshot = z.infer<typeof PublicSnapshotSchema>;
