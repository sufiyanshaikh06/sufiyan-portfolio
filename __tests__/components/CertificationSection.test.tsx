import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CertificationSection } from '@/components/content/CertificationSection';
import type { Certification } from '@/lib/types/content';

const entries: Certification[] = [
  {
    name: 'AWS Solutions Architect',
    issuingOrganization: 'Amazon Web Services',
    issueDate: '2023-04-01',
    credentialUrl: 'https://example.com/verify/123',
    certificateAsset: null,
  },
  {
    name: 'Google Cloud Associate',
    issuingOrganization: 'Google',
    issueDate: null,
    credentialUrl: null,
    certificateAsset: null,
  },
];

describe('CertificationSection', () => {
  it('renders certification names as h3', () => {
    render(<CertificationSection entries={entries} />);
    expect(screen.getByRole('heading', { level: 3, name: /aws solutions architect/i })).toBeInTheDocument();
  });

  it('renders issuing organizations', () => {
    render(<CertificationSection entries={entries} />);
    expect(screen.getByText('Amazon Web Services')).toBeInTheDocument();
    expect(screen.getByText('Google')).toBeInTheDocument();
  });

  it('renders time element with dateTime when issueDate present', () => {
    render(<CertificationSection entries={entries} />);
    const time = document.querySelector('time');
    expect(time).not.toBeNull();
    expect(time!.getAttribute('dateTime')).toBe('2023-04-01');
    expect(time!.textContent).toBe('Apr 2023');
  });

  it('renders verify credential link when credentialUrl present', () => {
    render(<CertificationSection entries={entries} />);
    const link = screen.getByRole('link', { name: /verify aws solutions architect credential/i });
    expect(link).toHaveAttribute('href', 'https://example.com/verify/123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('omits verify link when credentialUrl is null', () => {
    render(<CertificationSection entries={[entries[1]!]} />);
    expect(screen.queryByRole('link', { name: /verify google cloud associate credential/i })).not.toBeInTheDocument();
  });

  it('omits time element when issueDate is null', () => {
    render(<CertificationSection entries={[entries[1]!]} />);
    expect(document.querySelectorAll('time').length).toBe(0);
  });
});
