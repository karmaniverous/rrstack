import type { RuleDescriptorRecur } from '../../descriptor';

export const appendLimits = (
  phrase: string,
  d: RuleDescriptorRecur,
  showCount = false,
): string => {
  if (showCount && typeof d.count === 'number' && d.count > 0) {
    const c = d.count;
    phrase += ` for ${String(c)} occurrence${c === 1 ? '' : 's'}`;
  }
  return phrase;
};
