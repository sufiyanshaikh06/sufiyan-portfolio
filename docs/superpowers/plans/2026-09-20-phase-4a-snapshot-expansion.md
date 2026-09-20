# Phase 4A Implementation Plan: Public Snapshot Expansion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the static build snapshot from the single-project Phase 3 slice to a complete, statically compiled snapshot of all verified public portfolio content without WebGL, preserving zero browser-time database queries, strict least privilege (publishable key only), atomic promotion, and dynamic project route generation.

**Architecture:**
1. Database rows are queried via explicit column projections using the Supabase publishable key and validated with strict `Db*` Zod schemas.
2. Relational integrity (foreign keys, media references, active résumé count) is verified before internal IDs are stripped.
3. Media assets are downloaded into staging, validated by magic bytes (including WebP RIFF length) and JSDOM XML SVG security checks, hashed (SHA-256 16 hex), and copied to target with pre-commit rollback tracking.
4. Pure page DTOs are assembled, deep-frozen upon server load in `lib/content`, and queried dynamically by static pages and route parameters.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5, Zod 3, @supabase/supabase-js, Vitest, JSDOM.

## Global Constraints

- Zero browser-time Supabase/database/storage/auth requests.
- Publishable/anon key only. No service role key, secret key, or remote database mutation.
- No root-level `integrum` in `public-snapshot.json`. Store `projects: ProjectCaseStudy[]`.
- Resolve Integrum via `getIntegrumCaseStudy()` (throws if missing) and `getProjectBySlug('integrum')`.
- All database UUIDs, foreign keys, bucket IDs, and storage paths must be stripped from page-facing DTOs.
- Graphic vector coordinates (`vectorPositionX`, `vectorPositionY`) stripped from page-facing `SkillSchema`.
- Dynamic route generation from snapshot slugs; do not assume IoT project exists unless live in snapshot.
- Atomic promotion: media files copied with rollback tracking (`copiedFiles`); manifest replacement (`fs.renameSync`) is the commit boundary; post-commit stale media pruning is best-effort.
- Deterministic primary + secondary ordering for all collections in queries and post-assembly.
- Comprehensive leak scan: forbidden keys, UUID value patterns in DTOs, configured keys, URLs, storage paths.
- Active résumé is metadata-only (`{ versionLabel, uploadedAt } | null`); private `resumes` bucket is never queried.
- Do not commit or push to Git until Phase 4A implementation is reviewed and approved.

---

### Task 1: Shared Normalization Helpers & Date Schemas

**Files:**
- Create: `lib/schemas/helpers.ts`
- Test: `__tests__/snapshot/helpers.test.ts`

**Interfaces:**
- Produces:
  - `normalizeRoutePath(value: string): string`
  - `IsoDateStringSchema: z.ZodString`
  - `IsoTimestampSchema: z.ZodString`

- [ ] **Step 1: Write the failing tests for helpers**

Create `__tests__/snapshot/helpers.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeRoutePath, IsoDateStringSchema, IsoTimestampSchema } from '@/lib/schemas/helpers';

describe('Shared Snapshot Helpers', () => {
  describe('normalizeRoutePath', () => {
    it('normalizes root path variants', () => {
      expect(normalizeRoutePath('/')).toBe('/');
      expect(normalizeRoutePath('///')).toBe('/');
      expect(normalizeRoutePath('')).toBe('/');
    });

    it('normalizes casing and duplicate/trailing slashes', () => {
      expect(normalizeRoutePath('/projects/integrum/')).toBe('/projects/integrum');
      expect(normalizeRoutePath('/PROJECTS/INTEGRUM')).toBe('/projects/integrum');
      expect(normalizeRoutePath('//projects///integrum//')).toBe('/projects/integrum');
    });
  });

  describe('IsoDateStringSchema', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
      expect(() => IsoDateStringSchema.parse('2026-09-20')).not.toThrow();
      expect(() => IsoDateStringSchema.parse('1999-01-01')).not.toThrow();
    });

    it('rejects timestamps, invalid formats, or non-dates', () => {
      expect(() => IsoDateStringSchema.parse('2026-09-20T00:00:00Z')).toThrow();
      expect(() => IsoDateStringSchema.parse('20-09-2026')).toThrow();
      expect(() => IsoDateStringSchema.parse('2026/09/20')).toThrow();
      expect(() => IsoDateStringSchema.parse('invalid-date')).toThrow();
    });
  });

  describe('IsoTimestampSchema', () => {
    it('accepts valid ISO datetimes with Z and timezone offsets', () => {
      expect(() => IsoTimestampSchema.parse('2026-09-20T10:00:00Z')).not.toThrow();
      expect(() => IsoTimestampSchema.parse('2026-09-20T15:30:00+05:30')).not.toThrow();
      expect(() => IsoTimestampSchema.parse('2026-09-20T02:00:00-07:00')).not.toThrow();
    });

    it('rejects plain dates or malformed strings', () => {
      expect(() => IsoTimestampSchema.parse('2026-09-20')).toThrow();
      expect(() => IsoTimestampSchema.parse('not-a-timestamp')).toThrow();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test __tests__/snapshot/helpers.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement shared helpers**

Create `lib/schemas/helpers.ts`:
```ts
import { z } from 'zod';

