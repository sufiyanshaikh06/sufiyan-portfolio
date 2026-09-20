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
    expect(screen.getByText(/remote/i)).toBeInTheDocument();
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
    const times = document.querySelectorAll('time');
    const dateTimes = Array.from(times).map((t) => t.getAttribute('dateTime'));
    expect(dateTimes).toContain('2023-06-01');
    expect(dateTimes).toContain('2023-08-31');
    expect(dateTimes).toContain('2024-01-01');
  });
});
