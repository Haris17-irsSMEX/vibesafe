# CtrlCode scanner evaluation

`npm run eval:scanner` runs an offline regression suite against small repository-like fixtures. It exercises the production deterministic prechecks, finding parser, evidence verifier, score calculator, and fix-prompt generator without GitHub, Supabase, or an AI credential.

Run the optional provider check with `npm run eval:scanner:ai`. It skips successfully when `DEEPSEEK_API_KEY` is unavailable; when configured, it sends one intentionally small hardcoded-secret fixture to DeepSeek and requires a verifiable result.

## Fixtures

Fixtures live in `eval/fixtures/scanner-fixtures.js`. Each fixture declares repository files, expected finding patterns, forbidden findings, expected evidence paths, severity ranges, and tags. Add a fixture whenever a production false positive, missed vulnerability, parser regression, or severity-calibration issue is discovered.

## What fails a fixture

- An expected finding is missed.
- A forbidden finding appears, including a high/critical false positive in a safe fixture.
- A finding points to a file that is not in the fixture.
- A line is outside the referenced file.
- A confirmed finding lacks locatable source evidence.
- A high/critical finding has no supporting file and evidence.
- A fix prompt names a different affected file.

The runner reports finding counts, the deterministic score, and precise failure labels. Any fixture failure exits non-zero so it can be used in CI.

## Scope and limitations

The default suite is deterministic and repeatable. The optional DeepSeek check verifies provider integration but cannot guarantee model consistency across runs. Runtime infrastructure, deployed RLS policies, and authenticated end-to-end exploitability remain outside this fixture suite and need separate integration testing.
