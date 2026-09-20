# Phase 4B — Public Content Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate all remaining Phase 4A snapshot entities into four new statically-generated public pages (`/about`, `/projects`, `/skills`, `/experience`), add six new presentational content components, update the site navigation, and extend the verification gate.

**Architecture:** Page files own getter calls, SEO metadata, and empty-collection guards; pure presentational `components/content/` components receive typed DTO props only. All pages use `export const dynamic = 'error'` + `export const revalidate = false`. A shared `lib/utils/format.ts` utility handles deterministic ISO-date formatting at SSG time.

**Tech Stack:** Next.js 16 (App Router, Server Components only), React 19, TypeScript 5, Tailwind CSS 4, Zod 3, Vitest 4, @testing-library/react, Playwright.

## Global Constraints

- Windows PowerShell: always `npm.cmd` and `npx.cmd` — never bare `npm`/`npx`.
- `export const dynamic = 'error'` and `export const revalidate = false` on every new page.
- No `"use client"` in any file created or modified by Phase 4B.
- No imports of `lib/content`, Supabase, generated JSON, or `process.env` inside `components/content/` files.
- `profile.email` must not be rendered on any public page.
- Empty collections: silently omit heading, wrapper, anchor, and placeholder — no "Not yet" messages.
- CSS `line-clamp-3` for description overflow in `ProjectCard`; never slice strings.
- `<time dateTime={isoDate}>` wraps every formatted date; `dateTime` attribute holds the raw ISO value.
- List semantics: every `<ol>`/`<ul>` child is an `<li>`; no bare component children inside list elements.
- Heading hierarchy: page `<h1>` → section `<h2>` (for top-level sections and standalone items like project titles / category titles) → entry `<h3>` (institution, role, cert name, achievement title inside About/Experience).
- No commits until all verification gates in Task 7 pass.
- Final verification command: `npm.cmd run build` (runs `snapshot:public` + `build:next`).
- Phase 4A files `app/page.tsx` and `app/projects/[slug]/page.tsx` must not be modified.
- `getIntegrumCaseStudy()` deprecated wrapper stays in `lib/content/index.ts`.

---

## Task 1: Date Formatting Utility

**Files:**
- Create: `lib/utils/format.ts`
- Create: `__tests__/utils/format.test.ts`

**Interfaces:**
- Produces: `formatIsoDate(isoDate: string): string` — converts `"YYYY-MM-DD"` to `"Mon YYYY"` (e.g. `"Jan 2024"`). UTC-anchored to avoid timezone drift in Node SSG builds.

- [ ] **Step 1: Write the failing test**

```ts
// __tests__/utils/format.test.ts
import { describe, it, expect } from 'vitest';
import { formatIsoDate } from '@/lib/utils/format';

describe('formatIsoDate', () => {
  it('formats a mid-year date correctly', () => {
    expect(formatIsoDate('2024-06-15')).toBe('Jun 2024');
  });

  it('formats a January date without timezone drift', () => {
    // "2024-01-01" must not shift to Dec 2023 in any timezone
    expect(formatIsoDate('2024-01-01')).toBe('Jan 2024');
  });

  it('formats a December date without timezone drift', () => {
    expect(formatIsoDate('2023-12-31')).toBe('Dec 2023');
  });

  it('ignores the day component and formats by month and year only', () => {
    expect(formatIsoDate('2022-03-01')).toBe('Mar 2022');
    expect(formatIsoDate('2022-03-31')).toBe('Mar 2022');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/utils/format.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/utils/format'`

- [ ] **Step 3: Implement the utility**

```ts
// lib/utils/format.ts

/**
 * Formats a YYYY-MM-DD ISO date string as "Mon YYYY" (e.g. "Jan 2024").
 *
 * Parses the date components directly and constructs a UTC midnight instant
 * to prevent timezone-induced day drift in non-UTC Node environments during
 * static site generation.
 */
export function formatIsoDate(isoDate: string): string {
  const [yearStr, monthStr] = isoDate.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr) - 1; // Intl month is 0-indexed
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month, 1)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

```powershell
npm.cmd test -- --reporter=verbose __tests__/utils/format.test.ts
```

Expected: 4/4 PASS

---

## Task 2: Presentational Content Components

**Files:**
- Create: `components/content/ProjectCard.tsx`
- Create: `components/content/SkillCategorySection.tsx`
- Create: `components/content/EducationSection.tsx`
- Create: `components/content/CertificationSection.tsx`
- Create: `components/content/AchievementSection.tsx`
- Create: `components/content/ExperienceSection.tsx`
- Create: `__tests__/components/ProjectCard.test.tsx`
- Create: `__tests__/components/SkillCategorySection.test.tsx`
- Create: `__tests__/components/EducationSection.test.tsx`
- Create: `__tests__/components/CertificationSection.test.tsx`
- Create: `__tests__/components/AchievementSection.test.tsx`
- Create: `__tests__/components/ExperienceSection.test.tsx`

**Interfaces:**
- Consumes: `formatIsoDate` from `@/lib/utils/format` (Task 1)
- Consumes: `HudCard` from `@/components/ui/HudCard`, `HudButton` from `@/components/ui/HudButton`
- Consumes types: `ProjectCaseStudy`, `SkillCategory`, `Education`, `Certification`, `Achievement`, `Experience` from `@/lib/types/content`
- Produces: six exported React components used by pages in Tasks 3–6

---

### 2a: ProjectCard

- [ ] **Step 2a-1: Write failing tests**

```tsx
// __tests__/components/ProjectCard.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProjectCard } from '@/components/content/ProjectCard';
import type { ProjectCaseStudy } from '@/lib/types/content';

const baseProject: ProjectCaseStudy = {
  slug: 'test-project',
  title: 'Test Project',
  subtitle: 'A subtitle',
  category: 'Full-Stack',
  tier: 'featured',
  description: 'A project description for testing.',
  problemStatement: null,
  architectureOverview: null,
  keyFeatures: null,
  technologies: ['TypeScript', 'Next.js'],
  featuredAsset: null,
  demoUrl: null,
  githubUrl: null,
  displayOrder: 0,
  sections: [],
};

