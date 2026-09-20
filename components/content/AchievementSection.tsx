import type { Achievement } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';
import { formatIsoDate } from '@/lib/utils/format';

interface AchievementSectionProps {
  entries: ReadonlyArray<Achievement>;
}

export function AchievementSection({ entries }: AchievementSectionProps) {
  return (
    <ul className="flex flex-col gap-4 list-none">
      {entries.map((entry, i) => (
        <li key={`ach-${i}`}>
          <HudCard>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-white">{entry.title}</h3>
              {entry.date && (
                <time
                  dateTime={entry.date}
                  className="text-xs font-mono text-gray-500 shrink-0"
                >
                  {formatIsoDate(entry.date)}
                </time>
              )}
            </div>
            {entry.description && (
              <p className="text-sm text-gray-300 leading-relaxed mt-2">{entry.description}</p>
            )}
          </HudCard>
        </li>
      ))}
    </ul>
  );
}
