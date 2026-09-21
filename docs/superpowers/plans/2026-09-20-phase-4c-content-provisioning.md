# Phase 4C — Verified Production Content Provisioning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Author a hardened, idempotent, dependency-ordered remote provisioning engine, verify all content locally, execute a non-mutating remote `--dry-run` report, and present the record-level plan for explicit user approval before performing production mutation.

**Architecture:** A deterministic provisioning engine in `scripts/provision-remote.mjs` computes the differential delta against remote Supabase (`zxauhsigpwresusmvkbu`) using modern Supabase keys (`PROD_SUPABASE_SECRET_KEY` for authorized mutation, `PROD_SUPABASE_PUBLISHABLE_KEY` for anonymous public RLS validation). It provisions trusted static SVG project artwork, verified profile, 2 projects (`integrum`, `iot-temp-monitor`), sections, section-media, 2 skill categories, 5 skills, verified education (with `NULL` dates), and 7 canonical SEO entries.

**Tech Stack:** Node.js 24 (ESM), TypeScript 5, Supabase JS Client v2, Zod 3, Vitest 4, Playwright.

## Global Constraints

- Windows PowerShell: always use `npm.cmd` and `npx.cmd` — never bare `npm`/`npx`.
- Do NOT upload fixture JPEGs to production; use only user-approved media or trusted, clearly labelled static SVG project visualizations without scripts or external URIs.
- Do NOT replace the existing production avatar; retain the current safe avatar visual or set the reference to `NULL`.
- Do NOT invent calendar dates. `public.education.start_date` and `end_date` are nullable; store `NULL`.
- Do NOT send `display_order` to `public.education`; the table has no `display_order` column.
- Use only modern Supabase keys (`sb_secret_...` and `sb_publishable_...`); zero legacy JWT keys.
- Rerunnable & idempotent: operations across REST requests must be dependency-ordered and safely repeatable, not assumed transactional.
- Keep Experience, Certifications, and Achievements collections strictly empty (`[]`).
- Execute `--dry-run` first; do NOT mutate production without explicit human authorization.
- Zero secret keys in browser code, source maps, console logs, or chat transcripts.

---

## Task 1: IoT SVG Project Visualization & Remote Provisioner Engine

**Files:**
- Create/Update: `scripts/provision-remote.mjs`
- Create: `__tests__/scripts/provision-manifest.test.ts`

**Interfaces:**
- Consumes: `createClient` from `@supabase/supabase-js`, `validateMediaBuffer` from `./scripts/lib/media-validator.mjs`
- Produces: CLI script with `--dry-run` and live provisioning modes, exporting `buildProvisioningManifest()` for testability.

- [ ] **Step 1: Write unit tests for the provisioning manifest**

```ts
// __tests__/scripts/provision-manifest.test.ts
import { describe, it, expect } from 'vitest';
import { buildProvisioningManifest } from '../../scripts/lib/provision-manifest.mjs';

describe('buildProvisioningManifest', () => {
  it('defines 7 canonical SEO entries matching active routes', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.seoEntries).toHaveLength(7);
    const routes = manifest.seoEntries.map((s) => s.route_path);
    expect(routes).toContain('/');
    expect(routes).toContain('/about');
    expect(routes).toContain('/projects');
    expect(routes).toContain('/projects/integrum');
    expect(routes).toContain('/projects/iot-temp-monitor');
    expect(routes).toContain('/skills');
    expect(routes).toContain('/experience');
  });

  it('provisions education with NULL start_date and end_date and NO display_order', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.education).toHaveLength(1);
    const edu = manifest.education[0];
    expect(edu.institution).toBe('R.K. Talreja College of Arts, Science and Commerce');
    expect(edu.degree).toBe('Bachelor of Science');
    expect(edu.field_of_study).toBe('Computer Science');
    expect(edu.start_date).toBeNull();
    expect(edu.end_date).toBeNull();
    expect('display_order' in edu).toBe(false);
  });

  it('provisions exact verified skill categories and 5 skills', () => {
    const manifest = buildProvisioningManifest();
    expect(manifest.skillCategories).toHaveLength(2);
    expect(manifest.skills).toHaveLength(5);
    const skillNames = manifest.skills.map((s) => s.name);
    expect(skillNames).toEqual(['TypeScript', 'Python', 'C++', 'React', 'Node.js']);
  });

  it('provisions trusted SVG for IoT project without scripts or external URIs', () => {
    const manifest = buildProvisioningManifest();
    const iotSvg = manifest.svgAssets.find((a) => a.storagePath === 'projects/iot-temp-monitor.svg');
    expect(iotSvg).toBeDefined();
    expect(iotSvg!.content).toContain('<svg');
    expect(iotSvg!.content).not.toContain('<script');
    expect(iotSvg!.content).not.toContain('http://');
    expect(iotSvg!.content).not.toContain('https://');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/scripts/provision-manifest.test.ts
```

