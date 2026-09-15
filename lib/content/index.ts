import 'server-only';
import snapshotData from '@/lib/generated/public-snapshot.json';
import type {
  PublicSnapshot,
  Profile,
  ProjectCaseStudy,
} from '@/lib/types/content';

const snapshot = snapshotData as PublicSnapshot;

export function getSnapshot(): PublicSnapshot {
  return snapshot;
}

export function getPublishedProfile(): Profile {
  return snapshot.profile;
}

export function getIntegrumCaseStudy(): ProjectCaseStudy {
  return snapshot.integrum;
}

export function getProjectBySlug(slug: string): ProjectCaseStudy | null {
  if (slug === 'integrum') {
    return snapshot.integrum;
  }
  return null;
}

export function getPublishedProjectSlugs(): string[] {
  return ['integrum'];
}