export function normalizeRoutePath(value: string): string {
  if (!value || typeof value !== 'string') return '/';
  const trimmed = value.trim();
  const normalized = trimmed.toLowerCase().replace(/\/+/g, '/').replace(/\/+$/, '');
  return normalized.startsWith('/') ? normalized || '/' : `/${normalized}`;
}

export const IsoDateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format');

export const IsoTimestampSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO 8601 timestamp with timezone or Z' });
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test __tests__/snapshot/helpers.test.ts`
Expected: PASS.

---

### Task 2: Expanded Database & Page DTO Schemas

**Files:**
- Modify: `lib/schemas/snapshot.ts`
- Modify: `lib/types/content.ts`
- Test: `__tests__/snapshot/validation.test.ts`

**Interfaces:**
- Consumes: `lib/schemas/helpers.ts` (`normalizeRoutePath`, `IsoDateStringSchema`, `IsoTimestampSchema`).
- Produces:
  - Raw `Db*` schemas (`DbProfileSchema`, `DbProjectSchema`, `DbSectionSchema`, `DbSectionMediaSchema`, `DbSkillCategorySchema`, `DbSkillSchema`, `DbEducationSchema`, `DbExperienceSchema`, `DbCertificationSchema`, `DbAchievementSchema`, `DbSeoEntrySchema`, `DbResumeVersionSchema`, `DbMediaAssetSchema`).
  - Page DTO schemas (`LocalMediaAssetSchema`, `SectionMediaSchema`, `ProjectSectionSchema`, `ProjectCaseStudySchema`, `SkillSchema`, `SkillCategorySchema`, `EducationSchema`, `ExperienceSchema`, `CertificationSchema`, `AchievementSchema`, `SeoEntrySchema`, `ActiveResumeMetadataSchema`, `ProfileSchema`, `PublicSnapshotSchema`).
  - Re-exports in `lib/types/content.ts`.

- [ ] **Step 1: Write expanded schema tests**

Update `__tests__/snapshot/validation.test.ts` with comprehensive unit tests:
- Raw `Db*` validation with `z.strictObject`: rejects unknown properties, validates nullability per migration, validates dates.
- Page DTO schemas: validates clean structures, rejects UUIDs, enforces `IsoDateStringSchema`.
- SkillSchema: rejects vector coordinates if present.
- Tier-based project sections: `featured`/`standard` fails with 0 sections; `mini` passes with 0 sections.
- LocalMediaAsset: enforces `^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$`.
- Cross-collection `PublicSnapshotSchema.superRefine`:
  - Rejects duplicate project slugs.
  - Rejects duplicate project displayOrder.
  - Rejects duplicate section displayOrder.
  - Rejects duplicate section media displayOrder.
  - Rejects duplicate skill category names or displayOrder.
  - Rejects duplicate skill names or displayOrder.
  - Rejects duplicate SEO route paths (via `normalizeRoutePath`).

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test __tests__/snapshot/validation.test.ts`
Expected: FAIL (missing schemas / updated structure).

- [ ] **Step 3: Implement expanded schemas in `lib/schemas/snapshot.ts` and re-export in `lib/types/content.ts`**

