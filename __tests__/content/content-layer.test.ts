import { describe, it, expect } from 'vitest';
import {
  getSnapshot,
  getPublishedProfile,
  getPublishedProjects,
  getProjectBySlug,
  getPublishedProjectSlugs,
  getIntegrumCaseStudy,
  getSkillCategories,
  getEducation,
  getExperiences,
  getCertifications,
  getAchievements,
  getSeoEntries,
  getSeoEntryForRoute,
  getActiveResumeMetadata,
} from '@/lib/content';

describe('Server-Only Content Layer with Runtime Validation & Deep Immutability', () => {
  it('returns valid snapshot parsed at runtime', () => {
    const snapshot = getSnapshot();
    expect(snapshot).toBeDefined();
    expect(snapshot.profile.fullName).toBe('Sufiyan Shaikh');
    expect(snapshot.projects.length).toBeGreaterThanOrEqual(1);
  });

  it('enforces true runtime immutability via deepFreeze', () => {
    const snapshot = getSnapshot();
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.profile)).toBe(true);
    expect(Object.isFrozen(snapshot.projects)).toBe(true);
    if (snapshot.projects.length > 0) {
      expect(Object.isFrozen(snapshot.projects[0])).toBe(true);
      expect(Object.isFrozen(snapshot.projects[0].technologies)).toBe(true);
    }

    // Attempting to mutate in strict mode must throw
    expect(() => {
      (snapshot.profile as Record<string, unknown>).headline = 'Hacked Headline';
    }).toThrow();

    expect(() => {
      (snapshot.projects as unknown[]).push({});
    }).toThrow();
  });

  it('retrieves published profile', () => {
    const profile = getPublishedProfile();
    expect(profile.fullName).toBe('Sufiyan Shaikh');
    expect(profile.githubUrl).toBe('https://github.com/sufiyanshaikh06');
    expect(profile.avatar).toBeDefined();
    expect(profile.avatar?.localPath).toMatch(/^\/generated\/snapshot\/[a-z0-9_]+-[a-f0-9]{16}\.jpg$/);
  });

  it('retrieves published projects and slugs dynamically', () => {
    const projects = getPublishedProjects();
    expect(projects.length).toBeGreaterThanOrEqual(1);

    const slugs = getPublishedProjectSlugs();
    expect(slugs).toContain('integrum');
    expect(slugs.length).toBe(projects.length);
  });

  it('resolves projects by slug and returns null for unknown slugs', () => {
    const integrum = getProjectBySlug('integrum');
    expect(integrum).not.toBeNull();
    expect(integrum?.slug).toBe('integrum');
    expect(integrum?.title).toBe('Integrum');

    const unknown = getProjectBySlug('nonexistent-project-xyz');
    expect(unknown).toBeNull();
  });

  it('resolves Integrum case study via getIntegrumCaseStudy()', () => {
    const integrum = getIntegrumCaseStudy();
    expect(integrum).toBeDefined();
    expect(integrum.slug).toBe('integrum');
    expect(integrum.sections.length).toBeGreaterThanOrEqual(1);
  });

  it('resolves skill categories and skills', () => {
    const categories = getSkillCategories();
    expect(categories.length).toBeGreaterThanOrEqual(1);
    expect(categories[0].skills.length).toBeGreaterThanOrEqual(1);
  });

  it('resolves collections honestly without inventing content', () => {
    expect(Array.isArray(getEducation())).toBe(true);
    expect(Array.isArray(getExperiences())).toBe(true);
    expect(Array.isArray(getCertifications())).toBe(true);
    expect(Array.isArray(getAchievements())).toBe(true);
  });

  it('normalizes route paths when querying SEO entries', () => {
    const seoList = getSeoEntries();
    expect(seoList.length).toBeGreaterThanOrEqual(1);

    const rootSeo1 = getSeoEntryForRoute('/');
    const rootSeo2 = getSeoEntryForRoute('///');
    const rootSeo3 = getSeoEntryForRoute('');

    expect(rootSeo1).not.toBeNull();
    expect(rootSeo1?.title).toBe(rootSeo2?.title);
    expect(rootSeo1?.title).toBe(rootSeo3?.title);

    const missingSeo = getSeoEntryForRoute('/nonexistent-page-route');
    expect(missingSeo).toBeNull();
  });

  it('resolves active resume metadata without storage access', () => {
    const resume = getActiveResumeMetadata();
    if (resume) {
      expect(resume.versionLabel).toBeDefined();
      expect(resume.uploadedAt).toBeDefined();
      // Ensure no leaked storage paths or bucket IDs
      const rawResume = resume as unknown as Record<string, unknown>;
      expect(rawResume.bucket_id).toBeUndefined();
      expect(rawResume.storage_path).toBeUndefined();
    }
  });
});
