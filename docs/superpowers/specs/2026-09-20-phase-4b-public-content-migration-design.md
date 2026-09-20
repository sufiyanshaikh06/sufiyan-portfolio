# Phase 4B — Public Content Migration Design Specification

**Date:** 2026-09-20
**Author:** Antigravity / AI pair
**Status:** Awaiting user review
**Precondition:** Phase 4A is frozen at commits `c4e93a6` and `78fc36c`.

---

## 1. Objective

Migrate the four remaining snapshot entity groups into statically-generated public pages, add a project-listing page, and update the site navigation — while preserving every Phase 4A guarantee:

- Static-first SSG; `export const dynamic = 'error'` on every page.
- Zero browser-time Supabase reads.
- Functional pages without JavaScript.
- WCAG-oriented semantic HTML.
- No unverified biographical content.
- No secret keys in source, bundles, logs, or chat.

---

## 2. Approved Navigation Structure

```
Home          /
About         /about
Projects      /projects
Skills        /skills
Experience    /experience
GitHub ↗      https://github.com/sufiyanshaikh06   (external)
```

- `Contact` is absent until Phase 4E.
- **Header change:** Replace the current "Featured Project → `/projects/integrum`" link with
  "Projects → `/projects`". This change ships in the same commit as `/projects` page.
- The Phase 4A homepage and project-detail pages are preserved; no content or layout change
  is made to `app/page.tsx` or `app/projects/[slug]/page.tsx`.
- `getIntegrumCaseStudy()` deprecated wrapper remains in `lib/content/index.ts`; it is used
  by the frozen homepage and is **not** removed in Phase 4B.

---

## 3. Content Placement

| Page | Getters consumed | Empty-collection behaviour |
|---|---|---|
| `/about` | `getPublishedProfile()` `getEducation()` `getCertifications()` `getAchievements()` | Profile always renders; each other section renders only when its array is non-empty |
| `/projects` | `getPublishedProjects()` | Schema guarantees `projects.length ≥ 1`; no empty state needed |
| `/skills` | `getSkillCategories()` | Page renders with heading; no category cards appear if array is empty |
| `/experience` | `getExperiences()` | Page renders with heading; no entry cards appear if array is empty |

**Empty-collection rule (Option A):** Silently omit the heading, wrapper, anchor ID, and any
placeholder message for an empty section. Do not display text such as "No certifications
published yet." Tests must confirm empty arrays produce no corresponding heading or container.

---

## 4. Architecture

### 4.1 Component boundaries

```
Page file (app/*/page.tsx)
  └─ Calls getters from lib/content (server-only)
  └─ Calls getSeoEntryForRoute() for metadata
  └─ Owns empty-collection guard (if arr.length > 0)
  └─ Renders layout and mounts content components

Content component (components/content/*.tsx)
  └─ Pure presentational; receives typed props only
  └─ No imports from lib/content, Supabase, JSON, env vars
  └─ No "use client" directive
  └─ Assumes props are non-empty (guard lives at page level)
```

### 4.2 Date formatting utility

A new server-safe utility `lib/utils/format.ts` provides deterministic date formatting for
SSG. Components may import from `lib/utils/` — this does not violate the content-layer rule.

```ts
// lib/utils/format.ts
export function formatIsoDate(isoDate: string): string {
  const parts = isoDate.split('-');
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1; // 0-indexed
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(
    new Date(Date.UTC(year, month, 1))
  );
}
```

**Timezone safety:** Parsing as `Date.UTC(year, month, 1)` avoids the ±1-day drift that
`new Date("2024-01")` can introduce in non-UTC Node environments. The formatter runs at
SSG build time; output is baked into static HTML before any browser request.

### 4.3 React key strategy

DTOs carry no UUIDs. Composite string keys are used for React rendering. Because all pages
are pure Server Components (no client-side hydration of list items), React key collisions
produce a console warning but not a functional bug. Nevertheless, keys are constructed to be
unique using the array index as a suffix guard:

| Component | Key pattern |
|---|---|
| `ProjectCard` | `project.slug` (globally unique by superRefine) |
| `SkillCategorySection` | `category.name` (unique by superRefine) |
| Skill `<li>` inside category | `${category.name}-skill-${i}` |
| Education `<li>` | `edu-${i}` |
| Certification `<li>` | `cert-${i}` |
| Achievement `<li>` | `ach-${i}` |
| Experience card | `exp-${i}` |

### 4.4 SEO metadata pattern (all new pages)

