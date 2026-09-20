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
    const times = document.querySelectorAll('time');
    // MIT entry has startDate and endDate
    expect(times.length).toBeGreaterThanOrEqual(2);
    const dateTimes = Array.from(times).map((t) => t.getAttribute('dateTime'));
    expect(dateTimes).toContain('2020-09-01');
    expect(dateTimes).toContain('2024-06-30');
  });

  it('omits time elements when dates are null', () => {
    render(<EducationSection entries={[entries[1]!]} />);
    expect(document.querySelectorAll('time').length).toBe(0);
  });
});
