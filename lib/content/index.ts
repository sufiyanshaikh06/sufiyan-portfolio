import 'server-only';
import snapshotData from '@/lib/generated/public-snapshot.json';
import { PublicSnapshotSchema } from '@/lib/schemas/snapshot';
import { normalizeRoutePath } from '@/lib/schemas/helpers';
import type {
  PublicSnapshot,
  Profile,
  ProjectCaseStudy,
  SkillCategory,
  Education,
  Experience,
  Certification,
  Achievement,
  SeoEntry,
  ActiveResumeMetadata,
} from '@/lib/types/content';

function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  }
  return obj;
}

const parsedSnapshot = PublicSnapshotSchema.parse(snapshotData);
const snapshot = deepFreeze(parsedSnapshot);

const projectSlugMap = new Map<string, ProjectCaseStudy>();
for (const project of snapshot.projects) {
  projectSlugMap.set(project.slug, project);
}

export function getSnapshot(): Readonly<PublicSnapshot> {
  return snapshot;
}

export function getPublishedProfile(): Readonly<Profile> {
  return snapshot.profile;
}

export function getPublishedProjects(): ReadonlyArray<ProjectCaseStudy> {
  return snapshot.projects;
}

export function getProjectBySlug(slug: string): Readonly<ProjectCaseStudy> | null {
  return projectSlugMap.get(slug) ?? null;
}

export function getPublishedProjectSlugs(): string[] {
  return snapshot.projects.map((project) => project.slug);
}

/**
 * @deprecated Use getProjectBySlug('integrum') directly. Maintained for Phase 4A backward compatibility.
 */
export function getIntegrumCaseStudy(): Readonly<ProjectCaseStudy> {
  const integrum = projectSlugMap.get('integrum');
  if (!integrum) {
    throw new Error(
      'Integrum case study is required for Phase 4A backward compatibility but was not found in the public snapshot.'
    );
  }
  return integrum;
}

export function getSkillCategories(): ReadonlyArray<SkillCategory> {
  return snapshot.skillCategories;
}

export function getEducation(): ReadonlyArray<Education> {
  return snapshot.education;
}

export function getExperiences(): ReadonlyArray<Experience> {
  return snapshot.experiences;
}

export function getCertifications(): ReadonlyArray<Certification> {
  return snapshot.certifications;
}

export function getAchievements(): ReadonlyArray<Achievement> {
  return snapshot.achievements;
}

export function getSeoEntries(): ReadonlyArray<SeoEntry> {
  return snapshot.seoEntries;
}

export function getSeoEntryForRoute(routePath: string): Readonly<SeoEntry> | null {
  const normalized = normalizeRoutePath(routePath);
  return (
    snapshot.seoEntries.find((entry) => normalizeRoutePath(entry.routePath) === normalized) ?? null
  );
}

export function getActiveResumeMetadata(): Readonly<ActiveResumeMetadata> | null {
  return snapshot.activeResume;
}
