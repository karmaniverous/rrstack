import type { FrequencyLexicon } from './lexicon';
import type { DescribeTranslator } from './translate/strict';

/**
 * Unified configuration for rule descriptions.
 * Translators own the entire sentence (effect, duration, cadence, bounds, tz).
 */
export interface DescribeConfig {
  /** Translator chooser (default: 'strict-en'). */
  translator?: 'strict-en' | DescribeTranslator;
  /** Show "(timezone <label>)" after the sentence. */
  showTimezone?: boolean;
  /** Customize timezone label string. */
  formatTimezoneLabel?: (tzId: string) => string;
  /** Show inline bounds: "from … until …". */
  showBounds?: boolean;
  /** Format for bounds when shown (Luxon toFormat); default ISO without ms. */
  boundsFormat?: string;
  /** Append "for N occurrence(s)" when a COUNT is present. */
  showRecurrenceCount?: boolean;
  /** Time-of-day formatting in the rule timezone. */
  timeFormat?: 'hm' | 'hms' | 'auto';
  /** 24h vs 12h clock for time-of-day formatting. */
  hourCycle?: 'h23' | 'h12';
  /** Locale applied to label/time rendering (Luxon setLocale). */
  locale?: string;
  /** Ordinal labels (e.g., third vs 3rd). */
  ordinals?: 'long' | 'short';
  /** Lowercase labels (default: true). */
  lowercase?: boolean;
  /** Frequency lexicon overrides. */
  lexicon?: Partial<FrequencyLexicon>;
}
