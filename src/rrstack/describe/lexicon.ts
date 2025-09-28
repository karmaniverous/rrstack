import type { FrequencyStr } from '../types';

export type FrequencyAdjectiveLabels = Record<FrequencyStr, string>;
export type FrequencyNounLabels = Record<FrequencyStr, string>;

export interface FrequencyLexicon {
  adjective: FrequencyAdjectiveLabels;
  noun: FrequencyNounLabels;
  pluralize?: (noun: string, n: number) => string;
}

export const FREQUENCY_ADJECTIVE_EN: FrequencyAdjectiveLabels = {
  yearly: 'yearly',
  monthly: 'monthly',
  weekly: 'weekly',
  daily: 'daily',
  hourly: 'hourly',
  minutely: 'minutely',
  secondly: 'secondly',
};

export const FREQUENCY_NOUN_EN: FrequencyNounLabels = {
  yearly: 'year',
  monthly: 'month',
  weekly: 'week',
  daily: 'day',
  hourly: 'hour',
  minutely: 'minute',
  secondly: 'second',
};

const defaultPluralize = (noun: string, n: number): string =>
  n === 1 ? noun : `${noun}s`;

export const FREQUENCY_LEXICON_EN: FrequencyLexicon = {
  adjective: FREQUENCY_ADJECTIVE_EN,
  noun: FREQUENCY_NOUN_EN,
  pluralize: defaultPluralize,
};

/**
 * Build UI options for frequency selection from adjective labels.
 * Ordered from lowest to highest cadence.
 */
export const toFrequencyOptions = (
  labels: FrequencyAdjectiveLabels = FREQUENCY_ADJECTIVE_EN,
): { value: FrequencyStr; label: string }[] => {
  const order: FrequencyStr[] = [
    'yearly',
    'monthly',
    'weekly',
    'daily',
    'hourly',
    'minutely',
    'secondly',
  ];
  return order.map((value) => ({ value, label: labels[value] }));
};