```ts
export async function generateMetadata(): Promise<Metadata> {
  const seo = getSeoEntryForRoute('/about');
  return {
    title: seo?.title ?? 'About | Sufiyan Shaikh',
    description: seo?.description ?? '<static fallback>',
    alternates: { canonical: '/about' },
    openGraph: {
      title: seo?.title ?? 'About | Sufiyan Shaikh',
      description: seo?.description ?? '<static fallback>',
      url: '/about',
      type: 'website',
    },
  };
}
```

No build failure occurs if the snapshot has no SEO entry for a route; the fallback is a
static string literal baked at compile time. The publishable-key is never accessed in
`generateMetadata`.

### 4.5 Static generation directives (all new pages)

```ts
export const dynamic = 'error';
export const revalidate = false;
```

Non-dynamic pages do not require `generateStaticParams`.

---

## 5. New Files

### 5.1 Utility

#### [NEW] `lib/utils/format.ts`
- `formatIsoDate(isoDate: string): string` — deterministic, UTC-anchored ISO date to
  "Mon YYYY" string. No imports from lib/content or Supabase.

### 5.2 Content components (`components/content/`)

#### [NEW] `components/content/ProjectCard.tsx`
Props: `{ project: Readonly<ProjectCaseStudy> }`

Renders a single project listing card: title, subtitle (conditional), category badge, tier
badge, description (truncated at 200 chars if > 200), technology pill list, and a
"View Case Study →" link to `/projects/${project.slug}`. Uses `HudCard`.

No featuredAsset image in the listing card — keeps the listing page fast and avoids
rendering duplicate images if the project detail page is visited. The listing card is
purely textual.

#### [NEW] `components/content/SkillCategorySection.tsx`
Props: `{ category: Readonly<SkillCategory> }`

Renders one skill category with its name as a heading, then its `skills` array as a
definition-list or `<ul>` of pills showing `name` and `proficiencyLevel`. Uses `HudCard`.

#### [NEW] `components/content/EducationSection.tsx`
Props: `{ entries: ReadonlyArray<Education> }`

Renders an `<ol>` of education entries. Each entry: institution (h3), degree + fieldOfStudy,
date range (`<time>` elements), and description when present. Page guarantees
`entries.length ≥ 1`.

#### [NEW] `components/content/CertificationSection.tsx`
Props: `{ entries: ReadonlyArray<Certification> }`

Renders an `<ul>` of certification entries. Each entry: name (h3), issuingOrganization,
issueDate (`<time>` when present), and a "Verify Credential ↗" anchor when `credentialUrl`
is present. `certificateAsset` is not rendered in Phase 4B (the collections are currently
empty; image rendering can be added in a later phase when real assets exist).

#### [NEW] `components/content/AchievementSection.tsx`
Props: `{ entries: ReadonlyArray<Achievement> }`

Renders an `<ul>` of achievement entries. Each entry: title (h3), date (`<time>` when
present), and description when present. `achievementAsset` deferred to a later phase.

#### [NEW] `components/content/ExperienceSection.tsx`
Props: `{ entries: ReadonlyArray<Experience> }`

Renders chronological experience cards (sorted by `displayOrder` ascending — the snapshot
generator already sorts, but the component renders in received order). Each card: roleTitle
(h3), organization, type badge, location (conditional), date range (`<time>` elements), and
`descriptionPoints` as a `<ul>`. Uses `HudCard`.

Date range: `startDate – endDate` or `startDate – Present` when `endDate` is null.

### 5.3 Pages

#### [NEW] `app/about/page.tsx`

```
getPublishedProfile()          → always render profile block
getEducation()                 → render <EducationSection> if length > 0
getCertifications()            → render <CertificationSection> if length > 0
getAchievements()              → render <AchievementSection> if length > 0
getSeoEntryForRoute('/about')  → metadata
```

Heading hierarchy:
```
<h1>  About
<h2>  Profile             (always)
<h2>  Education           (conditional)
<h2>  Certifications      (conditional)
<h2>  Achievements        (conditional)
```

Sections use `<section aria-labelledby="about-education-heading">` etc. so screen readers
announce each region. When a section is absent, its `<section>` element is not rendered —
no empty landmark.

Profile block: fullName, professionalName, headline, bio, GitHub link, LinkedIn link
(conditional on `linkedinUrl`), email (not rendered — privacy; omit email from public
display even when present in snapshot). Avatar image rendered when `profile.avatar` is
non-null.

#### [NEW] `app/projects/page.tsx`

```
getPublishedProjects()            → render <ProjectCard> for each
getSeoEntryForRoute('/projects')  → metadata
```

Renders an ordered list of `<ProjectCard>` components. No empty-state guard needed.
Heading: `<h1>Projects</h1>`. Each card links to `/projects/[slug]`.

#### [NEW] `app/skills/page.tsx`

