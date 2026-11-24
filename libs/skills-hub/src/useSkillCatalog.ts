import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSkillCatalog, type SkillSpec } from '@openjcockpit/api';
import { useTranslation } from '@openjcockpit/i18n';

/** The route segment of every local skill; marketplace skills use their marketplace id instead. */
export const LOCAL_SOURCE = 'local';

/** Absolute path of a skill's detail page. */
export function skillDetailPath(source: string, name: string): string {
  return `/skills-hub/skills/${encodeURIComponent(source)}/${encodeURIComponent(name)}`;
}

/** One row of the catalogue: a local skill (full spec) or a marketplace skill (name and description only). */
export interface CatalogSkill {
  /** Route segment: `local` or the marketplace id. */
  source: string;
  name: string;
  description: string | null;
  sourceName: string;
  isLocal: boolean;
  /** Only present for local skills; the marketplace contract does not expose more. */
  spec?: SkillSpec;
}

// Same key as the workflow designer's catalogue query, so both screens share one cache entry.
const SKILL_CATALOG_QUERY_KEY = ['skill-catalog'] as const;

export function useSkillCatalog() {
  const { t } = useTranslation('skillsHub');
  const query = useQuery({ queryKey: SKILL_CATALOG_QUERY_KEY, queryFn: getSkillCatalog });
  const { data } = query;

  const skills = useMemo<CatalogSkill[]>(
    () => [
      ...(data?.localSkills ?? []).map((spec) => ({
        source: LOCAL_SOURCE,
        name: spec.name,
        description: spec.description,
        sourceName: t('dashboard.sourceLocal'),
        isLocal: true,
        spec,
      })),
      ...(data?.externalSkills ?? []).map((skill) => ({
        source: skill.marketplaceId,
        name: skill.name,
        description: skill.description,
        sourceName: skill.marketplaceName,
        isLocal: false,
      })),
    ],
    [data, t],
  );

  return { query, skills };
}
