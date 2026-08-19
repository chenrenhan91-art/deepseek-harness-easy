# Agent Note: Global fit skill

Status: implemented

English | [中文](2026-08-19-global-fit-skill.zh.md)

## Problem

Shipped beginner modes already tell the model how to write a page, a brief, or a lesson, but they do not share one check for “is this the smallest thing that matches what the user asked, and did we actually look at the result?” Public coding skills that encode a YAGNI ladder, and research verifiers that score trajectories against criteria, look like they could fill that gap. Installing those projects as-is would pull a Python logprob tournament or an English senior-dev persona into a Chinese beginner workbench that already over-injects skill bodies.

## Decision

**A shared `fit` skill sits next to `vision` under [`apps/cli/config/skills/fit/`](../../../../apps/cli/config/skills/fit/SKILL.md).** Every beginner mode already mounts `../../skills/`, so `fit` appears in `+` and in the model-facing catalog on all eight modes. `modePins` drops every id in `SHARED_SKILL_IDS` (`vision`, `fit`); it is never auto-armed. The body is original Chinese. It tells the model to stop at the smallest deliverable that works, then to score the current files and command output against the user’s request before claiming done. Short spoken answers skip it.

The public ideas kept are a stop-at-first-rung ladder (need / reuse / built-in / one file / only then new work) and “trust observed output, not narration.” The skill forbids a second model, a verifier package, and best-of-N voting.

## Alternatives considered

**Install [llm-as-a-verifier](https://github.com/llm-as-a-verifier/llm-as-a-verifier) or TurboAgent as a runtime.** Rejected: it needs logprobs, extra model rounds, and trajectory files. That doubles latency and cost on a beginner turn and does not match DeepSeek’s first-run page.

**Copy [ponytail](https://github.com/DietrichGebert/ponytail) `SKILL.md` into the tree.** Rejected: third-party copyright, English coding-only identity, lite/full/ultra commands this host does not own. Shipped beginner skills keep only a public idea in original Chinese, same as `look-distinct`.

**Auto-pin `fit` on every send.** Rejected: the same reason `vision` stays unpinned. Injecting it on a one-line 学习答疑 question recreates the over-teaching leak.

**Bake the three check questions into every persona.** Rejected as the only home: personas already repeat domain skills. A catalog skill is invocable when the task is a deliverable and invisible when it is not.

## Consequences

- Producing a page, deck, sheet, brief, or batch can load `/fit` from `+` or via the skill tool; a short spoken answer should not.
- The workbench does not run `pip install llm-verifier` and does not vendor ponytail files.
- Adding another shared skill under `apps/cli/config/skills/` also requires listing its id in `SHARED_SKILL_IDS`, or the pin row will steal a domain slot.

## Testing

`packages/client/ui-agent-preset` unit tests drop both shared ids from `modePins`. `apps/cli/tests/web-agent-presets.e2e.ts` pins `fit` beside `vision` on `study`, `web-page`, and `briefing`, and that `apps/cli/config/skills/fit/SKILL.md` exists. Web slash-menu goldens and `agent-preset-selection` include the `fit` row.