- [ ] **Step 3: Implement `scripts/lib/provision-manifest.mjs`**

Implement deterministic manifest builder returning:
- `svgAssets`: `portraits/avatar.svg`, `projects/integrum.svg`, `projects/iot-temp-monitor.svg`
- `mediaAssets`: metadata records for the 3 SVG assets
- `profile`: Sufiyan Shaikh with `avatar_asset_id` pointing to `...0010`
- `projects`: `integrum` and `iot-temp-monitor`
- `projectSections`: Overview for Integrum, Hardware Architecture for IoT
- `projectSectionMedia`: mapping records
- `skillCategories`: Languages & Fundamentals, Frameworks & Systems
- `skills`: TypeScript, Python, C++, React, Node.js
- `education`: 1 record (R.K. Talreja College, B.Sc. CS, `start_date: null`, `end_date: null`)
- `seoEntries`: 7 routes

- [ ] **Step 4: Run test to verify it passes**

```powershell
npm.cmd test -- --reporter=verbose __tests__/scripts/provision-manifest.test.ts
```

- [ ] **Step 5: Upgrade `scripts/provision-remote.mjs` with `--dry-run` and differential reporting**

Implement:
- Query remote tables: `profiles`, `projects`, `project_sections`, `project_section_media`, `skill_categories`, `skills`, `education`, `seo_entries`, `media_assets`.
- Compare each manifest row against remote row: determine `INSERT`, `UPDATE`, or `UNCHANGED`.
- If `--dry-run` is passed: print the table of actions and exit `0` without any writes or uploads.
- If `ALLOW_REMOTE_PROVISION=1` and no `--dry-run`: execute dependency-ordered upserts and verify via anonymous RLS.

---

## Task 2: Local Seed Alignment & Snapshot Verification

**Files:**
- Modify: `supabase/seed.sql`
- Modify: `scripts/verify-exit-gate.mjs`

- [ ] **Step 1: Align `supabase/seed.sql` with verified education record and 7 SEO entries**
Add the verified education record and 7 SEO entries to `supabase/seed.sql` so local test runs reflect the production content model.

- [ ] **Step 2: Update `scripts/verify-exit-gate.mjs` for 7 routes and /projects/iot-temp-monitor 200**
Ensure probe checks `/about` for "R.K. Talreja College", `/skills` for "TypeScript", and `/projects/iot-temp-monitor` returns 200 when present in snapshot.

- [ ] **Step 3: Run full local verification gate**

```powershell
npm.cmd run lint
npm.cmd run type-check
npm.cmd test
npm.cmd run build
npm.cmd run verify:gate
```
Expected: Exit code `0`.

---

## Task 3: Remote Dry-Run Execution & Provenance Reporting

- [ ] **Step 1: Execute non-mutating dry-run against remote Supabase**

```powershell
node scripts/provision-remote.mjs --dry-run
```

- [ ] **Step 2: Review and verify output report**
Capture the exact record-level report:
- Inserts count
- Updates count
- Unchanged count
- Archival count (0)
- Confirmation that no admin/auth/contact/resume tables are touched.

- [ ] **Step 3: STOP and present report for explicit user authorization**

---

## Task 4: Production Provisioning, Vercel Rebuild & E2E Verification (Post-Approval)

- [ ] **Step 1: Execute live remote provisioning**
- [ ] **Step 2: Verify anonymous public RLS read from remote instance**
- [ ] **Step 3: Trigger/verify Vercel build**
- [ ] **Step 4: Run production Playwright E2E suite against `https://sufiyan-shaikh-dev.vercel.app`**