Update `lib/schemas/snapshot.ts` using `z.strictObject` and the full approved schema definitions from the specification.
Update `lib/types/content.ts` as a re-export-only module.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test __tests__/snapshot/validation.test.ts`
Expected: PASS.

---

### Task 3: Content Access Layer with Runtime Validation & Deep Immutability

**Files:**
- Modify: `lib/content/index.ts`
- Test: `__tests__/content/content-layer.test.ts`

**Interfaces:**
- Consumes: `lib/schemas/snapshot.ts` (`PublicSnapshotSchema`, `PublicSnapshot`), `lib/schemas/helpers.ts` (`normalizeRoutePath`).
- Produces:
  - `getSnapshot(): Readonly<PublicSnapshot>`
  - `getPublishedProfile(): Readonly<Profile>`
  - `getPublishedProjects(): ReadonlyArray<ProjectCaseStudy>`
  - `getProjectBySlug(slug: string): Readonly<ProjectCaseStudy> | null`
  - `getPublishedProjectSlugs(): string[]`
  - `getIntegrumCaseStudy(): Readonly<ProjectCaseStudy>` (throws if missing)
  - `getSkillCategories(): ReadonlyArray<SkillCategory>`
  - `getEducation(): ReadonlyArray<Education>`
  - `getExperiences(): ReadonlyArray<Experience>`
  - `getCertifications(): ReadonlyArray<Certification>`
  - `getAchievements(): ReadonlyArray<Achievement>`
  - `getSeoEntries(): ReadonlyArray<SeoEntry>`
  - `getSeoEntryForRoute(routePath: string): Readonly<SeoEntry> | null`
  - `getActiveResumeMetadata(): Readonly<ActiveResumeMetadata> | null`

- [ ] **Step 1: Write tests for content layer**

Create `__tests__/content/content-layer.test.ts`:
- Verifies runtime validation on load.
- Verifies `deepFreeze`: attempting `(getSnapshot().projects as any)[0].title = 'Mutated'` throws in strict mode.
- Verifies `getProjectBySlug('integrum')` returns project.
- Verifies `getProjectBySlug('nonexistent')` returns `null`.
- Verifies `getPublishedProjectSlugs()` returns array of strings.
- Verifies `getIntegrumCaseStudy()` returns Integrum or throws descriptive error.
- Verifies `getSeoEntryForRoute('/projects/integrum/')` resolves `/projects/integrum`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test __tests__/content/content-layer.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement content layer in `lib/content/index.ts`**

Implement `deepFreeze<T>(obj: T): T` and all getters adhering strictly to the specification.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test __tests__/content/content-layer.test.ts`
Expected: PASS.

---

### Task 4: Media Security Validator & SVG Sanitizer Modules

**Files:**
- Create: `scripts/lib/media-validator.mjs`
- Test: `__tests__/snapshot/media-validator.test.ts`

**Interfaces:**
- Produces:
  - `validateMediaBuffer(buffer, fileType, expectedSize): { ext: string }`
  - `sanitizeSvgContent(svgText): void` (throws on violation)
  - `generateSafeHashedFilename(originalName, hash16, ext): string`

- [ ] **Step 1: Write media security and validator tests**

Create `__tests__/snapshot/media-validator.test.ts`:
- Magic bytes tests:
  - Valid JPEG (`ffd8ff` ... `ffd9`) returns `ext: 'jpg'`.
  - Valid PNG (`89504e470d0a1a0a`) returns `ext: 'png'`.
  - Valid WebP (`RIFF` at 0-3, `WEBP` at 8-11, payload size matching `buffer.length - 8`) returns `ext: 'webp'`.
  - Invalid WebP (corrupt RIFF size or missing WEBP) throws.
  - Byte count mismatch throws.
- SVG sanitization tests:
  - Valid SVG with `xmlns="http://www.w3.org/2000/svg"` and internal `fill="url(#grad)"` passes.
  - SVG with `<!DOCTYPE` or `<!ENTITY` throws.
  - SVG with `<script>` or `<foreignObject>` throws.
  - SVG with `onclick`, `onload`, `onerror` throws.
  - SVG with external `fill="url(https://malicious.example/file.svg#paint)"` throws.
  - SVG with `href="javascript:..."` or `href="https://..."` throws.
- Filename sanitization tests:
  - `iot-temp-monitor.jpg` $\to$ `iot_temp_monitor-[hash].jpg`.
  - `../../../etc/passwd.png` $\to$ `passwd-[hash].png`.
  - Output conforms to `^[a-z0-9_]+-[a-f0-9]{16}\.(jpg|png|webp|svg)$`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test __tests__/snapshot/media-validator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `scripts/lib/media-validator.mjs`**

