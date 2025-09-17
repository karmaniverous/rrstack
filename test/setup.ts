// Enable React 18/19 act() support in this test environment.
// See: https://react.dev/warnings/react-dom-test-utils
// Vitest + happy-dom needs this flag explicitly.
declare global {
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
