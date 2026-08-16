# Agent Note: Shared-modal product onboarding

Status: implemented

English | [中文](2026-08-13-shared-modal-product-onboarding.zh.md)

## Problem

First-run onboarding mixed two interaction models: a viewport takeover for product context and a credential prompt that redirected users into Settings before they could enter a key. That made a short, ordered flow feel like two unrelated surfaces and left onboarding UI ownership split across packages. The product still needs a versioned testing-stage notice before provider setup, but restoring it must not add a second independent overlay or change the Host settings and credential boundaries.

## Decision

**One existing client Cordis plugin owns both shipped steps.** `ui-settings-models` registers `welcome-notice` at order `-100` and `deepseek-official` at order `0` in `settings.onboarding`. The shell continues to mount only the first incomplete entry, so the dialogs cannot stack. No additional client package or plugin row is introduced.

**Both steps share one modal component.** `OnboardingModal` wraps the existing ui-primitives `Modal`, supplies the common title and content geometry, and owns `#root` inert for exactly the visible lifetime. Escape and mask clicks do not silently complete mandatory onboarding; each step exposes only its explicit actions. A step still loading private facts returns `null`, so it paints and blocks nothing.

**The welcome notice reuses the existing durable field.** Its exact copy and version live in `onboarding-copy.ts`. Loopback clients compare and write `ui-onboarding.welcomeNoticeVersion` through the existing settings API, and only Continue acknowledges the current version. Remote clients retain the existing process-local fallback because the settings namespace is loopback-only. No Host schema, API-proxy allowlist, or persistence implementation changes. The notice still renders in `OnboardingModal`.

**The credential step is a full-page guide.** After the notice, a missing writable DeepSeek key renders `ApiKeyOnboarding` over the whole viewport, probes the key, then calls `credentials.set`. The [beginner Web workbench](./2026-08-15-beginner-web-workbench.md) owns that page; this note owns the notice modal, the coordinator ordering, and the shared Models join.

## Alternatives considered

**Separate client plugins for the notice and credential steps.** Rejected because the product asks for one client Cordis plugin and the two surfaces share copy, ordering, modal chrome, and invalidation ownership.

**Move acknowledgement or credential logic into a new Host API.** Rejected because both backend contracts already express the required state and writes. A new endpoint would widen scope without changing user capability.

**Keep the credential step as navigation into Models.** Rejected because the key is the only required first-run field, and the existing editor can expose that write safely without sending the user through a second dialog.

**Keep the former full-viewport stage.** Rejected because the requested onboarding is a pair of dialogs over the current app, and the common ui-primitives modal already provides the appropriate portal, mask, and accessibility contract.

## Consequences

A fresh loopback profile sees the specified internal-testing notice, then the full-page DeepSeek key guide only when no provider is usable. Acknowledgement remains versioned in `settings.yaml`, secrets remain write-only in `.credentials.yaml`, and already-ready or unsupported deployments render no onboarding chrome while readiness loads. The Models package owns product-onboarding presentation as well as provider configuration. The notice stays a modal; the credential page is the [beginner Web workbench](./2026-08-15-beginner-web-workbench.md).
