import type { FrequencyLexicon } from './lexicon';
import type { DescribeTranslator } from './translate/strict';

/**
 * Unified configuration for rule descriptions.
 * Translators own the entire sentence (effect, duration, cadence, bounds, tz).
 */
export interface DescribeConfig {
  /** Translator chooser (default: 'strict-en'). */
  translator?: 'strict-en' | DescribeTranslator;
  /** Timezone label policy. */
  tz?: {
    show?: boolean;
    formatLabel?: (tzId: string) => string;
  };
  /** Inline bounds policy (no brackets). */
  bounds?: {
    show?: boolean;
    /** Luxon toFormat string when provided; otherwise ISO without ms. */
    format?: string;
  };
  /**
   * Series limits policy:
   * - 'none' (default): no count/until/from appended.
   * - 'dateOnly': append date-only "from YYYY-LL-DD" (if starts) and "until YYYY-LL-DD" (if ends).
   * - 'countOnly': append only "for N occurrence(s)" (if count).
   * - 'dateAndCount': append date-only from/until and count.
   */
  limits?: 'none' | 'dateOnly' | 'countOnly' | 'dateAndCount';
  /** Time-of-day formatting in the rule timezone. */
  time?: {
    timeFormat?: 'hm' | 'hms' | 'auto';
    hourCycle?: 'h23' | 'h12';
  };
  /** Locale applied to label/time rendering (Luxon setLocale). */
  locale?: string;
  /** Ordinal labels (e.g., third vs 3rd). */
  ordinals?: 'long' | 'short';
  /** Lowercase labels (default: true). */
  lowercase?: boolean;
  /** Frequency lexicon overrides. */
  lexicon?: Partial<FrequencyLexicon>;
}
