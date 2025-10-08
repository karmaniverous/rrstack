---
title: JSON Schema & validation
---

# JSON Schema & validation

RRStack ships a JSON Schema for serialized `RRStackOptions` that’s suitable for OpenAPI tooling. The schema mirrors the JSON input shape and intentionally omits advanced constraints to maximize compatibility (e.g., OpenAPI generators that struggle with `anyOf` + conditional `required`).

## Import

```ts
import type { JSONSchema7 } from 'json-schema';
import { RRSTACK_CONFIG_SCHEMA } from '@karmaniverous/rrstack';
```

- `RRSTACK_CONFIG_SCHEMA` is a `JSONSchema7` object.
- Use it with your validator of choice (Ajv, etc.).

## OpenAPI‑safe policy

- The published schema omits advanced conditions like:
  - “duration required when freq is present”
  - “duration must be strictly positive”
- Those are enforced at runtime by RRStack’s validators (Zod + compilation checks).
- This trade‑off ensures better compatibility with OpenAPI tooling (e.g., serverless‑openapi‑documenter).

## Example (Ajv)

```ts
import Ajv from 'ajv';
import { RRSTACK_CONFIG_SCHEMA } from '@karmaniverous/rrstack';

const ajv = new Ajv({ allErrors: true, strict: false });
const validate = ajv.compile(RRSTACK_CONFIG_SCHEMA);

const data = {
  timezone: 'UTC',
  rules: [{ effect: 'active', options: {} }],
};

if (!validate(data)) {
  console.error(validate.errors);
}
```

## See also

- Types and shapes: [Core API and Types](./api.md#types-selected)
- Ingestion and notices: [Configuration & update()](./configuration.md#update-and-notices)
