import type { TFunction } from '@openjcockpit/i18n';

/**
 * The server sends the Quality sample rows as English text. Known rows are translated
 * here by their text; anything else (a real value, a number) is shown as sent.
 */
const KEYS: Record<string, Record<string, string>> = {
  'quality.controls': {
    'Unit test coverage': 'quality.controls.unitTestCoverage',
    'NIST 2': 'quality.controls.nist2',
    'OWASP ZAP': 'quality.controls.owaspZap',
    'ISO 25010': 'quality.controls.iso25010',
    SAST: 'quality.controls.sast',
    'Dependency scan': 'quality.controls.dependencyScan',
    'Architecture rules': 'quality.controls.architectureRules',
  },
  'quality.details': {
    'No critical issues': 'quality.details.noCriticalIssues',
    '8/8 attributes': 'quality.details.allAttributes',
    'No high issues': 'quality.details.noHighIssues',
    'No known vulnerabilities': 'quality.details.noKnownVulnerabilities',
    '0 deviations': 'quality.details.noDeviations',
  },
};

function sampleLabel(t: TFunction<'dashboard'>, group: string, raw: string) {
  const key = KEYS[group]?.[raw];
  return key ? t(key as never) : raw;
}

export const controlName = (t: TFunction<'dashboard'>, raw: string) =>
  sampleLabel(t, 'quality.controls', raw);
export const controlDetail = (t: TFunction<'dashboard'>, raw: string) =>
  sampleLabel(t, 'quality.details', raw);
