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