Implement using JSDOM for XML SVG parsing, exact byte-count checks, RIFF calculations, and safe basename sanitization.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test __tests__/snapshot/media-validator.test.ts`
Expected: PASS.

---

### Task 5: Atomic Snapshot Generator Pipeline with Rollback & Leak Detection

**Files:**
- Modify: `scripts/snapshot-public.mjs`
- Create: `scripts/lib/snapshot-pipeline.mjs` (modular core pipeline logic)
- Test: `__tests__/snapshot/generator.test.ts`

**Interfaces:**
- Consumes: `lib/schemas/snapshot.ts`, `lib/schemas/helpers.ts`, `scripts/lib/media-validator.mjs`.
- Produces:
  - Fully atomic build execution writing to `public/generated/snapshot/` and `lib/generated/public-snapshot.json`.

- [ ] **Step 1: Write generator pipeline & failure injection tests**

Create `__tests__/snapshot/generator.test.ts`:
- Pre-assembly relational integrity: detects orphaned section, orphaned media ID, missing category.
- Staging and atomic promotion test:
  - Media copy failure: staging failure deletes only files added to `copiedFiles`; existing target media intact.
  - Manifest write failure: aborts pre-commit; newly copied media cleaned up.
  - Manifest rename failure: aborts pre-commit; existing manifest preserved.
  - Post-commit cleanup: active media kept, unreferenced media removed, cleanup warning on error without failing snapshot.
- Leak scanner test:
  - Rejects if any key matches forbidden column list (`id`, `category_id`, etc.).
  - Rejects if any string value matches UUID pattern.
  - Rejects if any configured sensitive token (`sensitiveValues`) is found.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test __tests__/snapshot/generator.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement atomic snapshot pipeline**

Implement modular pipeline in `scripts/lib/snapshot-pipeline.mjs` and entrypoint in `scripts/snapshot-public.mjs`:
- Isolated staging via `fs.mkdtempSync`.
- Explicit column queries for all 12 tables with deterministic primary + secondary ordering.
- Short-circuit empty `.in(col, [])` requests.
- Pre-assembly integrity checks.
- Media deduplication cache.
- Pure DTO assembly with trimmed and deduplicated string arrays.
- Final validation via `PublicSnapshotSchema.parse()`.
- Comprehensive leak detection.
- Atomic promotion with `copiedFiles` rollback tracking on pre-commit error, atomic rename of sibling temp file for manifest, and best-effort post-commit stale media pruning.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test __tests__/snapshot/generator.test.ts`
Expected: PASS.

- [ ] **Step 5: Execute snapshot generator against local Supabase**

Run: `node scripts/snapshot-public.mjs`
Expected: Success, generates valid `lib/generated/public-snapshot.json` and hashed media assets.

---

### Task 6: Dynamic Project Routing & Static Route Tests

**Files:**
- Modify: `app/projects/[slug]/page.tsx`
- Modify: `app/page.tsx`
- Modify: `__tests__/routes/static-routes.test.tsx`
- Modify: `__tests__/security/bundle.test.ts`

**Interfaces:**
- Consumes: `lib/content/index.ts` (`getPublishedProjects`, `getPublishedProjectSlugs`, `getProjectBySlug`, `getIntegrumCaseStudy`, `getPublishedProfile`).

- [ ] **Step 1: Write updated route tests**

Update `__tests__/routes/static-routes.test.tsx`:
- `generateStaticParams()` returns whatever slugs exist in current snapshot (dynamically).
- Case study page renders project title, subtitle, category, tier, description, and technologies.
- Tests summary-only layout: if `sections.length === 0`, HUD card and external links render cleanly without empty headings.
- Homepage uses `getIntegrumCaseStudy()` and renders verified claims.
- Bundle test (`__tests__/security/bundle.test.ts`): verifies zero WebGL, Three.js, R3F, GSAP packages and zero `@supabase/supabase-js` imports in client components.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd test __tests__/routes/static-routes.test.tsx`
Expected: FAIL (until components updated).

- [ ] **Step 3: Update page components**

In `app/projects/[slug]/page.tsx`:
- Dynamic static params from `getPublishedProjectSlugs()`.
- Key sections by `${project.slug}-section-${section.displayOrder}`.
- Key section media by `${project.slug}-section-${section.displayOrder}-media-${item.displayOrder}`.
- Handle empty sections cleanly with summary-only layout.

In `app/page.tsx`:
- Call `getIntegrumCaseStudy()` and `getPublishedProfile()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm.cmd test __tests__/routes/static-routes.test.tsx __tests__/security/bundle.test.ts`
Expected: PASS.

---

### Task 7: Full End-to-End Build & Gate Verification

**Files:**
- Run commands across the entire verification matrix.

- [ ] **Step 1: Run linter**

Run: `npm.cmd run lint`
Expected: 0 warnings, 0 errors.

- [ ] **Step 2: Run TypeScript type-check**

Run: `npm.cmd run type-check`
Expected: 0 type errors.

- [ ] **Step 3: Run Vitest test suite**

Run: `npm.cmd test`
Expected: All tests pass 100%.

- [ ] **Step 4: Run Supabase pgTAP database tests**

Run: `npx.cmd supabase test db`
Expected: All database tests pass 100%.

- [ ] **Step 5: Run full Next.js static build**

Run: `npm.cmd run build`
Expected: `snapshot:public` executes atomically followed by successful `next build` static export.

- [ ] **Step 6: Run exit gate verification**

Run: `npm.cmd run verify:gate`
Expected: Phase 3/4 baseline probes and canary scanners pass cleanly.
