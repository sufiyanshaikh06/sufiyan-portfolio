import { describe, it, expect } from 'vitest';
import {
  DbProfileSchema,
  DbProjectSchema,
  DbSectionSchema,
  DbMediaAssetSchema,
  LocalMediaAssetSchema,
  ProjectCaseStudySchema,
  ProfileSchema,
  PublicSnapshotSchema,
} from '@/lib/schemas/snapshot';

describe('Zod Snapshot Runtime Schemas Validation', () => {
  const validMedia = {
    fileName: 'integrum.jpg',
    localPath: '/generated/snapshot/integrum-0d3348f370413ed8.jpg',
    altText: 'Integrum Student Success Platform interface',
    width: 1920,
    height: 1080,
  };

  const validSection = {
    id: '10000000-0000-0000-0000-000000000060',
    title: 'Overview',
    content: 'Integrum brings together course tracking and career workflows.',
    displayOrder: 1,
    media: [validMedia],
  };

  const validProject = {
    id: '10000000-0000-0000-0000-000000000050',
    slug: 'integrum' as const,
    title: 'Integrum',
    subtitle: 'Student Success Platform',
    category: 'Full-Stack',
    tier: 'featured' as const,
    description: 'A full-stack student-success platform.',
    technologies: ['React', 'TypeScript', 'Node.js'],
    featuredAsset: validMedia,
    demoUrl: 'https://demo.example.com',
    githubUrl: 'https://github.com/example/integrum',
    sections: [validSection],
  };

  const validProfile = {
    fullName: 'Sufiyan Shaikh' as const,
    professionalName: 'Sufiyan Shaikh',
    headline: 'Computer Science Student | Building Intelligent Software',
    bio: 'Computer science student focused on AI and software engineering.',
    githubUrl: 'https://github.com/sufiyanshaikh06',
    avatar: validMedia,
  };

  describe('Raw Database Schemas', () => {
    it('validates compliant raw database rows', () => {
      expect(() =>
        DbProfileSchema.parse({
          id: '10000000-0000-0000-0000-000000000020',
          full_name: 'Sufiyan Shaikh',
          professional_name: 'Sufiyan Shaikh',
          headline: 'Computer Science Student',
          bio: 'Bio text',
          github_url: 'https://github.com/sufiyanshaikh06',
          is_published: true,
        })
      ).not.toThrow();

      expect(() =>
        DbProjectSchema.parse({
          id: '10000000-0000-0000-0000-000000000050',
          slug: 'integrum',
          title: 'Integrum',
          category: 'Full-Stack',
          tier: 'featured',
          description: 'Description',
          technologies: ['React', 'TypeScript'],
          display_order: 1,
          state: 'live',
          is_archived: false,
        })
      ).not.toThrow();

      expect(() =>
        DbSectionSchema.parse({
          id: '10000000-0000-0000-0000-000000000060',
          project_id: '10000000-0000-0000-0000-000000000050',
          title: 'Overview',
          content: 'Section content',
          display_order: 1,
        })
      ).not.toThrow();

      expect(() =>
        DbMediaAssetSchema.parse({
          id: '10000000-0000-0000-0000-000000000010',
          bucket_id: 'public_assets',
          file_name: 'integrum.jpg',
          file_type: 'image/jpeg',
          file_size: 12508,
          storage_path: 'projects/integrum.jpg',
          alt_text: 'Alt text',
          width: 1920,
          height: 1080,
          is_archived: false,
        })
      ).not.toThrow();
    });
  });

  describe('LocalMediaAssetSchema', () => {
    it('validates correct local media asset', () => {
      expect(() => LocalMediaAssetSchema.parse(validMedia)).not.toThrow();
    });

    it('rejects invalid localPath without 16-hex hash', () => {
      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          localPath: '/generated/snapshot/integrum.jpg',
        })
      ).toThrow();
    });

    it('rejects path traversal / unsafe media paths', () => {
      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          localPath: '/generated/snapshot/../../etc/passwd',
        })
      ).toThrow();
    });

    it('rejects non-positive dimensions', () => {
      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          width: 0,
        })
      ).toThrow();

      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          height: -10,
        })
      ).toThrow();
    });
  });

  describe('ProjectCaseStudySchema', () => {
    it('validates compliant Integrum case study', () => {
      expect(() => ProjectCaseStudySchema.parse(validProject)).not.toThrow();
    });

    it('rejects non-integrum slugs in Phase 3', () => {
      expect(() =>
        ProjectCaseStudySchema.parse({
          ...validProject,
          slug: 'iot-temp-monitor',
        })
      ).toThrow();
    });

    it('rejects empty technologies array', () => {
      expect(() =>
        ProjectCaseStudySchema.parse({
          ...validProject,
          technologies: [],
        })
      ).toThrow();
    });

    it('rejects empty sections array', () => {
      expect(() =>
        ProjectCaseStudySchema.parse({
          ...validProject,
          sections: [],
        })
      ).toThrow();
    });

    it('rejects malformed URLs in demo or github links', () => {
      expect(() =>
        ProjectCaseStudySchema.parse({
          ...validProject,
          demoUrl: 'not-a-valid-url',
        })
      ).toThrow();
    });
  });

  describe('ProfileSchema', () => {
    it('validates verified Sufiyan Shaikh profile', () => {
      expect(() => ProfileSchema.parse(validProfile)).not.toThrow();
    });

    it('rejects incorrect full names', () => {
      expect(() =>
        ProfileSchema.parse({
          ...validProfile,
          fullName: 'John Doe',
        })
      ).toThrow();
    });

    it('rejects malformed GitHub URL', () => {
      expect(() =>
        ProfileSchema.parse({
          ...validProfile,
          githubUrl: 'ftp://invalid',
        })
      ).toThrow();
    });
  });

  describe('PublicSnapshotSchema Security Assertions', () => {
    it('validates complete snapshot and ensures no bucketId or storagePath leakage', () => {
      const fullSnapshot = {
        profile: validProfile,
        integrum: validProject,
        generatedAt: new Date().toISOString(),
      };

      const parsed = PublicSnapshotSchema.parse(fullSnapshot);
      const json = JSON.stringify(parsed);

      expect(json).not.toContain('bucketId');
      expect(json).not.toContain('bucket_id');
      expect(json).not.toContain('storagePath');
      expect(json).not.toContain('storage_path');
    });
  });
});
