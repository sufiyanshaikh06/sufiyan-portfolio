import { describe, it, expect } from 'vitest';
import {
  DbProfileSchema,
  DbProjectSchema,
  DbSkillCategorySchema,
  DbSkillSchema,
  DbEducationSchema,
  DbExperienceSchema,
  DbResumeVersionSchema,
  LocalMediaAssetSchema,
  SectionMediaSchema,
  ProjectCaseStudySchema,
  SkillSchema,
  EducationSchema,
  ExperienceSchema,
  PublicSnapshotSchema,
  type ProjectCaseStudy,
  type PublicSnapshot,
} from '@/lib/schemas/snapshot';

describe('Zod Snapshot Runtime Schemas Validation', () => {
  const validMedia = {
    fileName: 'integrum_hero-0d3348f370413ed8.jpg',
    localPath: '/generated/snapshot/integrum_hero-0d3348f370413ed8.jpg',
    altText: 'Integrum Student Success Platform interface',
    caption: null,
    width: 1920,
    height: 1080,
  };

  const validSectionMedia = {
    localPath: '/generated/snapshot/integrum_ui-0d3348f370413ed8.jpg',
    altText: 'Integrum detailed interface screen',
    caption: 'Overview dashboard',
    width: 1920,
    height: 1080,
    displayOrder: 1,
  };

  const validSection = {
    title: 'Overview',
    content: 'Integrum brings together course tracking and career workflows.',
    displayOrder: 1,
    media: [validSectionMedia],
  };

  const validFeaturedProject: ProjectCaseStudy = {
    slug: 'integrum',
    title: 'Integrum',
    subtitle: 'Student Success Platform',
    category: 'Full-Stack',
    tier: 'featured',
    description: 'A full-stack student-success platform.',
    problemStatement: 'Students struggle with fragmented tracking.',
    architectureOverview: 'PostgreSQL + Prisma + React',
    keyFeatures: ['Course tracking', 'Milestone dashboard'],
    technologies: ['React', 'TypeScript', 'Node.js'],
    featuredAsset: validMedia,
    demoUrl: 'https://demo.example.com',
    githubUrl: 'https://github.com/example/integrum',
    displayOrder: 1,
    sections: [validSection],
  };

  const validMiniProject: ProjectCaseStudy = {
    slug: 'cli-tool',
    title: 'CLI Utility',
    subtitle: null,
    category: 'Tools',
    tier: 'mini',
    description: 'A lightweight terminal tool.',
    problemStatement: null,
    architectureOverview: null,
    keyFeatures: null,
    technologies: ['TypeScript'],
    featuredAsset: null,
    demoUrl: null,
    githubUrl: null,
    displayOrder: 2,
    sections: [], // mini tier permits 0 sections
  };

  const validProfile = {
    fullName: 'Sufiyan Shaikh' as const,
    professionalName: 'Sufiyan Shaikh',
    headline: 'Computer Science Student | Building Intelligent Software',
    bio: 'Computer science student focused on AI and software engineering.',
    githubUrl: 'https://github.com/sufiyanshaikh06',
    avatar: validMedia,
  };

  const validCategory = {
    name: 'Languages & Fundamentals',
    displayOrder: 1,
    skills: [
      {
        name: 'TypeScript',
        proficiencyLevel: 'Working Knowledge',
        iconIdentifier: 'typescript',
        displayOrder: 1,
      },
      {
        name: 'Python',
        proficiencyLevel: 'Working Knowledge',
        iconIdentifier: 'python',
        displayOrder: 2,
      },
    ],
  };

  const validEducation = {
    institution: 'University of Mumbai',
    degree: 'B.Sc. in Computer Science',
    fieldOfStudy: 'Computer Science',
    startDate: '2023-08-01',
    endDate: '2026-06-30',
    description: 'Undergraduate study focused on software systems and algorithms.',
  };

  const validExperience = {
    organization: 'Technology Lab',
    roleTitle: 'Software Engineering Intern',
    type: 'Internship',
    location: 'Mumbai, India',
    startDate: '2025-06-01',
    endDate: '2025-08-31',
    descriptionPoints: ['Developed full-stack modules', 'Refined test automation'],
    displayOrder: 1,
  };

  const validCertification = {
    name: 'Certified Systems Associate',
    issuingOrganization: 'Cloud Foundation',
    issueDate: '2025-05-15',
    credentialUrl: 'https://credentials.example.com/cert-123',
    certificateAsset: null,
  };

  const validAchievement = {
    title: 'Hackathon Finalist',
    date: '2025-03-10',
    description: 'Developed an assistive prototype in 36 hours.',
    achievementAsset: null,
  };

  const validSeoEntry = {
    routePath: '/',
    title: 'Sufiyan Shaikh | Portfolio',
    description: 'Verified portfolio of Sufiyan Shaikh.',
    keywords: ['Sufiyan Shaikh', 'Computer Science'],
    ogImageAsset: validMedia,
  };

  const validResume = {
    versionLabel: 'Production Resume v1',
    uploadedAt: '2026-09-20T10:00:00Z',
  };

  describe('Raw Database Schemas (Db*)', () => {
    it('validates compliant raw database rows with strict properties', () => {
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
        DbSkillCategorySchema.parse({
          id: '10000000-0000-0000-0000-000000000030',
          name: 'Languages',
          display_order: 1,
          is_published: true,
          is_archived: false,
        })
      ).not.toThrow();

      expect(() =>
        DbSkillSchema.parse({
          id: '10000000-0000-0000-0000-000000000040',
          category_id: '10000000-0000-0000-0000-000000000030',
          name: 'TypeScript',
          proficiency_level: 'Working Knowledge',
          icon_identifier: 'typescript',
          vector_position_x: 10.0,
          vector_position_y: 20.0,
          display_order: 1,
          is_published: true,
          is_archived: false,
        })
      ).not.toThrow();

      expect(() =>
        DbEducationSchema.parse({
          id: '10000000-0000-0000-0000-000000000090',
          institution: 'University',
          degree: 'B.Sc.',
          start_date: '2023-08-01',
          is_published: true,
          is_archived: false,
        })
      ).not.toThrow();

      expect(() =>
        DbExperienceSchema.parse({
          id: '10000000-0000-0000-0000-000000000091',
          organization: 'Org',
          role_title: 'Engineer',
          type: 'Full-time',
          start_date: '2024-01-01',
          description_points: ['Built APIs'],
          display_order: 1,
          is_published: true,
          is_archived: false,
        })
      ).not.toThrow();

      expect(() =>
        DbResumeVersionSchema.parse({
          id: '10000000-0000-0000-0000-000000000080',
          version_label: 'Resume v1',
          file_asset_id: '10000000-0000-0000-0000-000000000013',
          is_active: true,
          is_archived: false,
          uploaded_at: '2026-09-20T10:00:00+05:30',
        })
      ).not.toThrow();
    });

    it('rejects unexpected extra columns due to z.strictObject', () => {
      expect(() =>
        DbProfileSchema.parse({
          id: '10000000-0000-0000-0000-000000000020',
          full_name: 'Sufiyan Shaikh',
          professional_name: 'Sufiyan Shaikh',
          headline: 'Student',
          bio: 'Bio',
          github_url: 'https://github.com/sufiyanshaikh06',
          is_published: true,
          unexpected_column: 'malicious-data',
        })
      ).toThrow();
    });

    it('rejects archived or non-live records', () => {
      expect(() =>
        DbProjectSchema.parse({
          id: '10000000-0000-0000-0000-000000000050',
          slug: 'archived-project',
          title: 'Project',
          category: 'Tools',
          tier: 'mini',
          description: 'Desc',
          technologies: ['TS'],
          display_order: 1,
          state: 'live',
          is_archived: true,
        })
      ).toThrow();

      expect(() =>
        DbProjectSchema.parse({
          id: '10000000-0000-0000-0000-000000000050',
          slug: 'draft-project',
          title: 'Project',
          category: 'Tools',
          tier: 'mini',
          description: 'Desc',
          technologies: ['TS'],
          display_order: 1,
          status: 'draft' as unknown as 'live',
          is_archived: false,
        })
      ).toThrow();
    });
  });

  describe('Page-Facing Presentation DTO Schemas', () => {
    it('validates compliant local media asset', () => {
      expect(() => LocalMediaAssetSchema.parse(validMedia)).not.toThrow();
      expect(() => SectionMediaSchema.parse(validSectionMedia)).not.toThrow();
    });

    it('rejects invalid localPath or un-sanitized characters in filename', () => {
      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          localPath: '/generated/snapshot/integrum-hero.jpg', // missing 16-hex hash
        })
      ).toThrow();

      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          localPath: '/generated/snapshot/../../etc/passwd', // traversal attempt
        })
      ).toThrow();

      expect(() =>
        LocalMediaAssetSchema.parse({
          ...validMedia,
          fileName: 'iot-temp-monitor-0d3348f370413ed8.jpg', // hyphens before hash prohibited
        })
      ).toThrow();
    });

    it('enforces tier rules for project sections', () => {
      // featured tier requires >= 1 section
      expect(() =>
        ProjectCaseStudySchema.parse({
          ...validFeaturedProject,
          sections: [],
        })
      ).toThrow();

      // mini tier permits 0 sections
      expect(() => ProjectCaseStudySchema.parse(validMiniProject)).not.toThrow();
    });

    it('discards vector coordinates from SkillSchema', () => {
      const skillWithVectors = {
        name: 'TypeScript',
        proficiencyLevel: 'Working Knowledge',
        iconIdentifier: 'typescript',
        displayOrder: 1,
        vectorPositionX: 10,
        vectorPositionY: 20,
      };

      // Strict page DTO must reject vector coordinates
      expect(() => SkillSchema.parse(skillWithVectors)).toThrow();
    });

    it('enforces IsoDateStringSchema on date fields', () => {
      expect(() =>
        EducationSchema.parse({
          ...validEducation,
          startDate: 'invalid-date-format',
        })
      ).toThrow();

      expect(() =>
        ExperienceSchema.parse({
          ...validExperience,
          startDate: '2025/06/01',
        })
      ).toThrow();
    });
  });

  describe('PublicSnapshotSchema Cross-Collection Refinements', () => {
    const createFullSnapshot = (): PublicSnapshot => ({
      profile: validProfile,
      projects: [validFeaturedProject],
      skillCategories: [validCategory],
      education: [validEducation],
      experiences: [validExperience],
      certifications: [validCertification],
      achievements: [validAchievement],
      seoEntries: [validSeoEntry],
      activeResume: validResume,
      generatedAt: '2026-09-20T10:30:00Z',
    });

    it('validates a complete, compliant public snapshot', () => {
      const snapshot = createFullSnapshot();
      expect(() => PublicSnapshotSchema.parse(snapshot)).not.toThrow();
    });

    it('rejects duplicate project slugs', () => {
      const snapshot = createFullSnapshot();
      snapshot.projects = [
        validFeaturedProject,
        { ...validFeaturedProject, displayOrder: 2 }, // same slug 'integrum'
      ];
      expect(() => PublicSnapshotSchema.parse(snapshot)).toThrow(/Duplicate project slug/);
    });

    it('permits projects to share displayOrder broken deterministically by slug', () => {
      const snapshot = createFullSnapshot();
      snapshot.projects = [
        validFeaturedProject, // slug: 'integrum', displayOrder: 1
        { ...validMiniProject, displayOrder: 1 }, // slug: 'cli-tool', displayOrder: 1
      ];
      expect(() => PublicSnapshotSchema.parse(snapshot)).not.toThrow();
    });

    it('rejects duplicate section displayOrder within the same project', () => {
      const snapshot = createFullSnapshot();
      snapshot.projects[0].sections = [
        validSection,
        { ...validSection, title: 'Second Section', displayOrder: 1 },
      ];
      expect(() => PublicSnapshotSchema.parse(snapshot)).toThrow(/Duplicate section displayOrder/);
    });

    it('rejects duplicate skill category names or displayOrder', () => {
      const snapshot = createFullSnapshot();
      snapshot.skillCategories = [
        validCategory,
        { ...validCategory, displayOrder: 2 }, // same name
      ];
      expect(() => PublicSnapshotSchema.parse(snapshot)).toThrow(/Duplicate skill category name/);
    });

    it('rejects duplicate SEO route paths (normalized)', () => {
      const snapshot = createFullSnapshot();
      snapshot.seoEntries = [
        validSeoEntry, // routePath: '/'
        { ...validSeoEntry, routePath: '///' }, // normalizes to '/'
      ];
      expect(() => PublicSnapshotSchema.parse(snapshot)).toThrow(/Duplicate SEO route path/);
    });
  });
});