```
getSkillCategories()           → render <SkillCategorySection> per category
getSeoEntryForRoute('/skills') → metadata
```

Empty state: if `skillCategories.length === 0`, the page renders `<h1>` only with no cards.
No placeholder text. The page is still a valid static route.

#### [NEW] `app/experience/page.tsx`

```
getExperiences()                   → render <ExperienceSection> if length > 0
getSeoEntryForRoute('/experience') → metadata
```

Empty state: if `experiences.length === 0`, the page renders `<h1>` only. The
`ExperienceSection` component is not mounted. No placeholder text.

### 5.4 Header update

#### [MODIFY] `components/shell/Header.tsx`

Replace:
```
Home          /
Featured Project  /projects/integrum
GitHub ↗      external
```

With:
```
Home          /
About         /about
Projects      /projects
Skills        /skills
Experience    /experience
GitHub ↗      external
```

All new `<Link>` elements carry identical focus/hover/min-height Tailwind classes as
existing links. No new CSS introduced.

---

## 6. Test Plan

### 6.1 Vitest — Component unit tests (`__tests__/components/`)

Each component test uses `@testing-library/react` + `jsdom`. The `server-only` mock
already registered in `vitest.config.mts` applies.

#### [NEW] `__tests__/components/ProjectCard.test.tsx`
- Renders title, description, technologies.
- Renders subtitle when present; absent when null.
- "View Case Study" link href is `/projects/${slug}`.

#### [NEW] `__tests__/components/SkillCategorySection.test.tsx`
- Renders category name as heading.
- Renders all skills with proficiency level.

#### [NEW] `__tests__/components/EducationSection.test.tsx`
- Renders institution and degree for each entry.
- Renders `<time>` elements for startDate/endDate.
- Omits date when `startDate` is null.
- Renders description when present; absent when null.

#### [NEW] `__tests__/components/CertificationSection.test.tsx`
- Renders name and organization for each entry.
- Renders "Verify Credential" link when `credentialUrl` present; absent when null.
- Renders `<time>` for issueDate when present.

#### [NEW] `__tests__/components/AchievementSection.test.tsx`
- Renders title for each entry.
- Renders description when present.
- Renders `<time>` for date when present.

#### [NEW] `__tests__/components/ExperienceSection.test.tsx`
- Renders roleTitle and organization.
- Renders location when present; absent when null.
- Renders each `descriptionPoint` as a list item.
- "Present" appears when `endDate` is null.

### 6.2 Vitest — Route-level page tests (`__tests__/routes/`)

Each route test mocks `@/lib/content` via `vi.mock` and renders the page Server Component.

> **Mocking note**: `lib/content/index.ts` is `server-only`. The existing
> `__mocks__/server-only.ts` stub satisfies the `import 'server-only'` call in tests.
> Page tests `vi.mock('@/lib/content', ...)` with typed return values.

#### [NEW] `__tests__/routes/about.test.tsx`
- Profile always renders (full name, headline, bio visible).
- Education `<section>` absent when `getEducation()` returns `[]`.
- Education `<section>` present when `getEducation()` returns one entry.
- Same guard tests for Certifications and Achievements.
- No "No X published yet" text appears in any case.
- Email field not rendered (privacy rule).

#### [NEW] `__tests__/routes/projects-listing.test.tsx`
- All project titles from `getPublishedProjects()` are rendered.
- Each card links to the correct `/projects/[slug]`.

#### [NEW] `__tests__/routes/skills.test.tsx`
- Category names render when `getSkillCategories()` is non-empty.
- No error thrown; page renders `<h1>` when collection is empty.

#### [NEW] `__tests__/routes/experience.test.tsx`
- Experience entries render when `getExperiences()` is non-empty.
- No error thrown; page renders `<h1>` when collection is empty.

### 6.3 Exit gate probes (`scripts/verify-exit-gate.mjs`)

Add four HTTP probes immediately after the existing probes:

```js
// /about
const aboutRes = await fetch(`${BASE_URL}/about`);
if (aboutRes.status !== 200) throw new Error(`Expected 200 for /about, got ${aboutRes.status}`);
const aboutHtml = await aboutRes.text();
if (!aboutHtml.includes('Sufiyan Shaikh')) throw new Error('/about HTML missing profile name.');

// /projects
const projectsRes = await fetch(`${BASE_URL}/projects`);
if (projectsRes.status !== 200) throw new Error(`Expected 200 for /projects, got ${projectsRes.status}`);

// /skills
const skillsRes = await fetch(`${BASE_URL}/skills`);
if (skillsRes.status !== 200) throw new Error(`Expected 200 for /skills, got ${skillsRes.status}`);

// /experience
const experienceRes = await fetch(`${BASE_URL}/experience`);
if (experienceRes.status !== 200) throw new Error(`Expected 200 for /experience, got ${experienceRes.status}`);
```

