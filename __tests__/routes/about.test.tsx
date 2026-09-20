import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Profile, Education, Certification, Achievement } from '@/lib/types/content';

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
  it('always renders the page h1 and profile bio', () => {
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
