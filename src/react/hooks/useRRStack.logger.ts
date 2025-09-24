import type { RefObject } from 'react';

import type { RRStack } from '../../rrstack/RRStack';

export type LogEventType =
  | 'init'
  | 'reset'
  | 'mutate'
  | 'commit'
  | 'flushChanges'
  | 'flushMutations'
  | 'flushRender'
  | 'cancel';

export const createLogger = (
  logger:
    | boolean
    | ((e: { type: LogEventType; rrstack: RRStack }) => void)
    | undefined,
  rrstackRef: RefObject<RRStack>,
) => {
  return (type: LogEventType) => {
    if (!logger) return;
    const payload = { type, rrstack: rrstackRef.current };
    if (logger === true) {
      console.debug('[rrstack]', {
        type,
        tz: rrstackRef.current.timezone,
        ruleCount: rrstackRef.current.rules.length,
      });
    } else {
      try {
        logger(payload);
      } catch {
        /* noop */
      }
    }
  };
};
