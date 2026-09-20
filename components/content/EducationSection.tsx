import type { Education } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface EducationSectionProps {
  entries: ReadonlyArray<Education>;
}

export function EducationSection({ entries }: EducationSectionProps) {
  return (
    <ol className="flex flex-col gap-4 list-none">
      {entries.map((entry, i) => (
        <li key={`edu-${i}`}>
          <HudCard>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-bold text-white">
                    {entry.degree}
                    {entry.fieldOfStudy && (
                      <span className="text-neon-cyan/80 font-normal"> — {entry.fieldOfStudy}</span>
                    )}
                  </h3>
                  <p className="text-sm font-medium text-gray-400 mt-0.5">{entry.institution}</p>
                </div>

                {(entry.startDate || entry.endDate) && (
                  <p className="text-xs font-mono text-gray-500 shrink-0">
                    {entry.startDate && (
                      <time dateTime={entry.startDate}>{formatIsoDate(entry.startDate)}</time>
                    )}
                    {entry.startDate && entry.endDate && (
                      <span> – </span>
                    )}
                    {entry.endDate && (
                      <time dateTime={entry.endDate}>{formatIsoDate(entry.endDate)}</time>
                    )}
                  </p>
                )}
              </div>

              {entry.description && (
                <p className="text-sm text-gray-300 leading-relaxed mt-1">{entry.description}</p>
              )}
            </div>
          </HudCard>
        </li>
      ))}
    </ol>
  );
}
