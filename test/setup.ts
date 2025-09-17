export {};
// Enable React 18/19 act() support in this test environment.
// See: https://react.dev/warnings/react-dom-test-utils
// Vitest + happy-dom needs this flag explicitly.
declare global {
   
  var IS_REACT_ACT_ENVIRONMENT: boolean | undefined;
}

// Assign without tripping index signature errors.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