describe('ProjectCard', () => {
  it('renders title as h2', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByRole('heading', { level: 2, name: /test project/i })).toBeInTheDocument();
  });

  it('renders description text', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText(/a project description/i)).toBeInTheDocument();
  });

  it('renders all technologies as list items', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Next.js')).toBeInTheDocument();
  });

  it('links to /projects/[slug]', () => {
    render(<ProjectCard project={baseProject} />);
    const link = screen.getByRole('link', { name: /view case study/i });
    expect(link).toHaveAttribute('href', '/projects/test-project');
  });

  it('renders subtitle when present', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText('A subtitle')).toBeInTheDocument();
  });

  it('does not render subtitle when null', () => {
    render(<ProjectCard project={{ ...baseProject, subtitle: null }} />);
    expect(screen.queryByText('A subtitle')).not.toBeInTheDocument();
  });

  it('renders category and tier badges', () => {
    render(<ProjectCard project={baseProject} />);
    expect(screen.getByText(/full-stack/i)).toBeInTheDocument();
    expect(screen.getByText(/featured/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2a-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/ProjectCard.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 2a-3: Implement ProjectCard**

```tsx
// components/content/ProjectCard.tsx
import type { ProjectCaseStudy } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import Link from 'next/link';

interface ProjectCardProps {
  project: Readonly<ProjectCaseStudy>;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <HudCard className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="font-display text-xl font-bold text-white">
          {project.title}
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono uppercase tracking-wider text-gray-400">
            [ {project.category} ]
          </span>
          <span className="px-2 py-0.5 text-xs font-mono uppercase bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan rounded">
            {project.tier}
          </span>
        </div>
      </div>

      {project.subtitle && (
        <p className="text-sm font-medium text-neon-cyan/80">{project.subtitle}</p>
      )}

      <p className="font-sans text-sm text-gray-300 leading-relaxed line-clamp-3">
        {project.description}
      </p>

      <div>
        <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-2">
          Technologies
        </h3>
        <ul className="flex flex-wrap gap-2" aria-label={`${project.title} technologies`}>
          {project.technologies.map((tech, i) => (
            <li
              key={`${project.slug}-tech-${i}`}
              className="px-2.5 py-1 text-xs font-mono bg-white/5 border border-white/10 rounded text-gray-300"
            >
              {tech}
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-2">
        <Link
          href={`/projects/${project.slug}`}
          className="inline-flex items-center gap-2 text-sm font-mono text-neon-cyan hover:text-white transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-sm min-h-[44px] px-1"
        >
          View Case Study →
        </Link>
      </div>
    </HudCard>
  );
}
```

- [ ] **Step 2a-4: Run tests to verify they pass**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/ProjectCard.test.tsx
```

Expected: 7/7 PASS

---

### 2b: SkillCategorySection

- [ ] **Step 2b-1: Write failing tests**

```tsx
// __tests__/components/SkillCategorySection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkillCategorySection } from '@/components/content/SkillCategorySection';
import type { SkillCategory } from '@/lib/types/content';

const category: SkillCategory = {
  name: 'Frontend',
  displayOrder: 0,
  skills: [
    { name: 'React', proficiencyLevel: 'Advanced', iconIdentifier: null, displayOrder: 0 },
    { name: 'TypeScript', proficiencyLevel: 'Intermediate', iconIdentifier: null, displayOrder: 1 },
  ],
};

describe('SkillCategorySection', () => {
  it('renders category name as h2', () => {
    render(<SkillCategorySection category={category} />);
    expect(screen.getByRole('heading', { level: 2, name: /frontend/i })).toBeInTheDocument();
  });

  it('renders all skill names', () => {
    render(<SkillCategorySection category={category} />);
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('renders proficiency levels', () => {
    render(<SkillCategorySection category={category} />);
    expect(screen.getByText('Advanced')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2b-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/SkillCategorySection.test.tsx
```

- [ ] **Step 2b-3: Implement SkillCategorySection**

```tsx
// components/content/SkillCategorySection.tsx
import type { SkillCategory } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';

interface SkillCategorySectionProps {
  category: Readonly<SkillCategory>;
}

export function SkillCategorySection({ category }: SkillCategorySectionProps) {
  return (
    <HudCard>
      <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-neon-cyan text-sm">◈</span>
        {category.name}
      </h2>
      <ul className="flex flex-wrap gap-3" aria-label={`${category.name} skills`}>
        {category.skills.map((skill, i) => (
          <li
            key={`${category.name}-skill-${i}`}
            className="flex flex-col gap-0.5 px-3 py-2 bg-white/5 border border-white/10 rounded min-w-[100px]"
          >
            <span className="text-sm font-medium text-gray-200">{skill.name}</span>
            <span className="text-xs font-mono text-neon-cyan/70">{skill.proficiencyLevel}</span>
          </li>
        ))}
      </ul>
    </HudCard>
  );
}
```

- [ ] **Step 2b-4: Run tests to verify they pass**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/SkillCategorySection.test.tsx
```

Expected: 3/3 PASS

---

### 2c: EducationSection

- [ ] **Step 2c-1: Write failing tests**

```tsx
// __tests__/components/EducationSection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { EducationSection } from '@/components/content/EducationSection';
import type { Education } from '@/lib/types/content';

const entries: Education[] = [
  {
    institution: 'MIT',
    degree: 'B.Sc. Computer Science',
    fieldOfStudy: 'AI',
    startDate: '2020-09-01',
    endDate: '2024-06-30',
    description: 'Specialisation in machine learning.',
  },
  {
    institution: 'Online Academy',
    degree: 'Diploma in Web Dev',
    fieldOfStudy: null,
    startDate: null,
    endDate: null,
    description: null,
  },
];

describe('EducationSection', () => {
  it('renders both institutions', () => {
    render(<EducationSection entries={entries} />);
    expect(screen.getByText('MIT')).toBeInTheDocument();
    expect(screen.getByText('Online Academy')).toBeInTheDocument();
  });

  it('renders degree titles as h3', () => {
    render(<EducationSection entries={entries} />);
    expect(screen.getByRole('heading', { level: 3, name: /b\.sc\. computer science/i })).toBeInTheDocument();
  });

  it('renders fieldOfStudy when present', () => {
    render(<EducationSection entries={entries} />);
    expect(screen.getByText(/ai/i)).toBeInTheDocument();
  });

  it('renders description when present', () => {
    render(<EducationSection entries={entries} />);
    expect(screen.getByText(/specialisation in machine learning/i)).toBeInTheDocument();
  });

  it('renders time elements with dateTime attribute for present dates', () => {
    render(<EducationSection entries={entries} />);
    const times = screen.getAllByRole('time' as never);
    // MIT entry has startDate and endDate; Online Academy has none
    expect(times.length).toBeGreaterThanOrEqual(2);
    expect(times[0]).toHaveAttribute('dateTime', '2020-09-01');
  });

  it('omits time elements when dates are null', () => {
    render(<EducationSection entries={[entries[1]!]} />);
    expect(screen.queryByRole('time' as never)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2c-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/EducationSection.test.tsx
```

- [ ] **Step 2c-3: Implement EducationSection**

```tsx
// components/content/EducationSection.tsx
import type { Education } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface EducationSectionProps {
  entries: ReadonlyArray<Education>;
}

export function EducationSection({ entries }: EducationSectionProps) {
  return (
    <ol className="flex flex-col gap-4 list-none">
      {entries.map((entry, i) => (
        <li key={`edu-${i}`}>
          <HudCard>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {entry.degree}
                    {entry.fieldOfStudy && (
                      <span className="text-neon-cyan/80 font-normal"> — {entry.fieldOfStudy}</span>
                    )}
                  </h3>
                  <p className="text-sm font-medium text-gray-400 mt-0.5">{entry.institution}</p>
                </div>

                {(entry.startDate || entry.endDate) && (
                  <p className="text-xs font-mono text-gray-500 shrink-0">
                    {entry.startDate && (
                      <time dateTime={entry.startDate}>{formatIsoDate(entry.startDate)}</time>
                    )}
                    {entry.startDate && entry.endDate && (
                      <span> – </span>
                    )}
                    {entry.endDate && (
                      <time dateTime={entry.endDate}>{formatIsoDate(entry.endDate)}</time>
                    )}
                  </p>
                )}
              </div>

              {entry.description && (
                <p className="text-sm text-gray-300 leading-relaxed mt-1">{entry.description}</p>
              )}
            </div>
          </HudCard>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 2c-4: Run tests to verify they pass**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/EducationSection.test.tsx
```

Expected: 6/6 PASS

---

### 2d: CertificationSection

- [ ] **Step 2d-1: Write failing tests**

```tsx
// __tests__/components/CertificationSection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CertificationSection } from '@/components/content/CertificationSection';
import type { Certification } from '@/lib/types/content';

const entries: Certification[] = [
  {
    name: 'AWS Solutions Architect',
    issuingOrganization: 'Amazon Web Services',
    issueDate: '2023-04-01',
    credentialUrl: 'https://example.com/verify/123',
    certificateAsset: null,
  },
  {
    name: 'Google Cloud Associate',
    issuingOrganization: 'Google',
    issueDate: null,
    credentialUrl: null,
    certificateAsset: null,
  },
];

describe('CertificationSection', () => {
  it('renders certification names as h3', () => {
    render(<CertificationSection entries={entries} />);
    expect(screen.getByRole('heading', { level: 3, name: /aws solutions architect/i })).toBeInTheDocument();
  });

  it('renders issuing organizations', () => {
    render(<CertificationSection entries={entries} />);
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('renders time element with dateTime when issueDate present', () => {
    render(<CertificationSection entries={entries} />);
    const time = screen.getByRole('time' as never);
    expect(time).toHaveAttribute('dateTime', '2023-04-01');
    expect(time).toHaveTextContent('Apr 2023');
  });

  it('renders verify credential link when credentialUrl present', () => {
    render(<CertificationSection entries={entries} />);
    const link = screen.getByRole('link', { name: /verify credential/i });
    expect(link).toHaveAttribute('href', 'https://example.com/verify/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits verify link when credentialUrl is null', () => {
    render(<CertificationSection entries={[entries[1]!]} />);
    expect(screen.queryByRole('link', { name: /verify credential/i })).not.toBeInTheDocument();
  });

  it('omits time element when issueDate is null', () => {
    render(<CertificationSection entries={[entries[1]!]} />);
    expect(screen.queryByRole('time' as never)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2d-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/CertificationSection.test.tsx
```

- [ ] **Step 2d-3: Implement CertificationSection**

```tsx
// components/content/CertificationSection.tsx
import type { Certification } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface CertificationSectionProps {
  entries: ReadonlyArray<Certification>;
}

export function CertificationSection({ entries }: CertificationSectionProps) {
  return (
    <ul className="flex flex-col gap-4 list-none">
      {entries.map((entry, i) => (
        <li key={`cert-${i}`}>
          <HudCard>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{entry.name}</h3>
                  <p className="text-sm font-medium text-gray-400 mt-0.5">{entry.issuingOrganization}</p>
                </div>

                {entry.issueDate && (
                  <time
                    dateTime={entry.issueDate}
                    className="text-xs font-mono text-gray-500 shrink-0"
                  >
                    {formatIsoDate(entry.issueDate)}
                  </time>
                )}
              </div>

              {entry.credentialUrl && (
                <a
                  href={entry.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Verify ${entry.name} credential (opens in new tab)`}
                  className="inline-flex items-center gap-1 text-sm font-mono text-neon-cyan hover:text-white transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-sm min-h-[44px]"
                >
                  Verify Credential ↗
                </a>
              )}
            </div>
          </HudCard>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2d-4: Run tests to verify they pass**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/CertificationSection.test.tsx
```

Expected: 6/6 PASS

---

### 2e: AchievementSection

- [ ] **Step 2e-1: Write failing tests**

```tsx
// __tests__/components/AchievementSection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AchievementSection } from '@/components/content/AchievementSection';
import type { Achievement } from '@/lib/types/content';

const entries: Achievement[] = [
  {
    title: 'Hackathon Winner',
    date: '2023-11-01',
    description: 'First place at the 2023 University Hackathon.',
    achievementAsset: null,
  },
  {
    title: 'Dean\'s List',
    date: null,
    description: null,
    achievementAsset: null,
  },
];

describe('AchievementSection', () => {
  it('renders achievement titles as h3', () => {
    render(<AchievementSection entries={entries} />);
    expect(screen.getByRole('heading', { level: 3, name: /hackathon winner/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /dean's list/i })).toBeInTheDocument();
  });

  it('renders time element with dateTime when date is present', () => {
    render(<AchievementSection entries={entries} />);
    const time = screen.getByRole('time' as never);
    expect(time).toHaveAttribute('dateTime', '2023-11-01');
    expect(time).toHaveTextContent('Nov 2023');
  });

  it('renders description when present', () => {
    render(<AchievementSection entries={entries} />);
    expect(screen.getByText(/first place at the 2023/i)).toBeInTheDocument();
  });

  it('omits time and description when null', () => {
    render(<AchievementSection entries={[entries[1]!]} />);
    expect(screen.queryByRole('time' as never)).not.toBeInTheDocument();
    expect(screen.queryByText(/first place/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2e-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/AchievementSection.test.tsx
```

- [ ] **Step 2e-3: Implement AchievementSection**

```tsx
// components/content/AchievementSection.tsx
import type { Achievement } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface AchievementSectionProps {
  entries: ReadonlyArray<Achievement>;
}

export function AchievementSection({ entries }: AchievementSectionProps) {
  return (
    <ul className="flex flex-col gap-4 list-none">
      {entries.map((entry, i) => (
        <li key={`ach-${i}`}>
          <HudCard>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white">{entry.title}</h3>
              {entry.date && (
                <time
                  dateTime={entry.date}
                  className="text-xs font-mono text-gray-500 shrink-0"
                >
                  {formatIsoDate(entry.date)}
                </time>
              )}
            </div>
            {entry.description && (
              <p className="text-sm text-gray-300 leading-relaxed mt-2">{entry.description}</p>
            )}
          </HudCard>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2e-4: Run tests to verify they pass**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/AchievementSection.test.tsx
```

Expected: 4/4 PASS

---

### 2f: ExperienceSection

- [ ] **Step 2f-1: Write failing tests**

```tsx
// __tests__/components/ExperienceSection.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExperienceSection } from '@/components/content/ExperienceSection';
import type { Experience } from '@/lib/types/content';

const entries: Experience[] = [
  {
    organization: 'Acme Corp',
    roleTitle: 'Software Engineer Intern',
    type: 'Internship',
    location: 'Remote',
    startDate: '2023-06-01',
    endDate: '2023-08-31',
    descriptionPoints: ['Built a REST API.', 'Improved test coverage by 20%.'],
    displayOrder: 0,
  },
  {
    organization: 'Open Source Project',
    roleTitle: 'Contributor',
    type: 'Volunteer',
    location: null,
    startDate: '2024-01-01',
    endDate: null,
    descriptionPoints: ['Contributed bug fixes.'],
    displayOrder: 1,
  },
];

describe('ExperienceSection', () => {
  it('renders role titles as h3', () => {
    render(<ExperienceSection entries={entries} />);
    expect(screen.getByRole('heading', { level: 3, name: /software engineer intern/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /contributor/i })).toBeInTheDocument();
  });

  it('renders organization names', () => {
    render(<ExperienceSection entries={entries} />);
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Open Source Project')).toBeInTheDocument();
  });

  it('renders location when present', () => {
    render(<ExperienceSection entries={entries} />);
    expect(screen.getByText('Remote')).toBeInTheDocument();
  });

  it('omits location when null', () => {
    render(<ExperienceSection entries={[entries[1]!]} />);
    expect(screen.queryByText('Remote')).not.toBeInTheDocument();
  });

  it('renders description points as list items', () => {
    render(<ExperienceSection entries={entries} />);
    expect(screen.getByText('Built a REST API.')).toBeInTheDocument();
    expect(screen.getByText('Improved test coverage by 20%.')).toBeInTheDocument();
  });

  it('shows "Present" when endDate is null', () => {
    render(<ExperienceSection entries={entries} />);
    expect(screen.getByText('Present')).toBeInTheDocument();
  });

  it('renders time elements with dateTime attributes', () => {
    render(<ExperienceSection entries={entries} />);
    const times = screen.getAllByRole('time' as never);
    const dateTimes = times.map((t) => t.getAttribute('dateTime'));
    expect(dateTimes).toContain('2023-06-01');
    expect(dateTimes).toContain('2023-08-31');
    expect(dateTimes).toContain('2024-01-01');
  });
});
```

- [ ] **Step 2f-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/ExperienceSection.test.tsx
```

- [ ] **Step 2f-3: Implement ExperienceSection**

```tsx
// components/content/ExperienceSection.tsx
import type { Experience } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface ExperienceSectionProps {
  entries: ReadonlyArray<Experience>;
}

export function ExperienceSection({ entries }: ExperienceSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, i) => (
        <HudCard key={`exp-${i}`}>
          <div className="flex flex-col gap-3">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-white">{entry.roleTitle}</h3>
                <p className="text-sm font-medium text-gray-400 mt-0.5">
                  {entry.organization}
                  {entry.location && (
                    <span className="text-gray-500"> · {entry.location}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="px-2 py-0.5 text-xs font-mono uppercase bg-white/5 border border-white/10 text-gray-400 rounded">
                  {entry.type}
                </span>
                <p className="text-xs font-mono text-gray-500">
                  <time dateTime={entry.startDate}>{formatIsoDate(entry.startDate)}</time>
                  <span> – </span>
                  {entry.endDate ? (
                    <time dateTime={entry.endDate}>{formatIsoDate(entry.endDate)}</time>
                  ) : (
                    <span>Present</span>
                  )}
                </p>
              </div>
            </div>

            {/* Description points */}
            {entry.descriptionPoints.length > 0 && (
              <ul className="flex flex-col gap-1.5 pl-4 list-disc marker:text-neon-cyan/50">
                {entry.descriptionPoints.map((point, j) => (
                  <li key={`exp-${i}-pt-${j}`} className="text-sm text-gray-300 leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </HudCard>
      ))}
    </div>
  );
}
```

- [ ] **Step 2f-4: Run all component tests together**

```powershell
npm.cmd test -- --reporter=verbose __tests__/components/
```

Expected: all component tests PASS (ProjectCard 7, SkillCategorySection 3, EducationSection 6, CertificationSection 6, AchievementSection 4, ExperienceSection 7 = 33 total)

---

## Task 3: `/about` Page

**Files:**
- Create: `app/about/page.tsx`
- Create: `__tests__/routes/about.test.tsx`

**Interfaces:**
- Consumes: `getPublishedProfile`, `getEducation`, `getCertifications`, `getAchievements`, `getSeoEntryForRoute` from `@/lib/content`
- Consumes: `EducationSection`, `CertificationSection`, `AchievementSection` from `@/components/content/`

- [ ] **Step 3-1: Write failing route test**

```tsx
// __tests__/routes/about.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Profile, Education, Certification, Achievement } from '@/lib/types/content';

// Mock lib/content before importing the page
vi.mock('@/lib/content', () => ({
  getPublishedProfile: vi.fn(),
  getEducation: vi.fn(),
  getCertifications: vi.fn(),
  getAchievements: vi.fn(),
  getSeoEntryForRoute: vi.fn().mockReturnValue(null),
}));

import * as content from '@/lib/content';
import AboutPage from '@/app/about/page';

const mockProfile: Profile = {
  fullName: 'Sufiyan Shaikh',
  professionalName: 'Sufiyan Shaikh',
  headline: 'Computer Science Student | Building Intelligent Software',
  bio: 'Passionate about AI and software engineering.',
  githubUrl: 'https://github.com/sufiyanshaikh06',
  linkedinUrl: 'https://linkedin.com/in/sufiyanshaikh06',
  email: 'sufiyan@example.com',
  avatar: null,
};

const mockEducation: Education[] = [
  {
    institution: 'Test University',
    degree: 'B.Sc. Computer Science',
    fieldOfStudy: 'AI',
    startDate: '2020-09-01',
    endDate: '2024-06-30',
    description: null,
  },
];

const mockCert: Certification[] = [
  {
    name: 'AWS Cert',
    issuingOrganization: 'AWS',
    issueDate: null,
    credentialUrl: null,
    certificateAsset: null,
  },
];

const mockAchievement: Achievement[] = [
  {
    title: 'Hackathon Winner',
    date: null,
    description: null,
    achievementAsset: null,
  },
];

beforeEach(() => {
  vi.mocked(content.getPublishedProfile).mockReturnValue(mockProfile);
  vi.mocked(content.getEducation).mockReturnValue([]);
  vi.mocked(content.getCertifications).mockReturnValue([]);
  vi.mocked(content.getAchievements).mockReturnValue([]);
});

describe('About Page', () => {
  it('always renders the profile section with h1', () => {
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 1, name: /about/i })).toBeInTheDocument();
    expect(screen.getByText('Passionate about AI and software engineering.')).toBeInTheDocument();
    expect(screen.getByText('Computer Science Student | Building Intelligent Software')).toBeInTheDocument();
  });

  it('does not render email address on the public page', () => {
    render(<AboutPage />);
    expect(screen.queryByText('sufiyan@example.com')).not.toBeInTheDocument();
  });

  it('renders GitHub link from profile', () => {
    render(<AboutPage />);
    const gh = screen.getByRole('link', { name: /github/i });
    expect(gh).toHaveAttribute('href', 'https://github.com/sufiyanshaikh06');
  });

  it('renders LinkedIn link when present in profile', () => {
    render(<AboutPage />);
    const li = screen.getByRole('link', { name: /linkedin/i });
    expect(li).toHaveAttribute('href', 'https://linkedin.com/in/sufiyanshaikh06');
  });

  it('omits LinkedIn link when profile.linkedinUrl is null', () => {
    vi.mocked(content.getPublishedProfile).mockReturnValueOnce({ ...mockProfile, linkedinUrl: null });
    render(<AboutPage />);
    expect(screen.queryByRole('link', { name: /linkedin/i })).not.toBeInTheDocument();
  });

  it('does not render education heading when education array is empty', () => {
    render(<AboutPage />);
    expect(screen.queryByRole('heading', { name: /education/i })).not.toBeInTheDocument();
  });

  it('renders education heading and section when education is non-empty', () => {
    vi.mocked(content.getEducation).mockReturnValueOnce(mockEducation);
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 2, name: /education/i })).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
  });

  it('does not render certifications heading when certifications array is empty', () => {
    render(<AboutPage />);
    expect(screen.queryByRole('heading', { name: /certifications/i })).not.toBeInTheDocument();
  });

  it('renders certifications heading and section when certifications is non-empty', () => {
    vi.mocked(content.getCertifications).mockReturnValueOnce(mockCert);
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 2, name: /certifications/i })).toBeInTheDocument();
    expect(screen.getByText('AWS Cert')).toBeInTheDocument();
  });

  it('does not render achievements heading when achievements array is empty', () => {
    render(<AboutPage />);
    expect(screen.queryByRole('heading', { name: /achievements/i })).not.toBeInTheDocument();
  });

  it('renders achievements heading and section when achievements is non-empty', () => {
    vi.mocked(content.getAchievements).mockReturnValueOnce(mockAchievement);
    render(<AboutPage />);
    expect(screen.getByRole('heading', { level: 2, name: /achievements/i })).toBeInTheDocument();
    expect(screen.getByText('Hackathon Winner')).toBeInTheDocument();
  });

  it('renders no empty-state placeholder text', () => {
    render(<AboutPage />);
    expect(screen.queryByText(/no .* published/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/about.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3-3: Implement the About page**

```tsx
// app/about/page.tsx
import type { Metadata } from 'next';
import {
  getPublishedProfile,
  getEducation,
  getCertifications,
  getAchievements,
  getSeoEntryForRoute,
} from '@/lib/content';
import { EducationSection } from '@/components/content/EducationSection';
import { CertificationSection } from '@/components/content/CertificationSection';
import { AchievementSection } from '@/components/content/AchievementSection';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/about');
  const title = seo?.title ?? 'About | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Profile, education, certifications, and achievements of Sufiyan Shaikh, Computer Science student and software engineer.';
  return {
    title,
    description,
    alternates: { canonical: '/about' },
    openGraph: { title, description, url: '/about', type: 'website' },
  };
}

export default function AboutPage() {
  const profile = getPublishedProfile();
  const education = getEducation();
  const certifications = getCertifications();
  const achievements = getAchievements();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-10">
        {/* Page heading */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="text-neon-cyan">◈</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">About</h1>
        </div>

        {/* Profile Section */}
        <section aria-labelledby="about-profile-heading">
          <h2
            id="about-profile-heading"
            className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
          >
            <span className="text-xs font-mono uppercase tracking-widest text-neon-cyan">[ Profile ]</span>
          </h2>

          <div className="flex flex-col sm:flex-row gap-6 items-start">
            {profile.avatar && (
              <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-neon-cyan/50 bg-void-black shadow-[0_0_16px_rgba(0,240,255,0.2)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={profile.avatar.localPath}
                  width={profile.avatar.width ?? undefined}
                  height={profile.avatar.height ?? undefined}
                  alt={profile.avatar.altText}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div>
                <p className="font-display text-2xl font-bold text-white">{profile.fullName}</p>
                <p className="text-sm font-medium text-neon-cyan/80 mt-0.5">{profile.headline}</p>
              </div>

              <p className="text-sm text-gray-300 leading-relaxed max-w-2xl">{profile.bio}</p>

              <div className="flex flex-wrap gap-3 mt-1">
                <a
                  href={profile.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub profile (opens in new tab)"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-white/20 text-gray-300 hover:text-neon-cyan hover:border-neon-cyan transition-colors motion-reduce:transition-none rounded-sm focus-visible:ring-2 focus-visible:ring-neon-cyan min-h-[44px]"
                >
                  GitHub ↗
                </a>
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn profile (opens in new tab)"
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono border border-white/20 text-gray-300 hover:text-neon-cyan hover:border-neon-cyan transition-colors motion-reduce:transition-none rounded-sm focus-visible:ring-2 focus-visible:ring-neon-cyan min-h-[44px]"
                  >
                    LinkedIn ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Education Section — omitted when empty */}
        {education.length > 0 && (
          <section aria-labelledby="about-education-heading">
            <h2
              id="about-education-heading"
              className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
            >
              <span className="text-neon-cyan">◈</span>
              Education
            </h2>
            <EducationSection entries={education} />
          </section>
        )}

        {/* Certifications Section — omitted when empty */}
        {certifications.length > 0 && (
          <section aria-labelledby="about-certifications-heading">
            <h2
              id="about-certifications-heading"
              className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
            >
              <span className="text-neon-cyan">◈</span>
              Certifications
            </h2>
            <CertificationSection entries={certifications} />
          </section>
        )}

        {/* Achievements Section — omitted when empty */}
        {achievements.length > 0 && (
          <section aria-labelledby="about-achievements-heading">
            <h2
              id="about-achievements-heading"
              className="font-display text-xl font-bold text-white mb-4 flex items-center gap-2"
            >
              <span className="text-neon-cyan">◈</span>
              Achievements
            </h2>
            <AchievementSection entries={achievements} />
          </section>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 3-4: Run route test to verify it passes**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/about.test.tsx
```

Expected: 12/12 PASS

---

## Task 4: `/projects` Listing Page

**Files:**
- Create: `app/projects/page.tsx`
- Create: `__tests__/routes/projects-listing.test.tsx`

**Interfaces:**
- Consumes: `getPublishedProjects`, `getSeoEntryForRoute` from `@/lib/content`
- Consumes: `ProjectCard` from `@/components/content/ProjectCard`

- [ ] **Step 4-1: Write failing route test**

```tsx
// __tests__/routes/projects-listing.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ProjectCaseStudy } from '@/lib/types/content';

vi.mock('@/lib/content', () => ({
  getPublishedProjects: vi.fn(),
  getSeoEntryForRoute: vi.fn().mockReturnValue(null),
}));

import * as content from '@/lib/content';
import ProjectsPage from '@/app/projects/page';

const mockProjects: ProjectCaseStudy[] = [
  {
    slug: 'integrum',
    title: 'Integrum',
    subtitle: 'AI Platform',
    category: 'Full-Stack',
    tier: 'featured',
    description: 'An enterprise AI platform.',
    problemStatement: null,
    architectureOverview: null,
    keyFeatures: null,
    technologies: ['Next.js', 'Python'],
    featuredAsset: null,
    demoUrl: null,
    githubUrl: null,
    displayOrder: 0,
    sections: [],
  },
  {
    slug: 'iot-temp-monitor',
    title: 'IoT Body Temperature Monitoring System',
    subtitle: null,
    category: 'IoT',
    tier: 'standard',
    description: 'A real-time IoT monitoring solution.',
    problemStatement: null,
    architectureOverview: null,
    keyFeatures: null,
    technologies: ['C++', 'MQTT'],
    featuredAsset: null,
    demoUrl: null,
    githubUrl: null,
    displayOrder: 1,
    sections: [],
  },
];

describe('Projects Listing Page', () => {
  it('renders the page h1', () => {
    vi.mocked(content.getPublishedProjects).mockReturnValue(mockProjects);
    render(<ProjectsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /projects/i })).toBeInTheDocument();
  });

  it('renders a card for each published project', () => {
    vi.mocked(content.getPublishedProjects).mockReturnValue(mockProjects);
    render(<ProjectsPage />);
    expect(screen.getByRole('heading', { level: 2, name: /integrum/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /iot body temperature/i })).toBeInTheDocument();
  });

  it('each card links to the correct project slug route', () => {
    vi.mocked(content.getPublishedProjects).mockReturnValue(mockProjects);
    render(<ProjectsPage />);
    const links = screen.getAllByRole('link', { name: /view case study/i });
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain('/projects/integrum');
    expect(hrefs).toContain('/projects/iot-temp-monitor');
  });

  it('wraps project cards in li elements inside an ol', () => {
    vi.mocked(content.getPublishedProjects).mockReturnValue(mockProjects);
    const { container } = render(<ProjectsPage />);
    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    const items = ol!.querySelectorAll(':scope > li');
    expect(items.length).toBe(2);
  });
});
```

- [ ] **Step 4-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/projects-listing.test.tsx
```

- [ ] **Step 4-3: Implement the Projects listing page**

```tsx
// app/projects/page.tsx
import type { Metadata } from 'next';
import { getPublishedProjects, getSeoEntryForRoute } from '@/lib/content';
import { ProjectCard } from '@/components/content/ProjectCard';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/projects');
  const title = seo?.title ?? 'Projects | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Published software projects by Sufiyan Shaikh, including full-stack, AI, and IoT systems.';
  return {
    title,
    description,
    alternates: { canonical: '/projects' },
    openGraph: { title, description, url: '/projects', type: 'website' },
  };
}

export default function ProjectsPage() {
  const projects = getPublishedProjects();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-8">
        {/* Page heading */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="text-neon-cyan">◈</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Projects</h1>
        </div>

        <ol className="flex flex-col gap-6 list-none">
          {projects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
```

- [ ] **Step 4-4: Run route test to verify it passes**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/projects-listing.test.tsx
```

Expected: 4/4 PASS

---

## Task 5: `/skills` Page

**Files:**
- Create: `app/skills/page.tsx`
- Create: `__tests__/routes/skills.test.tsx`

**Interfaces:**
- Consumes: `getSkillCategories`, `getSeoEntryForRoute` from `@/lib/content`
- Consumes: `SkillCategorySection` from `@/components/content/SkillCategorySection`

- [ ] **Step 5-1: Write failing route test**

```tsx
// __tests__/routes/skills.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { SkillCategory } from '@/lib/types/content';

vi.mock('@/lib/content', () => ({
  getSkillCategories: vi.fn(),
  getSeoEntryForRoute: vi.fn().mockReturnValue(null),
}));

import * as content from '@/lib/content';
import SkillsPage from '@/app/skills/page';

const mockCategories: SkillCategory[] = [
  {
    name: 'Frontend',
    displayOrder: 0,
    skills: [
      { name: 'React', proficiencyLevel: 'Advanced', iconIdentifier: null, displayOrder: 0 },
    ],
  },
  {
    name: 'Backend',
    displayOrder: 1,
    skills: [
      { name: 'Node.js', proficiencyLevel: 'Intermediate', iconIdentifier: null, displayOrder: 0 },
    ],
  },
];

describe('Skills Page', () => {
  it('renders the page h1', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue([]);
    render(<SkillsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /skills/i })).toBeInTheDocument();
  });

  it('renders category sections when skills are present', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue(mockCategories);
    render(<SkillsPage />);
    expect(screen.getByRole('heading', { level: 2, name: /frontend/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /backend/i })).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
  });

  it('renders page without errors when categories array is empty', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue([]);
    render(<SkillsPage />);
    // h1 present, no category headings
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument();
  });

  it('renders no placeholder text when categories is empty', () => {
    vi.mocked(content.getSkillCategories).mockReturnValue([]);
    render(<SkillsPage />);
    expect(screen.queryByText(/no .* published/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 5-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/skills.test.tsx
```

- [ ] **Step 5-3: Implement the Skills page**

```tsx
// app/skills/page.tsx
import type { Metadata } from 'next';
import { getSkillCategories, getSeoEntryForRoute } from '@/lib/content';
import { SkillCategorySection } from '@/components/content/SkillCategorySection';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/skills');
  const title = seo?.title ?? 'Skills | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Technical skills and proficiency levels of Sufiyan Shaikh across frontend, backend, AI, and systems engineering.';
  return {
    title,
    description,
    alternates: { canonical: '/skills' },
    openGraph: { title, description, url: '/skills', type: 'website' },
  };
}

export default function SkillsPage() {
  const skillCategories = getSkillCategories();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-8">
        {/* Page heading */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="text-neon-cyan">◈</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Skills</h1>
        </div>

        {skillCategories.length > 0 && (
          <div className="flex flex-col gap-6">
            {skillCategories.map((category) => (
              <SkillCategorySection key={category.name} category={category} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 5-4: Run route test to verify it passes**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/skills.test.tsx
```

Expected: 4/4 PASS

---

## Task 6: `/experience` Page

**Files:**
- Create: `app/experience/page.tsx`
- Create: `__tests__/routes/experience.test.tsx`

**Interfaces:**
- Consumes: `getExperiences`, `getSeoEntryForRoute` from `@/lib/content`
- Consumes: `ExperienceSection` from `@/components/content/ExperienceSection`

- [ ] **Step 6-1: Write failing route test**

```tsx
// __tests__/routes/experience.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { Experience } from '@/lib/types/content';

vi.mock('@/lib/content', () => ({
  getExperiences: vi.fn(),
  getSeoEntryForRoute: vi.fn().mockReturnValue(null),
}));

import * as content from '@/lib/content';
import ExperiencePage from '@/app/experience/page';

const mockExperiences: Experience[] = [
  {
    organization: 'Acme Corp',
    roleTitle: 'Software Engineer Intern',
    type: 'Internship',
    location: 'Remote',
    startDate: '2023-06-01',
    endDate: '2023-08-31',
    descriptionPoints: ['Built REST APIs.'],
    displayOrder: 0,
  },
];

describe('Experience Page', () => {
  it('renders the page h1', () => {
    vi.mocked(content.getExperiences).mockReturnValue([]);
    render(<ExperiencePage />);
    expect(screen.getByRole('heading', { level: 1, name: /experience/i })).toBeInTheDocument();
  });

  it('renders experience entries when present', () => {
    vi.mocked(content.getExperiences).mockReturnValue(mockExperiences);
    render(<ExperiencePage />);
    expect(screen.getByRole('heading', { level: 3, name: /software engineer intern/i })).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('renders no entry cards when experiences is empty', () => {
    vi.mocked(content.getExperiences).mockReturnValue([]);
    render(<ExperiencePage />);
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });

  it('renders no placeholder text when empty', () => {
    vi.mocked(content.getExperiences).mockReturnValue([]);
    render(<ExperiencePage />);
    expect(screen.queryByText(/no .* published/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6-2: Run test to verify it fails**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/experience.test.tsx
```

- [ ] **Step 6-3: Implement the Experience page**

```tsx
// app/experience/page.tsx
import type { Metadata } from 'next';
import { getExperiences, getSeoEntryForRoute } from '@/lib/content';
import { ExperienceSection } from '@/components/content/ExperienceSection';

export const dynamic = 'error';
export const revalidate = false;

export function generateMetadata(): Metadata {
  const seo = getSeoEntryForRoute('/experience');
  const title = seo?.title ?? 'Experience | Sufiyan Shaikh';
  const description =
    seo?.description ??
    'Professional and volunteer experience of Sufiyan Shaikh in software engineering, AI, and systems development.';
  return {
    title,
    description,
    alternates: { canonical: '/experience' },
    openGraph: { title, description, url: '/experience', type: 'website' },
  };
}

export default function ExperiencePage() {
  const experiences = getExperiences();

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex-1 flex flex-col items-center p-4 sm:p-12 relative overflow-x-hidden w-full max-w-full outline-none"
    >
      {/* Background Geometric Grid Pattern */}
      <div className="absolute inset-0 bg-geometric-pattern opacity-20 pointer-events-none -z-10" />

      <div className="z-10 w-full max-w-4xl flex flex-col gap-8">
        {/* Page heading */}
        <div className="flex items-center gap-3 border-b border-white/10 pb-4">
          <span className="text-neon-cyan">◈</span>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-white">Experience</h1>
        </div>

        {experiences.length > 0 && (
          <ExperienceSection entries={experiences} />
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 6-4: Run route test to verify it passes**

```powershell
npm.cmd test -- --reporter=verbose __tests__/routes/experience.test.tsx
```

Expected: 4/4 PASS

---

## Task 7: Navigation Update + Exit Gate Extension

**Files:**
- Modify: `components/shell/Header.tsx`
- Modify: `scripts/verify-exit-gate.mjs`
- Modify: `e2e/browser-exit-gate.spec.ts`

**Interfaces:**
- No new interfaces. Consumes existing `Link` from `next/link`.

- [ ] **Step 7-1: Update Header.tsx**

Replace the `<nav>` content in `components/shell/Header.tsx`. The current nav has:
Home `/`, Featured Project `/projects/integrum`, GitHub ↗ external.

Replace with:

```tsx
// components/shell/Header.tsx
import Link from 'next/link';

export function Header() {
  return (
    <header
      role="banner"
      className="sticky top-0 z-40 w-full border-b border-white/10 bg-void-black/80 backdrop-blur-md transition-colors motion-reduce:transition-none"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2 sm:px-6">
        {/* Brand / Logo */}
        <Link
          href="/"
          className="group inline-flex items-center gap-1.5 font-display text-sm sm:text-base md:text-lg font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm min-h-[44px]"
        >
          <span className="text-neon-cyan transition-transform group-hover:scale-110 motion-reduce:transform-none">
            ◈
          </span>
          <span>SUFIYAN SHAIKH</span>
        </Link>

        {/* Navigation Landmark */}
        <nav aria-label="Main navigation">
          <ul className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium">
            <li>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                About
              </Link>
            </li>
            <li>
              <Link
                href="/projects"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Projects
              </Link>
            </li>
            <li>
              <Link
                href="/skills"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Skills
              </Link>
            </li>
            <li>
              <Link
                href="/experience"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
              >
                Experience
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/sufiyanshaikh06"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-2.5 py-2 text-gray-300 hover:text-neon-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-void-black rounded-sm transition-colors motion-reduce:transition-none min-h-[44px]"
                aria-label="GitHub Profile (opens in new tab)"
              >
                GitHub ↗
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  );
}
```

- [ ] **Step 7-2: Add new HTTP probes to verify-exit-gate.mjs**

In `scripts/verify-exit-gate.mjs`, find the line:
```js
// Unknown Slug Probe (Must 404)
```

Insert the following block **before** it (after the existing dynamic project slug probes):

```js
// Phase 4B Static Route Probes
console.log('\n--- Phase 4B: New Static Route Probes ---');

const aboutRes = await fetch(`${BASE_URL}/about`);
console.log(`Probe GET /about -> HTTP ${aboutRes.status}`);
if (aboutRes.status !== 200) throw new Error(`Expected HTTP 200 for /about, got ${aboutRes.status}`);
const aboutHtml = await aboutRes.text();
if (!aboutHtml.includes('Sufiyan Shaikh')) {
  throw new Error('/about HTML missing profile full name.');
}

const projectsListRes = await fetch(`${BASE_URL}/projects`);
console.log(`Probe GET /projects -> HTTP ${projectsListRes.status}`);
if (projectsListRes.status !== 200) throw new Error(`Expected HTTP 200 for /projects, got ${projectsListRes.status}`);
const projectsHtml = await projectsListRes.text();
if (!projectsHtml.includes('Integrum')) {
  throw new Error('/projects HTML missing at least one project title.');
}

const skillsRes = await fetch(`${BASE_URL}/skills`);
console.log(`Probe GET /skills -> HTTP ${skillsRes.status}`);
if (skillsRes.status !== 200) throw new Error(`Expected HTTP 200 for /skills, got ${skillsRes.status}`);

const experienceRes = await fetch(`${BASE_URL}/experience`);
console.log(`Probe GET /experience -> HTTP ${experienceRes.status}`);
if (experienceRes.status !== 200) throw new Error(`Expected HTTP 200 for /experience, got ${experienceRes.status}`);
```

Also update the banner strings from `Phase 4A` to `Phase 4B`:

```js
// Find:
console.log('✔ Phase 4A Exit Gate Verification PASSED Successfully!');
// Replace with:
console.log('✔ Phase 4B Exit Gate Verification PASSED Successfully!');

// Find:
console.error('\n✖ Phase 4A Exit Gate Verification FAILED:', err);
// Replace with:
console.error('\n✖ Phase 4B Exit Gate Verification FAILED:', err);
```

- [ ] **Step 7-3: Extend Playwright e2e spec**

Add the following `test.describe` block at the end of `e2e/browser-exit-gate.spec.ts`,
inside the existing outer `test.describe('Phase 3 Browser Exit Gate: Network & JS Isolation', ...)` block:

```ts
test('Phase 4B new pages return HTTP 200 and contain expected content with JS enabled', async ({ page }) => {
  const recordedRequests: string[] = [];
  page.on('request', (request) => { recordedRequests.push(request.url()); });

  // /about
  const aboutRes = await page.goto('/about');
  expect(aboutRes?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: /about/i })).toBeVisible();

  // /projects
  const projectsRes = await page.goto('/projects');
  expect(projectsRes?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: /projects/i })).toBeVisible();

  // /skills
  const skillsRes = await page.goto('/skills');
  expect(skillsRes?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: /skills/i })).toBeVisible();

  // /experience
  const experienceRes = await page.goto('/experience');
  expect(experienceRes?.status()).toBe(200);
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('heading', { level: 1, name: /experience/i })).toBeVisible();

  // Confirm zero Supabase requests across all four pages
  const forbiddenPatterns = ['54321', 'supabase.co', '/rest/v1', '/storage/v1'];
  for (const reqUrl of recordedRequests) {
    for (const pattern of forbiddenPatterns) {
      expect(
        reqUrl.includes(pattern),
        `Forbidden runtime request on new pages: ${reqUrl} matched: ${pattern}`
      ).toBe(false);
    }
  }
});

test('Phase 4B new pages functional with JavaScript disabled', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();

  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1, name: /about/i })).toBeVisible();

  await page.goto('/projects');
  await expect(page.getByRole('heading', { level: 1, name: /projects/i })).toBeVisible();
  // At least one project card visible
  await expect(page.getByRole('heading', { level: 2 }).first()).toBeVisible();

  await page.goto('/skills');
  await expect(page.getByRole('heading', { level: 1, name: /skills/i })).toBeVisible();

  await page.goto('/experience');
  await expect(page.getByRole('heading', { level: 1, name: /experience/i })).toBeVisible();

  await context.close();
});

for (const vp of viewports) {
  test(`Phase 4B: no horizontal overflow on /about at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/about');
    const isOverflown = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(isOverflown, `Horizontal overflow on /about at ${vp.name}`).toBe(false);
  });

  test(`Phase 4B: no horizontal overflow on /projects at ${vp.name}`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto('/projects');
    const isOverflown = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(isOverflown, `Horizontal overflow on /projects at ${vp.name}`).toBe(false);
  });
}
```

> **Note:** The `viewports` array is already declared in the file scope and is accessible here.
> The Phase 4B viewport tests mirror the existing Phase 4A pattern — `/about` and `/projects`
> are the most content-rich new pages; `/skills` and `/experience` render correctly at all
> viewports given their flex layout.

- [ ] **Step 7-4: Run full Vitest suite to confirm no regressions**

```powershell
npm.cmd test
```

Expected: all tests PASS (≥ 82 Phase 4A + 33 component + 24 route + 4 utils = ≥ 143 total)

- [ ] **Step 7-5: Run lint and type-check**

```powershell
npm.cmd run lint
npm.cmd run type-check
```

Expected: 0 errors, 0 warnings on both commands.

- [ ] **Step 7-6: Run full build (snapshot + Next.js)**

```powershell
npm.cmd run build
```

Expected: build succeeds; static pages generated include `/`, `/about`, `/projects`,
`/projects/integrum`, `/skills`, `/experience` and any other snapshot-present project slugs.
Build output must not report any dynamic page errors.

- [ ] **Step 7-7: Run complete exit gate**

```powershell
npm.cmd run verify:gate
```

Expected: HTTP 200 for all four new routes, profile name present in `/about` HTML,
`Integrum` present in `/projects` HTML, canary scan clean, all Playwright tests pass
(≥ 22 total: 12 original + 2 new JS-enabled + 2 new JS-disabled + 10 new viewport tests).

---

## Plan Self-Review

**Spec coverage check:**
- ✅ `/about` with Option A empty-collection guards (Tasks 3)
- ✅ `/projects` listing with `<ol><li>` structure (Task 4)
- ✅ `/skills` with graceful empty (Task 5)
- ✅ `/experience` with graceful empty (Task 6)
- ✅ Header navigation update (Task 7)
- ✅ `line-clamp-3` on ProjectCard description (Task 2a)
- ✅ `<time dateTime={isoDate}>` on every date field (Tasks 2c, 2d, 2e, 2f)
- ✅ `h2` for project/category titles, `h3` for entry titles inside About/Experience (Tasks 2a–2f, 3–6)
- ✅ Concrete SEO fallbacks, no `<static fallback>` strings (Tasks 3–6)
- ✅ `profile.email` not rendered (Task 3, test asserts absence)
- ✅ Final gate uses `npm.cmd run build` (Task 7-6)
- ✅ No commit until Task 7-7 passes (Global Constraints)
- ✅ Exit gate banner updated to Phase 4B (Task 7-2)

**Placeholder scan:** No TBD, TODO, or "similar to Task N" patterns found.

**Type consistency:** All component prop types match DTO types from `@/lib/types/content` exactly. `formatIsoDate` signature is consistent across all consumers.
