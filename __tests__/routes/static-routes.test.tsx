import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  getPublishedProjectSlugs,
  getProjectBySlug,
  getPublishedProfile,
} from '@/lib/content';
import Home from '@/app/page';
import ProjectCaseStudyPage, { generateStaticParams } from '@/app/projects/[slug]/page';

describe('Static Public Routes and Content Mapping', () => {
  it('returns strictly integrum for static params in Phase 3', () => {
    const params = generateStaticParams();
    expect(params).toEqual([{ slug: 'integrum' }]);

    const slugs = getPublishedProjectSlugs();
    expect(slugs).toEqual(['integrum']);
  });

  it('resolves integrum project but returns null for other slugs', () => {
    const integrum = getProjectBySlug('integrum');
    expect(integrum).not.toBeNull();
    expect(integrum?.slug).toBe('integrum');
    expect(integrum?.title).toBe('Integrum');
    expect(integrum?.category).toBe('Full-Stack');
    expect(integrum?.tier).toBe('featured');

    // /projects/iot-temp-monitor must return null (404) until Phase 4
    expect(getProjectBySlug('iot-temp-monitor')).toBeNull();
    expect(getProjectBySlug('unknown-slug')).toBeNull();
  });

  it('resolves verified profile for Sufiyan Shaikh', () => {
    const profile = getPublishedProfile();
    expect(profile.fullName).toBe('Sufiyan Shaikh');
    expect(profile.headline).toContain('Computer Science Student');
    expect(profile.githubUrl).toBe('https://github.com/sufiyanshaikh06');
  });

  it('renders homepage with semantic landmarks and verified claims', () => {
    render(<Home />);

    // Semantic landmark checks
    const main = screen.getByRole('main');
    expect(main).toBeInTheDocument();
    expect(main).toHaveAttribute('id', 'main-content');

    // Profile checks
    expect(screen.getByRole('heading', { level: 1, name: /sufiyan shaikh/i })).toBeInTheDocument();
    
    // Featured project card
    expect(screen.getByRole('heading', { level: 2, name: /featured project/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /integrum/i })).toBeInTheDocument();

    // CTA link to Integrum
    const ctaLinks = screen.getAllByRole('link', { name: /integrum/i });
    expect(ctaLinks.length).toBeGreaterThan(0);
    expect(ctaLinks[0]).toHaveAttribute('href', '/projects/integrum');
  });

  it('renders Integrum case study with sections and back link', async () => {
    const jsx = await ProjectCaseStudyPage({ params: Promise.resolve({ slug: 'integrum' }) });
    render(jsx);

    expect(screen.getByRole('heading', { level: 1, name: /integrum/i })).toBeInTheDocument();
    expect(screen.getByText(/case study \/\/ full-stack/i)).toBeInTheDocument();

    // Structured sections
    expect(screen.getByRole('heading', { level: 3, name: /overview/i })).toBeInTheDocument();

    // Back link
    const backLink = screen.getByRole('link', { name: /return to portfolio overview/i });
    expect(backLink).toHaveAttribute('href', '/');
  });
});
