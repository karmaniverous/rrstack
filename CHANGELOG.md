### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### [0.8.1](https://github.com/karmaniverous/rrstack/compare/0.8.0...0.8.1)

- updated docs [`5524cd6`](https://github.com/karmaniverous/rrstack/commit/5524cd6b557f80be03d2f8bda3d19fb1d53fcba1)
- perf(bounds): add pre-pass for earliest/latest [`bc616e1`](https://github.com/karmaniverous/rrstack/commit/bc616e1f2e76998e1d38dc1049b225665e060d69)
- perf(bounds): candidate-filtered backward sweep for latest [`d6fb825`](https://github.com/karmaniverous/rrstack/commit/d6fb82574a4fd5bc10216db0515e356e39f30613)
- docs(react): README blurb + detailed hooks page [`e9ff7a1`](https://github.com/karmaniverous/rrstack/commit/e9ff7a1816051d6452eba773adeae893c49c7452)
- test(bounds): add additional scenarios for getEffectiveBounds [`3936eee`](https://github.com/karmaniverous/rrstack/commit/3936eeec375fedc278fbc7d32248bcc929d2ac6e)
- perf(bounds): candidate-filtered jump sweep for earliest [`149153d`](https://github.com/karmaniverous/rrstack/commit/149153dce350f091bfd06bf0682f2a6dcdc0f554)
- fix(bounds): make backward reset strictly-before cursor to ensure progress [`a37a3b7`](https://github.com/karmaniverous/rrstack/commit/a37a3b77ab8bce147431eb566fc8cf3ad801abb8)
- chore(bounds): lint fixes for candidate-jump sweep [`e6966e2`](https://github.com/karmaniverous/rrstack/commit/e6966e2d5a5f9d321ee5668f3adb70300338bbbf)
- fix(bounds): step prevEnd to prior occurrence when &gt;= cursor in backward reset [`6e3fe28`](https://github.com/karmaniverous/rrstack/commit/6e3fe28c51b5334c26b272425a42afc36a8abdc8)
- perf(bounds): cheaper probe status via lastStartBefore+end [`742540b`](https://github.com/karmaniverous/rrstack/commit/742540b645340631daa078c991e9713ff4ceb75d)
- test(bounds): complete bounds.more final case; fix TS1005 [`4216306`](https://github.com/karmaniverous/rrstack/commit/4216306bcba879f74731560f55e09097ae1b0408)
- fix(bounds): track status in backward fallback to remove TS2367 [`78bc0fd`](https://github.com/karmaniverous/rrstack/commit/78bc0fded725a8e45907147e3648f9f66734048e)
- test(bounds): fix seconds-mode clamps in bounds.more (use sec()) [`8df0027`](https://github.com/karmaniverous/rrstack/commit/8df0027fb8815a5dffb1e5cc71e74238e3d9f796)
- updated stan [`981eb4f`](https://github.com/karmaniverous/rrstack/commit/981eb4fb1df09cbaab5c08f8579699f7cb495f75)

#### [0.8.0](https://github.com/karmaniverous/rrstack/compare/0.7.1...0.8.0)

> 17 September 2025

- feat: RRStack subscribe/unsubscribe + React hooks and subpath export [`2c38f3b`](https://github.com/karmaniverous/rrstack/commit/2c38f3b9fca0875b92d2d6b9a8f9b619147627e8)
- updated docs [`3bd81de`](https://github.com/karmaniverous/rrstack/commit/3bd81deee0cdbab9d77a8c8e0dc5714902834bfb)
- updated docs [`acb60b6`](https://github.com/karmaniverous/rrstack/commit/acb60b675961b54ee08e83def7bfb5dc2bd2977e)
- chore: release v0.8.0 [`8f8872e`](https://github.com/karmaniverous/rrstack/commit/8f8872ec6bb6e7c0d92f91389f5d41f31f1c716a)
- test(react): add leading debounce and flush() cases [`310e014`](https://github.com/karmaniverous/rrstack/commit/310e01404a17d8bffb9a38690dfb351c320fcf69)
- fix(react): make useRRStack debounce/flush stable across renders [`8154593`](https://github.com/karmaniverous/rrstack/commit/815459371a3e7c72071e86c800b7a3fa9e2f12d4)
- test(react): await microtask inside async act callbacks [`983cc17`](https://github.com/karmaniverous/rrstack/commit/983cc17cc0ddfbcc451e4a0565954bb2f6e9101e)
- fix(react): make flush() timer-proof; raise bounds test timeout [`9dd73ea`](https://github.com/karmaniverous/rrstack/commit/9dd73ea76315da659d46b658336fbb3f80c27509)
- fix(react): initialize refs and clean lints in useRRStack [`e686a9c`](https://github.com/karmaniverous/rrstack/commit/e686a9caa905115ccb5ccd4071251e96a6ac7630)
- fix(react): ensure flush() sees pending; raise test timeout [`2893a75`](https://github.com/karmaniverous/rrstack/commit/2893a75b0ed76d34a5d26c8dabdcf603e1c4bb0c)
- dev(react): add DOM types and fix act import in tests [`e7b1d6a`](https://github.com/karmaniverous/rrstack/commit/e7b1d6ac796b71ce37a758d390a3a0e0663cd570)
- fix(react): make useRRStack snapshot timer-proof; lint clean [`f8ab8a9`](https://github.com/karmaniverous/rrstack/commit/f8ab8a90a2ff1d8cfe6356cc24307e4ede1a4be5)
- test(react): fix TS global augmentation and flush effects with async act [`1679610`](https://github.com/karmaniverous/rrstack/commit/167961063013d6ce72c4933a8cd4176d88c45be2)
- test(react): enable act() via setup; register in Vitest [`94ce684`](https://github.com/karmaniverous/rrstack/commit/94ce6841c7d548f95464817490a3074ba908a581)
- fix(react): use monotonic snapshot in useRRStack [`24285fd`](https://github.com/karmaniverous/rrstack/commit/24285fdace4cd4a9d87fb5aa5f9390e6d7d8eb49)
- fix(react): decouple hook version from Date.now [`c6e2960`](https://github.com/karmaniverous/rrstack/commit/c6e296056f311523753df795f1f599be8b37434b)
- fix(react): use monotonic snapshot in useRRStack [`89d9e44`](https://github.com/karmaniverous/rrstack/commit/89d9e44dfc969d766924596c327293363c8f4433)

#### [0.7.1](https://github.com/karmaniverous/rrstack/compare/0.7.0...0.7.1)

> 17 September 2025

- chore: release v0.7.1 [`ef55afe`](https://github.com/karmaniverous/rrstack/commit/ef55afe1f04f19e5c846640fa4a3698b4b8b4d14)
- updated docs [`f5cea8b`](https://github.com/karmaniverous/rrstack/commit/f5cea8bda79cb21154fe601a31b03d3245d924c6)
- test(rrstack): add error-path coverage for mutators [`8b08fee`](https://github.com/karmaniverous/rrstack/commit/8b08fee2a771242115b686c37d2a1a3ab22a3e9d)
- feat(rrstack): add removeRule(index) mutator [`50ee1b3`](https://github.com/karmaniverous/rrstack/commit/50ee1b3a9f1c55afe7476daa89f233241aa79066)
- test(rrstack): add removeRule mutator unit test [`ce323d5`](https://github.com/karmaniverous/rrstack/commit/ce323d5f6e950f8378ba9b2a7b8d17e7a15dfd27)

#### [0.7.0](https://github.com/karmaniverous/rrstack/compare/0.6.1...0.7.0)

> 17 September 2025

- updated docs [`79c9e3e`](https://github.com/karmaniverous/rrstack/commit/79c9e3e6c558a38e2003ce165d0f06ce0bf732c3)
- feat: getSegments limit and RRStack rule mutators [`3dfcd1c`](https://github.com/karmaniverous/rrstack/commit/3dfcd1c27eef9ef9da872638d73c05e8ab87cc78)
- chore: release v0.7.0 [`19576bb`](https://github.com/karmaniverous/rrstack/commit/19576bb63c0a20f4e5eec6a0ed303b100b6d3b4f)
- feat: add rule description helper leveraging rrule.toText [`0e8c13b`](https://github.com/karmaniverous/rrstack/commit/0e8c13bf6139aee4faf659acfc5a71e1d8f65da3)
- docs: add typedoc examples and README open-ended bounds [`f0219b3`](https://github.com/karmaniverous/rrstack/commit/f0219b3afaf2bbe876b7af0e2f76d7a95c5c47ec)
- feat: RRStack.describeRule(index, opts) + fix describe types [`70d28aa`](https://github.com/karmaniverous/rrstack/commit/70d28aa6d97e6f2c801a8fa40144447b0457354b)
- docs: update README for describeRule, segments limit, mutators [`e9ddcca`](https://github.com/karmaniverous/rrstack/commit/e9ddcca7f06e26bee0395f61b3b87b06f75631b6)
- feat(bounds): detect open-ended end in effective bounds [`c5cfa8b`](https://github.com/karmaniverous/rrstack/commit/c5cfa8b81a97e088684b93a52c29dca053f2648b)
- docs: repair README API snippet and comment formatting [`268e9c5`](https://github.com/karmaniverous/rrstack/commit/268e9c53381ea31c8f64f366a5489d94bd7a1b87)
- fix(bounds): set end undefined when active at probe (open end) [`36f1189`](https://github.com/karmaniverous/rrstack/commit/36f1189a82fbcb867824e89c0aada0988b2abf0b)
- fix(bounds): detect open end when future occurrences exist after probe [`d0132c0`](https://github.com/karmaniverous/rrstack/commit/d0132c0350d454e7e4c5763ce5f7f8cc7a87712c)
- docs: README formatting polish and fence hygiene fixes [`e1bc71e`](https://github.com/karmaniverous/rrstack/commit/e1bc71e39c543db96c912d34876a414cf0c8d485)
- docs: finalize README polish (classifyRange + version constant) [`8279574`](https://github.com/karmaniverous/rrstack/commit/82795748d410577350128da22af6b69834dbf01d)
- updated readme [`497576c`](https://github.com/karmaniverous/rrstack/commit/497576cd68e8ec148e4d2c9b6db49d8953dcfd82)
- Added change log to stan excludes [`26bbe4e`](https://github.com/karmaniverous/rrstack/commit/26bbe4eecf604fdb7d298b80a229823388d9ac2c)

#### [0.6.1](https://github.com/karmaniverous/rrstack/compare/0.6.0...0.6.1)

> 14 September 2025

- chore: release v0.6.1 [`0fd7f79`](https://github.com/karmaniverous/rrstack/commit/0fd7f79a0176fa5bda4a1706f9647c77e0936d26)
- fix(rrule): only set 'until' when ends is provided [`730e913`](https://github.com/karmaniverous/rrstack/commit/730e91393479f4024f3176e02b39f6c3cc0052fc)
- fixed test [`9e51ed0`](https://github.com/karmaniverous/rrstack/commit/9e51ed06081345e6e12e74ecbc48878874850f81)

#### [0.6.0](https://github.com/karmaniverous/rrstack/compare/0.5.3...0.6.0)

> 28 August 2025

- chore: release v0.6.0 [`5753c60`](https://github.com/karmaniverous/rrstack/commit/5753c6033ae7029541d0215495faff71bbca855e)
- feat(api)!: RRStack.isActiveAt now returns boolean [`04d69ab`](https://github.com/karmaniverous/rrstack/commit/04d69abff0a952c06914d1717d475cca2c2b44d3)

#### [0.5.3](https://github.com/karmaniverous/rrstack/compare/0.5.2...0.5.3)

> 28 August 2025

- chore: release v0.5.3 [`0afcc59`](https://github.com/karmaniverous/rrstack/commit/0afcc5961689d45872e7e9aba7e61bac60919e14)
- fix(types): emit dist/index.d.ts for TS resolution [`ca788bb`](https://github.com/karmaniverous/rrstack/commit/ca788bb341ad7aa210b98ed797ebb9a03932f8f7)

#### [0.5.2](https://github.com/karmaniverous/rrstack/compare/0.5.1...0.5.2)

> 28 August 2025

- fix(rrule): harden ESM/CJS interop with runtime shim [`ada51d1`](https://github.com/karmaniverous/rrstack/commit/ada51d17aacd5d7d8bbdde3caf0346fb631975fe)
- chore: release v0.5.2 [`4db1e84`](https://github.com/karmaniverous/rrstack/commit/4db1e84726d0fc3f4b9322e752ab39fd158eee41)
- fix(shim): clean TS/lint and harden rrule interop [`b42a48f`](https://github.com/karmaniverous/rrstack/commit/b42a48fec3f151744883105df5c85b8c2185ccf3)

#### [0.5.1](https://github.com/karmaniverous/rrstack/compare/0.5.0...0.5.1)

> 28 August 2025

- chore: release v0.5.1 [`7f8e90f`](https://github.com/karmaniverous/rrstack/commit/7f8e90fd69c7ea0721146392fd6aeb5895144387)
- fix(rrule): robust ESM/CJS interop via namespace import [`7d407f0`](https://github.com/karmaniverous/rrstack/commit/7d407f011085cdd8c806c8945a297173430092ba)

#### [0.5.0](https://github.com/karmaniverous/rrstack/compare/0.4.1...0.5.0)

> 28 August 2025

- chore: release v0.5.0 [`c9c3f96`](https://github.com/karmaniverous/rrstack/commit/c9c3f96efd70f272598f2811c24ef5e7d5795683)
- docs update [`ddb871f`](https://github.com/karmaniverous/rrstack/commit/ddb871fbf2f9b4241a827d0d56b4c53682393c5f)
- updated docs [`01eae48`](https://github.com/karmaniverous/rrstack/commit/01eae4829653cbc6427bcb857267647afa95cda1)
- updated docs [`1238954`](https://github.com/karmaniverous/rrstack/commit/12389549448f9d2b3ceee5324fa3b14ad8013918)
- docs: unify README to RRStackOptions; update requirements; prune dev plan [`91093c1`](https://github.com/karmaniverous/rrstack/commit/91093c147953edc202586a034822687abf865452)
- feat(api): unify JSON shape; remove RRStackJson/fromJson; add optional version to RRStackOptions [`37903b1`](https://github.com/karmaniverous/rrstack/commit/37903b107973f64963ca1dd90e2a855ef7c547b1)
- build: externalize runtime dependencies [`a44f603`](https://github.com/karmaniverous/rrstack/commit/a44f6039cf9ff6d180ba760bfa3dc7123811632c)
- fix(tests): satisfy FrequencyStr and optional rules in rrstack.test.ts [`3206904`](https://github.com/karmaniverous/rrstack/commit/320690417d416b47ee77dce5534f315ed5b2180a)
- docs(typedoc): link raw JSON schema on RRSTACK_CONFIG_SCHEMA [`0c35578`](https://github.com/karmaniverous/rrstack/commit/0c35578e38ab488c4fddf78960f8a8dc4da29812)
- docs: fix version constant; update todo [`d3f610f`](https://github.com/karmaniverous/rrstack/commit/d3f610fc7d13dfcc54480bea0aa66346129ee85b)
- docs(todo): add test-fix note and update timestamp [`8b4b80d`](https://github.com/karmaniverous/rrstack/commit/8b4b80d0f4a5c9994194e1de995b85337b7f2e01)
- docs(typedoc): link raw JSON schema on RRSTACK_CONFIG_SCHEMA [`b01476b`](https://github.com/karmaniverous/rrstack/commit/b01476b047249e99e729cc5168faca4fb7129e46)
- updated stan [`26b7680`](https://github.com/karmaniverous/rrstack/commit/26b76807010e4aac1956b736118f6a557ec523cd)
- updated stan [`97225b2`](https://github.com/karmaniverous/rrstack/commit/97225b2047e6f061a4c1bb149383b38b5b95183c)

#### [0.4.1](https://github.com/karmaniverous/rrstack/compare/0.4.0...0.4.1)

> 27 August 2025

- updated docs [`9c11e5d`](https://github.com/karmaniverous/rrstack/commit/9c11e5d979f7d9eaafc7d8405c694c91597bdd4f)
- chore: release v0.4.1 [`566bed9`](https://github.com/karmaniverous/rrstack/commit/566bed99182f5cd58913234893a3949092215a44)
- updated docs [`4d1b3b9`](https://github.com/karmaniverous/rrstack/commit/4d1b3b954674270d6aeb2ff88b1fcecf8bf36846)
- docs(readme): clarify timezone reference and enum [`24b9cdf`](https://github.com/karmaniverous/rrstack/commit/24b9cdf284c5f89703ad615de39e0981cd07d254)
- updated release script [`d9e8b76`](https://github.com/karmaniverous/rrstack/commit/d9e8b768ccf2dd21057ad7336ce3df2367935c49)
- updated engines [`59fcc13`](https://github.com/karmaniverous/rrstack/commit/59fcc13ddfe30076184049182ee7bb50ef7b1b8b)
- relese script update [`df2fae4`](https://github.com/karmaniverous/rrstack/commit/df2fae486c93e1882437f5dc109411cd6e0e5743)

#### [0.4.0](https://github.com/karmaniverous/rrstack/compare/0.3.0...0.4.0)

> 27 August 2025

- update stan [`414f81b`](https://github.com/karmaniverous/rrstack/commit/414f81b11a784324c4a4f481168dba8789cc14a4)
- feat(schema): export RRSTACK_JSON_SCHEMA and generate from Zod [`d4e55d2`](https://github.com/karmaniverous/rrstack/commit/d4e55d277d46bf2088daee88e48e441bd4930393)
- feat: human-readable freq strings; map to rrule enum [`d6dd75a`](https://github.com/karmaniverous/rrstack/commit/d6dd75ab53c0100a426b4a585ea8cb2387e68cb7)
- fix(schema): pass typecheck/lint; decouple TZ refine [`e27aaf4`](https://github.com/karmaniverous/rrstack/commit/e27aaf425ee65e57cb4b73577f37f7d54f5171e5)
- chore(schema): rename artifact to rrstackconfig.schema.json [`8b6f9f2`](https://github.com/karmaniverous/rrstack/commit/8b6f9f26ab9e92de2b3844038d83bb3c9c3fb7d6)
- fix(schema): make freq enum generator-safe; relax typing [`a960e17`](https://github.com/karmaniverous/rrstack/commit/a960e1717dde28f997a3510d81a39f71e78d0a65)
- chore: release v0.4.0 [`ba25010`](https://github.com/karmaniverous/rrstack/commit/ba25010e062c2680a5a062e8ce182b5326b30683)
- updated docs [`11600cf`](https://github.com/karmaniverous/rrstack/commit/11600cf227007094d63c22b29f6ffdc05f632b41)
- fix(schema-gen): locate RR root under defs/$defs; add positivity anyOf [`e0925ef`](https://github.com/karmaniverous/rrstack/commit/e0925efa0ca3759e83b3363aeeb558d9d85f3936)
- updated docs [`5eaa83d`](https://github.com/karmaniverous/rrstack/commit/5eaa83d46854b13ba8dc61390429019026281b84)
- feat(schema): enforce freq string enum; fix starts typo [`51748fc`](https://github.com/karmaniverous/rrstack/commit/51748fc88e68f08d2f505885833ba9d2554e0b7b)
- test(schema): resolve $ref to DurationParts in schema test [`701f1e0`](https://github.com/karmaniverous/rrstack/commit/701f1e0ebf84dab9fa854dff9672dd0ac31d6eb8)
- chore(schema): emit RRStackOptions (no version) as JSON Schema [`b808b50`](https://github.com/karmaniverous/rrstack/commit/b808b50d2543a4a6011d65ec905d206ea2c92446)
- # RRStack — Requirements and Development Plan [`b3cc2f3`](https://github.com/karmaniverous/rrstack/commit/b3cc2f32ecbd0d8c62d138e451acebf235dd9bc0)
- docs: add JSON Schema section and update plan [`32cfc06`](https://github.com/karmaniverous/rrstack/commit/32cfc0627588b5c3afe001096f50a71421fb44b2)
- test(schema): resolve Rule $ref before DurationParts $ref [`9aed707`](https://github.com/karmaniverous/rrstack/commit/9aed707b89211fdf33f8b03202e8945b0cd972f4)

#### [0.3.0](https://github.com/karmaniverous/rrstack/compare/0.2.0...0.3.0)

> 25 August 2025

- Reverted leakage from another project [`0bbabf9`](https://github.com/karmaniverous/rrstack/commit/0bbabf93a6c2a1364ce445eb4a16e51b89a4f77d)
- fix(bounds): use safe far-future probe and avoid domainMax to stabilize latest-end and open-end detection [`48214dd`](https://github.com/karmaniverous/rrstack/commit/48214dd13ddda1b5aa6d05452301e5ac77648b77)
- chore: split RRStack.ts and add tests for bounds/heap/seconds [`f016859`](https://github.com/karmaniverous/rrstack/commit/f016859af2a9ff1560aee5d8d1ac55f61662c2f4)
- chore: release v0.3.0 [`118cf86`](https://github.com/karmaniverous/rrstack/commit/118cf86d68a682c7f7582511a4a4775fb1495926)
- test: add coverage for duration, re-exports, enumeration, patterns; bump plan date [`600954b`](https://github.com/karmaniverous/rrstack/commit/600954b6f47b8cf7877403d11ec742b81cc442e1)
- feat(duration): adopt structured DurationParts and update API/docs/tests [`abde6f3`](https://github.com/karmaniverous/rrstack/commit/abde6f37ecd711922cf126f7f507e32c3211af33)
- docs(readme): add duration helpers and API import [`923b2b2`](https://github.com/karmaniverous/rrstack/commit/923b2b26d928ddb45b9bc33bfc5912325217a8eb)
- fix(bounds): open-end short-circuit and correct reverse stepping for latest end [`f08de4d`](https://github.com/karmaniverous/rrstack/commit/f08de4dba62b4eb9cf266225ecdf0cf30376888a)
- chore: complete remaining next steps (bounds tests, DX/Docs) [`8109213`](https://github.com/karmaniverous/rrstack/commit/8109213e34bf3095f25036aece10838a6ed24e00)
- fix(bounds): compute both earliest start and latest end [`29c45ec`](https://github.com/karmaniverous/rrstack/commit/29c45eca0698c586eb115ffe788bea13e9ec8a40)
- fix: make duration.ts eslint/tsdoc clean [`383f43e`](https://github.com/karmaniverous/rrstack/commit/383f43ea3852f3cc80a011c60fcec820a5b9312c)
- docs(tsdoc): escape inline braces and “&gt;” in types [`d53bff1`](https://github.com/karmaniverous/rrstack/commit/d53bff1f289af899f89bc2ae894354c0bd8bc29e)
- chore: fix lint and tests (guard __RRSTACK_VERSION__, remove unused imports) [`87d39e0`](https://github.com/karmaniverous/rrstack/commit/87d39e04244ee706e68a1a25e28b1526b59426ed)
- test(lint): remove any cast in duration helpers test [`be6482f`](https://github.com/karmaniverous/rrstack/commit/be6482f65394832b9b7a3b4179b58f7aa41abb3a)

#### [0.2.0](https://github.com/karmaniverous/rrstack/compare/0.1.0...0.2.0)

> 25 August 2025

- feat: unit-aware options, JSON shape, and coverage split [`377320f`](https://github.com/karmaniverous/rrstack/commit/377320f73f54375c93258a68a0f5f0ae20dec92d)
- split sweep.ts; add segments/bounds/util and update plan [`bdcca73`](https://github.com/karmaniverous/rrstack/commit/bdcca737c4f793e8b9e0bc9d9d0a3c5150a9a832)
- docs: refresh README and add TypeDoc across API [`a08fcb0`](https://github.com/karmaniverous/rrstack/commit/a08fcb0166266e2476527e9467815f218ec0957a)
- chore: release v0.2.0 [`c15da99`](https://github.com/karmaniverous/rrstack/commit/c15da995674f8ca371bc75d950b96eed82f3ec9e)
- docs: add project requirements and update dev plan [`2aa01ce`](https://github.com/karmaniverous/rrstack/commit/2aa01ceeceaa50312661b27bd5869b1f95a128ee)
- fix: complete tests, TS typings, and streaming sweep [`3d3a13d`](https://github.com/karmaniverous/rrstack/commit/3d3a13d4af5db71f99eb0ab13389bad735a19796)
- fix: complete tests, TS typings, and streaming sweep [`26c59a1`](https://github.com/karmaniverous/rrstack/commit/26c59a13d47ea55050a768ed8e33b649930d5119)
- inject version define and tighten test coverage [`9533af7`](https://github.com/karmaniverous/rrstack/commit/9533af763e23dc740e355feeb5301a75d5fd0045)
- fix: unbreak vitest config comment and harden version parse [`4d7a973`](https://github.com/karmaniverous/rrstack/commit/4d7a973665d210bc9a2d04cdbe48c11e810c1e71)
- fix: lint errors and update dev plan [`731b35c`](https://github.com/karmaniverous/rrstack/commit/731b35c2cd77f08795be993b55210812e3d9af3e)
- docs(tsdoc): fix links and inline braces; fence examples [`31adc0f`](https://github.com/karmaniverous/rrstack/commit/31adc0f07bfe36e5ecacab56638f8c17b7c846f0)
- doc: fix version constant name in dev plan [`3bb80bd`](https://github.com/karmaniverous/rrstack/commit/3bb80bdc1f82c5717ba7f59cac6dbdc23e35e85e)

#### 0.1.0

> 24 August 2025

- Initial commit [`dd084c1`](https://github.com/karmaniverous/rrstack/commit/dd084c11b6a0261bebe0e83cb9f30f20061581fd)
- stan init [`eb0690d`](https://github.com/karmaniverous/rrstack/commit/eb0690d3e3cf0f356b28ed8f78647a57c6e937c6)
- Append progress update to dev plan; propose STAN prompt tweak [`475a94b`](https://github.com/karmaniverous/rrstack/commit/475a94ba527c46495744d9acd2de7666b67320c9)
- updated readme [`52a52b7`](https://github.com/karmaniverous/rrstack/commit/52a52b7d3ebe3b1d744d6f310a112ee1f16f2030)
- chore: fix vitest hangs, improve types, and refactor RRStack [`dc8a176`](https://github.com/karmaniverous/rrstack/commit/dc8a176258ecf44e1666cef8181fb31c1481eefa)
- chore: release v0.1.0 [`b613485`](https://github.com/karmaniverous/rrstack/commit/b61348531983324cb267a5f006d4d83b0997990c)
- fix(coverage): use epoch from rrule.between(); remove double tz conversion [`bf40447`](https://github.com/karmaniverous/rrstack/commit/bf40447419ff204998ece65f4d595bc85e4dfa66)
- fix: support DAILY rules with starts at midnight (req #1) [`ffb4911`](https://github.com/karmaniverous/rrstack/commit/ffb491148649fd7785f3f60d32be013ab5825c82)
- test: anchor q2‑months scenario dtstart to first occurrence [`159a7ad`](https://github.com/karmaniverous/rrstack/commit/159a7ad3ee4f87d9d3e0638a9122643c9b2130e6)
- test: restore q2‑months scenario (skipped); plan TZ provider [`00c0dff`](https://github.com/karmaniverous/rrstack/commit/00c0dff7e9a1afb46597a38f56b03ae4e0534e48)
- Stabilize template baseline [`ff30e2a`](https://github.com/karmaniverous/rrstack/commit/ff30e2ab3a2b23f6e5fce50f7707926d3eb10ad5)
- fix(vitest): normalize watchExclude defaults [`e7636c6`](https://github.com/karmaniverous/rrstack/commit/e7636c6f6ee9c13178b41c3c1680cc725ab26898)
- fix: robust nth-weekday TZ coverage with local fallback [`054a35a`](https://github.com/karmaniverous/rrstack/commit/054a35afb91874944a3dbc9b150ba0813a7529c5)
- chore: remove template foo/CLI and fix lint in coverage [`f58b2e7`](https://github.com/karmaniverous/rrstack/commit/f58b2e7b1937cec092f19e47f7977d4030570e51)
- feat(test): add 3‑rule America/Chicago scenario [`75b4b65`](https://github.com/karmaniverous/rrstack/commit/75b4b65e76887e074147ce16c00456edc83de022)
- lintfix [`f147dc7`](https://github.com/karmaniverous/rrstack/commit/f147dc7d6a862e49af2e73a5a6a922b416f25a4c)
- test: add odd‑months Chicago scenario alongside skipped q2‑months [`05b761f`](https://github.com/karmaniverous/rrstack/commit/05b761f54de64b9f5828b003304cf7f17c596103)
- dev prep [`92e19a9`](https://github.com/karmaniverous/rrstack/commit/92e19a97d5fcf01e1e09613cd6bde866fbbc7855)
- fix: pass nth-weekday TZ scenarios by day-window enumeration [`389e6bf`](https://github.com/karmaniverous/rrstack/commit/389e6bfee90a29dba0362049b4e0d2490060f0dc)
- test(dst): add DST duration tests; keep scenarios skipped [`bc3e872`](https://github.com/karmaniverous/rrstack/commit/bc3e872b00bf1b5d5dac7c2ba9873cc28567db86)
- fix(coverage): robust instant coverage via enumeration [`7f6e8f1`](https://github.com/karmaniverous/rrstack/commit/7f6e8f1032cc15d07d30da0bf3f8c66cc9a04d6a)
- fix(coverage): robust monthly/yearly detection across environments [`f1332ff`](https://github.com/karmaniverous/rrstack/commit/f1332ff6471673d01910deff80a8fb8fa002b930)
- test: validate daily 09:00 with midnight start (requirement #1) [`4d739d1`](https://github.com/karmaniverous/rrstack/commit/4d739d14ad376f58769b29ff5f179ddbdce439b7)
- docs(todo): clarify rrule window/epoch handling in coverage [`be2f07a`](https://github.com/karmaniverous/rrstack/commit/be2f07af6b4fbd78faa3ba46d352712b0210b9e7)
- add typed tz-local fallback and wire into coverage [`730b075`](https://github.com/karmaniverous/rrstack/commit/730b075c3d4e226ec1ce18cbdcd82efe2c9b8f56)
- test: unskip scenario tests; fix TypeDoc warning [`d136124`](https://github.com/karmaniverous/rrstack/commit/d1361241bbc612e2754f3727dc9e539516721242)
- fix(coverage): convert rrule floating dates to zoned epoch; remove invalid tz arg [`1306a42`](https://github.com/karmaniverous/rrstack/commit/1306a422422f38f2462bf42f1fe97af78be0e477)
- fix(vitest): remove watchExclude, raise timeout; lint clean [`2ac32f3`](https://github.com/karmaniverous/rrstack/commit/2ac32f3610759f4c4da2d03d1e2169aed407ac8d)
- chore: remove unused dev dep and sync dev plan [`a917f71`](https://github.com/karmaniverous/rrstack/commit/a917f71e8628f024c73aaf1b1ce16723df9494b3)
- fix(coverage): tolerate epoch vs floating Date from rrule.before() [`fc2739c`](https://github.com/karmaniverous/rrstack/commit/fc2739ca401403e2f089673aaef1631697e65c13)
- updated system prompt [`79993fb`](https://github.com/karmaniverous/rrstack/commit/79993fb798b8b158cdc2d945d97d8f6fa62315f9)
- fix(coverage): use rrule.before() with wall-clock boundary for robust monthly coverage [`072040a`](https://github.com/karmaniverous/rrstack/commit/072040a482c83a15001cbe81385eefbb12ac0b0f)
- test: stabilize America/Chicago 3-rule scenario [`b004922`](https://github.com/karmaniverous/rrstack/commit/b00492254421078c0f5d4cbfddda3c01fd6844b2)
- fix(tz): use static Luxon import; build wall‑clock dtstart/until [`d901e28`](https://github.com/karmaniverous/rrstack/commit/d901e28eac550eaab210e795361a94d884cc880a)
- fix: always apply tz-local fallback after same-day enumeration [`238a474`](https://github.com/karmaniverous/rrstack/commit/238a474bfacc65bfa9fa01496bf858182397c884)
- fix(tz): evaluate rrule windows in rule timezone; silence coverage ENOENT [`6d629a6`](https://github.com/karmaniverous/rrstack/commit/6d629a680eb2fac4139ff61eff357811f95166e3)
- chore: update dev plan; record TypeDoc warning [`f5c05a5`](https://github.com/karmaniverous/rrstack/commit/f5c05a5a51a2403c76243eb8061ea4746d1e2c21)
- fix: handle Weekday.n=0 for bysetpos+nth-weekday (q2 months) [`2302c4a`](https://github.com/karmaniverous/rrstack/commit/2302c4a7bfb820f6da609a32844687aabd68765a)
- chore: remove leftover dev dep and fix lint in coverage [`0a55eb5`](https://github.com/karmaniverous/rrstack/commit/0a55eb5276adee1cbb9c7488151fe7c3d3744119)
- test: stabilize America/Chicago 3‑rule scenario [`871c6e1`](https://github.com/karmaniverous/rrstack/commit/871c6e10b43ce6ceba28f9425107dd30fe6bfa18)
- test: keep both Chicago scenarios present but skipped [`8456f15`](https://github.com/karmaniverous/rrstack/commit/8456f15c6d9157f4afea02776d1cce21fd01eafd)
- wip [`23c487f`](https://github.com/karmaniverous/rrstack/commit/23c487f6950a6bd5daf71d3aab6e6c5f1b8f3613)
- baselined version [`3bc38e3`](https://github.com/karmaniverous/rrstack/commit/3bc38e31b782decf96dd18ad8e3eaa129ca70c97)
- lintfix [`bc47fd3`](https://github.com/karmaniverous/rrstack/commit/bc47fd37788719b3bd537557095b99f99263b78a)
- fix(tz): use static Luxon import; build wall‑clock dtstart/until [`4ca6155`](https://github.com/karmaniverous/rrstack/commit/4ca6155d5f9102d24d9ff24076a25dd8bcd33d01)
