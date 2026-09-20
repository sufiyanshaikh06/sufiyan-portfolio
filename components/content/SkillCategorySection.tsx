import type { SkillCategory } from '@/lib/types/content';
import { HudCard } from '@/components/ui/HudCard';

interface SkillCategorySectionProps {
  category: Readonly<SkillCategory>;
}

export function SkillCategorySection({ category }: SkillCategorySectionProps) {
  return (
    <HudCard>
      <h2 className="font-display text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="text-neon-cyan text-sm">◈</span>
        {category.name}
      </h2>
      <ul className="flex flex-wrap gap-3" aria-label={`${category.name} skills`}>
        {category.skills.map((skill, i) => (
          <li
            key={`${category.name}-skill-${i}`}
            className="flex flex-col gap-0.5 px-3 py-2 bg-white/5 border border-white/10 rounded min-w-[100px]"
          >
            <span className="text-sm font-medium text-gray-200">{skill.name}</span>
            <span className="text-xs font-mono text-neon-cyan/70">{skill.proficiencyLevel}</span>
          </li>
        ))}
      </ul>
    </HudCard>
  );
}
