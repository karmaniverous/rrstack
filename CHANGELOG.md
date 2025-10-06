### Changelog

All notable changes to this project will be documented in this file. Dates are displayed in UTC.

#### [0.15.2](https://github.com/karmaniverous/rrstack/compare/0.15.1...0.15.2)

- Centralize defaults and align public param names with RRStackOptions [`03aafff`](https://github.com/karmaniverous/rrstack/commit/03aafff17e5119218adc4740e7d38c4ce5b8e7e0)
- feat(time): align helper params; default timeUnit; fix JSDoc [`22424f4`](https://github.com/karmaniverous/rrstack/commit/22424f46ce19e6ae30a8637a6734af252d5a861e)

#### [0.15.1](https://github.com/karmaniverous/rrstack/compare/0.15.0...0.15.1)

> 6 October 2025

- chore: release v0.15.1 [`dbca052`](https://github.com/karmaniverous/rrstack/commit/dbca052d3bcf9e25d9d0af997d9d9287de44e7cc)
- OpenAPI-safe JSON Schema: remove duration.anyOf; rely on runtime Zod [`74039b3`](https://github.com/karmaniverous/rrstack/commit/74039b36b2d52360c92cf8748cbf9f2501cb09f4)

#### [0.15.0](https://github.com/karmaniverous/rrstack/compare/0.14.0...0.15.0)

> 5 October 2025

- feat(describe): add DescribeOptions.boundsFormat to customize includeBounds rendering [`5e52343`](https://github.com/karmaniverous/rrstack/commit/5e523438b4a6eec11c94e19feff2e85bcdc6671b)
- fix(time): require exact wall match in minute probe for DST gap (tests green) [`6b327dc`](https://github.com/karmaniverous/rrstack/commit/6b327dc496f12c38bde01b9461400bb6cd0eaf6a)
- feat: add timezone conversion helpers (wall time ↔ epoch) [`a9e99a2`](https://github.com/karmaniverous/rrstack/commit/a9e99a24d49e964caeab3437af4d5471ef3c35e0)
- fix(time): treat normalized wall times as invalid; choose earliest valid minute [`bd4bb42`](https://github.com/karmaniverous/rrstack/commit/bd4bb4268722cb3b18d38b5995806d132e93e4f9)
- fix(time): map spring-forward gaps via wall-minute probing (tests green) [`0d9437f`](https://github.com/karmaniverous/rrstack/commit/0d9437fb504e4f5a2f3b2004f00bc6acc2f951cb)
- docs(time): add TypeDoc entries for wallTimeToEpoch/dateOnlyToEpoch/epochToWallDate [`587b65c`](https://github.com/karmaniverous/rrstack/commit/587b65c44df1aefeaf555e023627fb8cbee70cda)
- chore: release v0.15.0 [`d890ef2`](https://github.com/karmaniverous/rrstack/commit/d890ef25967aa72c6d218f0dadc06fe51a716b11)
- fix(time): satisfy TS2775 and map DST forward gap to earliest valid instant [`d4d52ac`](https://github.com/karmaniverous/rrstack/commit/d4d52ac36d7993b0f9aca69e358479a1f50665dd)
- docs: add boundsFormat examples and fix describe defaults [`6a82a4f`](https://github.com/karmaniverous/rrstack/commit/6a82a4fc69ff6d95cf55fd9f3f8f1d4ea53f1cab)

#### [0.14.0](https://github.com/karmaniverous/rrstack/compare/0.13.4...0.14.0)

> 2 October 2025

- fix(update): resolve TS2454 and lint in unit-change notice; drop unused import [`cd85c83`](https://github.com/karmaniverous/rrstack/commit/cd85c83e9a7255854a924f3f7e4733660e131016)
- test: fix TS4104 by typing update() result as readonly Notice[] [`9dcebd0`](https://github.com/karmaniverous/rrstack/commit/9dcebd01bf0b39b3019531d491e9ec80fea2b8cd)
- test: assert update() Notice[] equals policy.onNotice ordering [`7eda06d`](https://github.com/karmaniverous/rrstack/commit/7eda06d5550786b6f100a81a0a82f70364bea8b9)
- docs(test): add policy & notices doc snippet and hook notice test [`f41599e`](https://github.com/karmaniverous/rrstack/commit/f41599e3adf567f7f093f87e5d0b97bbd0a2d625)
- fix: stabilize overlapping edits test; clean knip entry [`8a1e02b`](https://github.com/karmaniverous/rrstack/commit/8a1e02b2218b7ebfec82e3bc6cd0baaa825c04ce)
- feat(update): single ingestion API with version/unit policies; remove updateOptions [`f16e7d7`](https://github.com/karmaniverous/rrstack/commit/f16e7d7ade1c3c5774807a68fd2c890dca1d35a3)
- test: make overlapping-edits final count robust to dev double effects [`e073fb6`](https://github.com/karmaniverous/rrstack/commit/e073fb6ae75bd0f2bc071b4cc980caa43789c68e)
- test(react): coalesce onChange in staged-edits test (single autosave) [`100909b`](https://github.com/karmaniverous/rrstack/commit/100909bc4cf7728d9a5078bbeff990f944a24923)
- fix(types/react): resolve TS6231 and ESLint; improve TSDoc [`d37e8a7`](https://github.com/karmaniverous/rrstack/commit/d37e8a7bd9606c1a9f7179219398508b81d02de8)
- test(docs): add react ingestion/staging tests; README updates [`6fd36b7`](https://github.com/karmaniverous/rrstack/commit/6fd36b7b5a44b976c058a1c3afcc74e913c54890)
- feat(react/docs): policy passthrough + TSDoc polish; docs refreshed [`0b4611e`](https://github.com/karmaniverous/rrstack/commit/0b4611e86e7f69ba23d1dbbef0c47ebe2dfc74ab)
- chore: release v0.14.0 [`483e2c1`](https://github.com/karmaniverous/rrstack/commit/483e2c1440b4e309433b3412bb0f618f07576bb5)
- docs: define update() API, version/unit policies; prune dev plan [`7b71b2a`](https://github.com/karmaniverous/rrstack/commit/7b71b2a9586f4503ab212b02eedee604ab13db47)
- test(update): add engine tests for unit conversion and version policies [`b391098`](https://github.com/karmaniverous/rrstack/commit/b3910989068277feaa97e6613abde78ce440ac06)
- docs: update README/Handbook for update() API and ingestion flow [`38b2f49`](https://github.com/karmaniverous/rrstack/commit/38b2f4993d5a33f52a66082a35aef9ef0a8b3113)
- fix(update): resolve TS2454 and lint in unit-change notice; drop unused import [`0fea7b0`](https://github.com/karmaniverous/rrstack/commit/0fea7b0d0476fd0638b9bfcd6303796171a14366)
- fix(update): narrow unitNotice to timeUnitChange notice variant [`39d1060`](https://github.com/karmaniverous/rrstack/commit/39d10609ebb9d411e67d284aadea6ab5f4e080d9)
- chore(todo): capture typedoc/readme tasks and React nudge [`fd1a65e`](https://github.com/karmaniverous/rrstack/commit/fd1a65e8f1f5b8d1fdf2894feaa85d6c327952bc)

#### [0.13.4](https://github.com/karmaniverous/rrstack/compare/0.13.3...0.13.4)

> 29 September 2025

- fix(describe): yearly fallbacks and bounds clamp display [`32511bf`](https://github.com/karmaniverous/rrstack/commit/32511bf290dbbec6a62d6206229ed0abfb95e363)
- test(describe): cover “or”-joined positioned weekdays and multi-nth [`f2ac4ed`](https://github.com/karmaniverous/rrstack/commit/f2ac4edb183e5a4644a286c4584a5304d08cff62)
- chore: release v0.13.4 [`f4fa4ee`](https://github.com/karmaniverous/rrstack/commit/f4fa4ee62b65eecf4cb1152df0933b6558251338)
- feat(describe): “or”-joined positioned weekdays and multi-nth [`01bc071`](https://github.com/karmaniverous/rrstack/commit/01bc07106797a5cd8cbbc426378b66cf2f99b2ec)

#### [0.13.3](https://github.com/karmaniverous/rrstack/compare/0.13.2...0.13.3)

> 29 September 2025

- fix(react): useRRStack tolerates null/undefined json [`0bc18c9`](https://github.com/karmaniverous/rrstack/commit/0bc18c9983942424bcbebcb745abc5a956d0727e)
- chore: release v0.13.3 [`94471de`](https://github.com/karmaniverous/rrstack/commit/94471deaaedc35f9974c7285db9bd2d59d68e08a)

#### [0.13.2](https://github.com/karmaniverous/rrstack/compare/0.13.1...0.13.2)

> 29 September 2025

- fix(describe): use short ordinals for BYMONTHDAY lists [`aee0761`](https://github.com/karmaniverous/rrstack/commit/aee0761870fdfa464789d1319e846c8717b33907)
- chore: release v0.13.2 [`7742370`](https://github.com/karmaniverous/rrstack/commit/77423705bd671a797f87bdbfceea201a50e07af4)
- feat(describe): lists for month-days and times; tests [`2d84eb3`](https://github.com/karmaniverous/rrstack/commit/2d84eb3322f602693c91f8fccb87dc5eefca0a3f)

#### [0.13.1](https://github.com/karmaniverous/rrstack/compare/0.13.0...0.13.1)

> 29 September 2025

- feat(describe): yearly month(s) + weekday(s) without position [`977fc96`](https://github.com/karmaniverous/rrstack/commit/977fc96bcf61795c8ef0203368e68b6678d33894)
- chore: release v0.13.1 [`5f2cae5`](https://github.com/karmaniverous/rrstack/commit/5f2cae591ba92b707d7e73980358dac53a521a02)
- updated docs [`42eab8e`](https://github.com/karmaniverous/rrstack/commit/42eab8e0cc43242044ff9e42888b75aff2b4b01a)
- test(describe): cover span includeBounds in RRStack.describeRule [`a3d9561`](https://github.com/karmaniverous/rrstack/commit/a3d95616823f933f27385b305c3f26f0560cd4c6)

#### [0.13.0](https://github.com/karmaniverous/rrstack/compare/0.12.4...0.13.0)

> 28 September 2025

- docs(plan): reprioritize Next up; docs/examples first [`10f9aae`](https://github.com/karmaniverous/rrstack/commit/10f9aae3109b0550912a4aefd5416e031698544a)
- fix(describe): add monthly BYSETPOS+weekday phrasing; resolve lints [`4739b04`](https://github.com/karmaniverous/rrstack/commit/4739b04b0b7ad4f842ea092010fa39aa0a2749b6)
- feat(describe): add descriptor/translator architecture and lexicon exports [`aa34f88`](https://github.com/karmaniverous/rrstack/commit/aa34f8809ebd78d7938e94625a4671f955a3223e)
- docs: extract requirements; refactor dev plan; trim project prompt [`dad62a9`](https://github.com/karmaniverous/rrstack/commit/dad62a9979912f3a5b795ca91be4781514d60ba8)
- feat(tests): add BENCH-gated perf suite; fix lint in translator [`bb98cfa`](https://github.com/karmaniverous/rrstack/commit/bb98cfa08df02cbcdec306fce2c8f2161d426641)
- refactor(describe): use Luxon for date/time formatting; keep composition-only [`46da672`](https://github.com/karmaniverous/rrstack/commit/46da672cfd86e2ea663d7276e6112862b0b198f0)
- chore: release v0.13.0 [`ad74033`](https://github.com/karmaniverous/rrstack/commit/ad7403350473499640845579aafbb86df7fd8ccf)
- fix(describe): accept null in asArray and satisfy template literal lint [`d3aca4d`](https://github.com/karmaniverous/rrstack/commit/d3aca4df45582cb14df10bfc7a50505281648b94)
- perf(bench): add monthly closed and yearly count-limited bounds cases [`79556c6`](https://github.com/karmaniverous/rrstack/commit/79556c6a0f051fbd8c86f049e0a253038c1829b3)
- bench: add Node-only mutator benches; split React add bench [`d5d05bd`](https://github.com/karmaniverous/rrstack/commit/d5d05bd7211c43debe2a77f696dbe1632b1f8c7a)
- perf(bench): add monthly 3rd Tue case; docs for lexicon & BENCH [`7d5f7ef`](https://github.com/karmaniverous/rrstack/commit/7d5f7effe43a4b3292432483be8dd9f36ea28d3c)
- fix(describe): add minimal strict-en phrasing for daily time and monthly nth-weekday [`c8048b0`](https://github.com/karmaniverous/rrstack/commit/c8048b0c97ff0d28b884a77bec1ab46d2121eaca)
- test(bench): use blackout baseline for finite earliest start in sanity [`37a0840`](https://github.com/karmaniverous/rrstack/commit/37a08408e42edcd86b69bcbcbd32b4255e27286d)
- test(bench): add assertions and fix lint; update plan [`a9b9d6e`](https://github.com/karmaniverous/rrstack/commit/a9b9d6e20f873a8496d7fc6b668cfb1732732bf5)
- fix(bench): satisfy lint in perf.react.bench.ts (string coercion) [`f5ec624`](https://github.com/karmaniverous/rrstack/commit/f5ec624fa8afe35e76b979fa989eb944c32e5371)
- docs: README + Handbook (Descriptions, Performance); defaults [`8328f59`](https://github.com/karmaniverous/rrstack/commit/8328f5957f866ca660d0c1c17aa0bc09b8f82ce6)
- perf(bench): add count-limited, reverse-sweep, and overlay cases [`116e6ab`](https://github.com/karmaniverous/rrstack/commit/116e6abe340b943e46ee0b219e9534f677e5c51e)
- perf(bench): add React hooks bench; remove ad‑hoc benches; fix cache/TS [`77be485`](https://github.com/karmaniverous/rrstack/commit/77be4851115ecb8a916368090e0702bfe34eb30c)
- docs: add pluggable descriptions + frequency lexicon requirements [`565dd23`](https://github.com/karmaniverous/rrstack/commit/565dd23dc6e81687d749a16b74f795b39c20e221)
- test(bench): integrate vitest bench; add RRStack benchmark suite [`8dba618`](https://github.com/karmaniverous/rrstack/commit/8dba618d9ef7331330682720fae26df2a1c5f6c3)
- test(bench/react): wrap updates in act; enable act env for benches [`98ad76e`](https://github.com/karmaniverous/rrstack/commit/98ad76eed62de849a3d924bc6b6b8c342ce5c4cd)
- docs(api): export description/lexicon types [`6a06005`](https://github.com/karmaniverous/rrstack/commit/6a060053363b381e1b7142ee24c42751597a0f40)
- bench(react): add mutator benchmarks; explain addRule cost [`544a31f`](https://github.com/karmaniverous/rrstack/commit/544a31fcc126c304d7e0a02e40711341302ae10c)
- docs(typedoc): export WeekdayPos to resolve warning [`ff94579`](https://github.com/karmaniverous/rrstack/commit/ff94579bd64f662e354d2663f0b0348ec7505efa)
- docs(api): export descriptor subtypes for Typedoc [`7733693`](https://github.com/karmaniverous/rrstack/commit/773369376d48f110a1f3f55512f22cdb11f1ad86)
- feat(describe): weekly and yearly phrasing; list join; lint fix [`3bc321a`](https://github.com/karmaniverous/rrstack/commit/3bc321ac571f819af4923d0d25ef4729d156d411)
- feat(describe): localized weekday/month labels via Luxon (tz-aware) [`0534025`](https://github.com/karmaniverous/rrstack/commit/05340252e0e8d0214624761f9f66d73eb122a983)
- feat(describe): add COUNT/UNTIL phrasing and yearly multi-month lists [`4f898a5`](https://github.com/karmaniverous/rrstack/commit/4f898a585be6d33c7b18b8b6e20501c1842b573b)
- tests: ensure weekday position/time in descriptions [`44f33c7`](https://github.com/karmaniverous/rrstack/commit/44f33c77716795294a54dc9767d340a56dc361d3)
- refactor(describe): make describe a module with index [`70bda83`](https://github.com/karmaniverous/rrstack/commit/70bda83ce2700b84aaf1b6893f8de324e0262a16)

#### [0.12.4](https://github.com/karmaniverous/rrstack/compare/0.12.3...0.12.4)

> 27 September 2025

- chore: release v0.12.4 [`7b49f8a`](https://github.com/karmaniverous/rrstack/commit/7b49f8ad5ab956389e4b72c25898bda0bf202f5f)
- feat: RRStack.formatInstant to format instants in stack tz/unit [`2f82fde`](https://github.com/karmaniverous/rrstack/commit/2f82fde208efc5c78dafa8d1cda87c504877cbb1)

#### [0.12.3](https://github.com/karmaniverous/rrstack/compare/0.12.2...0.12.3)

> 27 September 2025

- chore: release v0.12.3 [`d06cafd`](https://github.com/karmaniverous/rrstack/commit/d06cafdaf4227e6d9687fc8dae34b9ad41e3b59a)
- feat: add DescribeOptions.formatTimeZone for custom tz labels [`a3df5a2`](https://github.com/karmaniverous/rrstack/commit/a3df5a292b77b9f720edb1840e81f78ccdf93ca5)

#### [0.12.2](https://github.com/karmaniverous/rrstack/compare/0.12.1...0.12.2)

> 27 September 2025

- chore: release v0.12.2 [`07ca515`](https://github.com/karmaniverous/rrstack/commit/07ca515b87e978e3169780821d96106b4794f586)
- feat: allow addRule() with no args (defaults to active span) [`d7dabe8`](https://github.com/karmaniverous/rrstack/commit/d7dabe8b6a0c7e84b2923f54d1743ecb71f989c4)

#### [0.12.1](https://github.com/karmaniverous/rrstack/compare/0.12.0...0.12.1)

> 27 September 2025

- chore: release v0.12.1 [`9d4e451`](https://github.com/karmaniverous/rrstack/commit/9d4e4513a6402c0991b77d85f521e30a49d2d443)
- options -&gt; props [`69fbbac`](https://github.com/karmaniverous/rrstack/commit/69fbbacc84346e911dfd759cc088276dd5ccc6ec)

#### [0.12.0](https://github.com/karmaniverous/rrstack/compare/0.11.1...0.12.0)

> 27 September 2025

- test(react): update useRRStack tests to options object API [`8ccb14e`](https://github.com/karmaniverous/rrstack/commit/8ccb14ec8fd37d5a7962c3470c873e7aee4ebf1f)
- feat(react): debounced options-object API for useRRStackSelector; shared base types [`1472b4d`](https://github.com/karmaniverous/rrstack/commit/1472b4d44b6acc5af8302fb4f23719211e462196)
- docs: update README and handbook; fix hook signatures [`414dd8b`](https://github.com/karmaniverous/rrstack/commit/414dd8bf6013161192926759ab3a4ac6a6c973ef)
- chore: release v0.12.0 [`df31048`](https://github.com/karmaniverous/rrstack/commit/df31048787c03e1d3b6204af46f3b46a467b4c0d)
- updated docs [`b06a19c`](https://github.com/karmaniverous/rrstack/commit/b06a19cb5b0c12ea21ebe72435e1c701088b8e2f)

#### [0.11.1](https://github.com/karmaniverous/rrstack/compare/0.11.0...0.11.1)

> 25 September 2025

- chore: release v0.11.1 [`031e7de`](https://github.com/karmaniverous/rrstack/commit/031e7de7182adc33075e83b9dded6275527b8efe)
- perf(bounds): 100× faster getEffectiveBounds (no far-future scans) [`972b7a9`](https://github.com/karmaniverous/rrstack/commit/972b7a94374e29489033fe7080ee4273b45bf860)
- docs(handbook): add deep-dive Algorithms page and link from Handbook [`9730ac7`](https://github.com/karmaniverous/rrstack/commit/9730ac7590238dd1ac1401576d64ccb0ad1bc4d4)
- updated docs [`b2acba0`](https://github.com/karmaniverous/rrstack/commit/b2acba08111d9f6790eb8f470d51da4183b2de69)
- docs(react): include all debounce methods in examples [`d06da72`](https://github.com/karmaniverous/rrstack/commit/d06da72796c707fac6aab1a40613c9654cd8a9cc)
- fix(bounds): finite probe + reverse sweep; cascade-correct latest end [`3d2a914`](https://github.com/karmaniverous/rrstack/commit/3d2a914aa86367332da50469822769351188e502)
- fix(bounds): return probe when active before probe; strict backstep; add stan:build [`05d9b10`](https://github.com/karmaniverous/rrstack/commit/05d9b10298b03239e916a0d7aa7690d0f6745c08)
- fix(bounds): parametric latest-end (probe) and robust backstep [`364063b`](https://github.com/karmaniverous/rrstack/commit/364063b52fbfa62d2068d0c3f99bfe6073e8cef6)
- updated stan [`a35b79e`](https://github.com/karmaniverous/rrstack/commit/a35b79eca0eb6cfc8c75d89e673416890644fd02)

#### [0.11.0](https://github.com/karmaniverous/rrstack/compare/0.10.0...0.11.0)

> 25 September 2025

- wip decomposition [`3b69e27`](https://github.com/karmaniverous/rrstack/commit/3b69e2783ee0a97d54cc08ff869a46a62fb0088d)
- feat(react): mutateDebounce proxy; rename debounce-&gt;changeDebounce; flush-&gt;flushChanges [`c0424a0`](https://github.com/karmaniverous/rrstack/commit/c0424a02911b315d3840f95fc7208ad43a5aa998)
- refactor(react): wire useRRStack to extracted hooks; resolve knip unused [`024e962`](https://github.com/karmaniverous/rrstack/commit/024e962c4b6c81bdff5f6a2b63b55f74232cb56d)
- chore: release v0.11.0 [`f465e75`](https://github.com/karmaniverous/rrstack/commit/f465e75849a569ec4fbc8b7522b8144e8fcccc70)
- docs(react): full listings after apply/render debounce additions [`20a9519`](https://github.com/karmaniverous/rrstack/commit/20a9519b0d028d96752a48ac3710ddc33e14ed36)
- wip useRRStack decomposition [`a639052`](https://github.com/karmaniverous/rrstack/commit/a6390528b897c535652f9adb40eb8faa9ed0b1ae)
- chore(react): fix lint/type errors; complete mutate facade; prep hook split [`1f93645`](https://github.com/karmaniverous/rrstack/commit/1f93645032470d118d095753d9741878c06c3c33)
- chore(react): fix mutateFacade and remove stray file causing lint failures [`afe384c`](https://github.com/karmaniverous/rrstack/commit/afe384c591be552ec3fb04e8610e76bdff73e613)
- docs(react): update README/handbook for new hook APIs; bump v0.11.0 [`24b3522`](https://github.com/karmaniverous/rrstack/commit/24b35225dd4c4c731280b66071528e94dd331040)
- docs(react): debounced form controls; policy note [`257453f`](https://github.com/karmaniverous/rrstack/commit/257453f46767222f042a5b21e3283215e6a8bc08)
- refactor(react): complete hooks split; fix render module; harden facade [`b04f727`](https://github.com/karmaniverous/rrstack/commit/b04f727639b2d7b5b7abf28abf71553ab5369199)
- test(react): migrate useRRStack tests to changeDebounce/flushChanges [`9405b9a`](https://github.com/karmaniverous/rrstack/commit/9405b9a341087ceacac24d412cb47314cf7c9796)
- chore: finalize v0.11.0 — lint cleanups, changelog, version bump [`fa4f14a`](https://github.com/karmaniverous/rrstack/commit/fa4f14a0fdebfb07e7e24ecb7933d7e6addcd0d5)
- test(react): guard effect-driven mutations to avoid double-adds in dev [`f78929f`](https://github.com/karmaniverous/rrstack/commit/f78929ffd3229fa62c856a47821fc0a7f1b2ae44)
- updated stan [`ca7aaf1`](https://github.com/karmaniverous/rrstack/commit/ca7aaf151e7c28f11659e7b224f147de3a36699f)

#### [0.10.0](https://github.com/karmaniverous/rrstack/compare/0.9.0...0.10.0)

> 24 September 2025

- chore(todo): keep only defaultEffect items in Completed [`4064ba7`](https://github.com/karmaniverous/rrstack/commit/4064ba77397779ab44542c12fdc1e5ba7a2d8dc9)
- chore: release v0.10.0 [`a142193`](https://github.com/karmaniverous/rrstack/commit/a142193be279b416c7bc45f170ee04b698bca83c)
- feat: add defaultEffect baseline and virtual rule [`cc8c41b`](https://github.com/karmaniverous/rrstack/commit/cc8c41b2de1eef703a84e8ad52bfad7c8e989009)
- feat(schema): defaulted options optional; tests + docs [`3c2c5b8`](https://github.com/karmaniverous/rrstack/commit/3c2c5b8bd59c6bd8b8e2645d67f41411facade83)
- fix: include defaultEffect in setters; clean baseline lint [`f32a3ed`](https://github.com/karmaniverous/rrstack/commit/f32a3ed113cdcd49d46d51d14dbab3392df6a528)
- fix(schema,types): optional defaults TS-safe; keep rules optional in schema [`a0cd7e3`](https://github.com/karmaniverous/rrstack/commit/a0cd7e3f38937eedadd74cf8699a3b750387cc9f)
- chore(lint): validate rules in normalizeOptions; no unsafe spread [`b1e3856`](https://github.com/karmaniverous/rrstack/commit/b1e3856b372d3855ca6ec22d62dd0b4e4b2d86b5)
- chore(lint): escape '&gt;' in TSDoc; update dev plan [`b2907d6`](https://github.com/karmaniverous/rrstack/commit/b2907d6e22897e30ee33dc1a58070371b6283847)
- updated stan [`a478c4b`](https://github.com/karmaniverous/rrstack/commit/a478c4b5eebc7dd29583a076a7d142abe7cd90f2)

#### [0.9.0](https://github.com/karmaniverous/rrstack/compare/0.8.2...0.9.0)

> 21 September 2025

- chore: fix lint and knip; remove unused devDependency [`d55bec4`](https://github.com/karmaniverous/rrstack/commit/d55bec42b67a11cd15a4caab0c6449d48a8efb49)
- refactor(bounds): split getEffectiveBounds into focused modules [`97c7674`](https://github.com/karmaniverous/rrstack/commit/97c767453d150255ca52c8e0403ba468df74794a)
- feat: add continuous (span) rules (no freq → duration omitted) [`bc1ffda`](https://github.com/karmaniverous/rrstack/commit/bc1ffda9185bf44d6753a6e13b825e4652677b5a)
- build!: migrate to Zod v4 JSON Schema + ESLint flat config [`8174047`](https://github.com/karmaniverous/rrstack/commit/817404726829d75ea9e757efa32409c610aed947)
- chore: adopt @vitest/eslint-plugin; strict type-aware lint; Zod v4 JSON schema [`6dc797a`](https://github.com/karmaniverous/rrstack/commit/6dc797a2d4253d98e811532daa0921fa24381157)
- chore: release v0.9.0 [`baf87dc`](https://github.com/karmaniverous/rrstack/commit/baf87dc296bef87a428c6a6358ad2c9e478119b8)
- chore: fix lint/typecheck; clean knip and deps [`e4c836c`](https://github.com/karmaniverous/rrstack/commit/e4c836c3a5291fcc5f020b749666cf10cda153c8)
- feat!: drop 'continuous' alias; require undefined freq for spans [`7289fd8`](https://github.com/karmaniverous/rrstack/commit/7289fd89861df40877eeb8554c86551d409b73d6)
- refactor(bounds): split into modules; fix lints and TS narrowings [`030defe`](https://github.com/karmaniverous/rrstack/commit/030defe7b904fa63b3ea373c97b2b25a095ae949)
- chore(eslint): fix flat-config typing; drop deprecated helper/casts [`024f83c`](https://github.com/karmaniverous/rrstack/commit/024f83cebc368cd055c42313cd3e9ef7a34023a5)

#### [0.8.2](https://github.com/karmaniverous/rrstack/compare/0.8.1...0.8.2)

> 20 September 2025

- test(bounds): add comprehensive getEffectiveBounds scenarios [`7945daf`](https://github.com/karmaniverous/rrstack/commit/7945daf50fac1c38d657da4b8bad1d0b4846f9e9)
- chore: release v0.8.2 [`428d258`](https://github.com/karmaniverous/rrstack/commit/428d2584ccfcb22eef2e7de259bd89d4cdc1dd3b)
- docs: clarify bounds & clamp semantics; inclusive ‘until’; DST and ’s’ mode [`5047a08`](https://github.com/karmaniverous/rrstack/commit/5047a08745b8f66d1ad16f534528ea0861bbd6ec)
- test(bounds): align expectations with implemented reverse-sweep and DST behavior [`5548b20`](https://github.com/karmaniverous/rrstack/commit/5548b20a86ac1197506c95cb37a18c14427add21)
- fix(release): rebuild after bump so dist embeds the new version [`1237d45`](https://github.com/karmaniverous/rrstack/commit/1237d45926180f66ff4e8badae4cdb20af6cbd36)

#### [0.8.1](https://github.com/karmaniverous/rrstack/compare/0.8.0...0.8.1)

> 19 September 2025

- updated docs [`5524cd6`](https://github.com/karmaniverous/rrstack/commit/5524cd6b557f80be03d2f8bda3d19fb1d53fcba1)
- perf(bounds): add pre-pass for earliest/latest [`bc616e1`](https://github.com/karmaniverous/rrstack/commit/bc616e1f2e76998e1d38dc1049b225665e060d69)
- perf(bounds): candidate-filtered backward sweep for latest [`d6fb825`](https://github.com/karmaniverous/rrstack/commit/d6fb82574a4fd5bc10216db0515e356e39f30613)
- chore: release v0.8.1 [`b93841c`](https://github.com/karmaniverous/rrstack/commit/b93841c3c8b05d166a53db6651fec638045f9d8c)
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