Update the banner from "Phase 4A" to "Phase 4B" in both the success and failure messages.

### 6.4 Playwright E2E (`e2e/browser-exit-gate.spec.ts`)

Add to the existing "Network & JS Isolation" describe block:

```
test: new pages return HTTP 200 with JS enabled
  - /about → 200, contains profile full name
  - /projects → 200, contains at least one project title
  - /skills → 200
  - /experience → 200
  - Zero Supabase network requests on any new page

test: new pages functional with JavaScript disabled
  - /about → h1 visible, profile bio visible
  - /projects → h1 visible, project title visible
  - /skills → h1 visible
  - /experience → h1 visible
  - Navigation links visible and operable on each page

test: no horizontal overflow on new pages at standard viewports
  (mirror existing viewport loop; add /about and /projects)
```

---

## 7. Accessibility Requirements

| Requirement | Implementation |
|---|---|
| Landmark regions | Each content section is a `<section aria-labelledby>` pointing to its heading |
| Heading hierarchy | `h1` → page title; `h2` → section heading; `h3` → entry title (institution, role, etc.) |
| Dates | `<time datetime="YYYY-MM">` wraps formatted date strings |
| External links | `target="_blank"` links carry `rel="noopener noreferrer"` and `aria-label="... (opens in new tab)"` |
| Minimum tap target | All interactive elements carry `min-h-[44px]` |
| Decorative images | Avatar alt text from DTO (`altText` field, validated non-empty by schema) |
| Navigation active state | Not required for Phase 4B (static links; no active-route tracking without client code) |
| `<main id="main-content" tabIndex={-1}>` | Each page root uses this pattern, matching existing pages |

---

## 8. Privacy Rule

`profile.email` is present in the snapshot but **must not be rendered on any public page**.
The field exists for admin tooling. Phase 4B public pages render `profile.githubUrl`,
`profile.linkedinUrl` (conditional), name, headline, and bio — nothing else from profile.

---

## 9. Verification Gate

The Phase 4B exit gate passes when all of the following succeed in a single local run:

1. `npm.cmd run lint` — 0 errors, 0 warnings
2. `npm.cmd run type-check` — 0 errors
3. `npm.cmd test` — all Vitest tests pass (≥ 82 + new tests)
4. `npm.cmd run build:next` — static build succeeds; 4 new routes generated
5. `npm.cmd run verify:gate` — HTTP probes pass, canary scan clean, Playwright passes

---

## 10. Files Changed Summary

| Status | File |
|---|---|
| NEW | `lib/utils/format.ts` |
| NEW | `components/content/ProjectCard.tsx` |
| NEW | `components/content/SkillCategorySection.tsx` |
| NEW | `components/content/EducationSection.tsx` |
| NEW | `components/content/CertificationSection.tsx` |
| NEW | `components/content/AchievementSection.tsx` |
| NEW | `components/content/ExperienceSection.tsx` |
| NEW | `app/about/page.tsx` |
| NEW | `app/projects/page.tsx` |
| NEW | `app/skills/page.tsx` |
| NEW | `app/experience/page.tsx` |
| NEW | `__tests__/components/ProjectCard.test.tsx` |
| NEW | `__tests__/components/SkillCategorySection.test.tsx` |
| NEW | `__tests__/components/EducationSection.test.tsx` |
| NEW | `__tests__/components/CertificationSection.test.tsx` |
| NEW | `__tests__/components/AchievementSection.test.tsx` |
| NEW | `__tests__/components/ExperienceSection.test.tsx` |
| NEW | `__tests__/routes/about.test.tsx` |
| NEW | `__tests__/routes/projects-listing.test.tsx` |
| NEW | `__tests__/routes/skills.test.tsx` |
| NEW | `__tests__/routes/experience.test.tsx` |
| MODIFY | `components/shell/Header.tsx` |
| MODIFY | `scripts/verify-exit-gate.mjs` |
| MODIFY | `e2e/browser-exit-gate.spec.ts` |

24 file operations total (21 new, 3 modified). No files deleted.

---

## 11. Out of Scope for Phase 4B

- Removing `getIntegrumCaseStudy()` (used by frozen homepage).
- Rendering `certificateAsset` images (certifications collection is currently empty).
- Rendering `achievementAsset` images (achievements collection is currently empty).
- `/contact` page (Phase 4E).
- Remote database provisioning or Vercel environment variable changes.
- Resume download functionality (Phase 4D or later).
- Admin dashboard.
- WebGL, Three.js, GSAP, or any animation library.
