import type { Certification } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface CertificationSectionProps {
  entries: ReadonlyArray<Certification>;
}

export function CertificationSection({ entries }: CertificationSectionProps) {
  return (
    <ul className="flex flex-col gap-4 list-none">
      {entries.map((entry, i) => (
        <li key={`cert-${i}`}>
          <HudCard>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">{entry.name}</h3>
                  <p className="text-sm font-medium text-gray-400 mt-0.5">{entry.issuingOrganization}</p>
                </div>

                {entry.issueDate && (
                  <time
                    dateTime={entry.issueDate}
                    className="text-xs font-mono text-gray-500 shrink-0"
                  >
                    {formatIsoDate(entry.issueDate)}
                  </time>
                )}
              </div>

              {entry.credentialUrl && (
                <a
                  href={entry.credentialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Verify ${entry.name} credential (opens in new tab)`}
                  className="inline-flex items-center gap-1 text-sm font-mono text-neon-cyan hover:text-white transition-colors motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-neon-cyan rounded-sm min-h-[44px]"
                >
                  Verify Credential ↗
                </a>
              )}
            </div>
          </HudCard>
        </li>
      ))}
    </ul>
  );
}
