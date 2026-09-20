import type { Experience } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface ExperienceSectionProps {
  entries: ReadonlyArray<Experience>;
}

export function ExperienceSection({ entries }: ExperienceSectionProps) {
  return (
    <div className="flex flex-col gap-4">
      {entries.map((entry, i) => (
        <HudCard key={`exp-${i}`}>
          <div className="flex flex-col gap-3">
            {/* Header row */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-bold text-white">{entry.roleTitle}</h3>
                <p className="text-sm font-medium text-gray-400 mt-0.5">
                  {entry.organization}
                  {entry.location && (
                    <span className="text-gray-500"> · {entry.location}</span>
                  )}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="px-2 py-0.5 text-xs font-mono uppercase bg-white/5 border border-white/10 text-gray-400 rounded">
                  {entry.type}
                </span>
                <p className="text-xs font-mono text-gray-500">
                  <time dateTime={entry.startDate}>{formatIsoDate(entry.startDate)}</time>
                  <span> – </span>
                  {entry.endDate ? (
                    <time dateTime={entry.endDate}>{formatIsoDate(entry.endDate)}</time>
                  ) : (
                    <span>Present</span>
                  )}
                </p>
              </div>
            </div>

            {/* Description points */}
            {entry.descriptionPoints.length > 0 && (
              <ul className="flex flex-col gap-1.5 pl-4 list-disc marker:text-neon-cyan/50">
                {entry.descriptionPoints.map((point, j) => (
                  <li key={`exp-${i}-pt-${j}`} className="text-sm text-gray-300 leading-relaxed">
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </HudCard>
      ))}
    </div>
  );
}
