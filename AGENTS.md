# Workspace Instructions & UI/UX Standards

This repository contains competitive hackathon and production agent projects. All assistants working in this repository must adhere to the following principles without exception:

## 1. UI/UX & Frontend Standards (Anti-AI-Slop Policy)

Every web dashboard, demo application, and UI artifact must follow the human-centered design principles defined in `.agents/skills/human-centered-ui-ux/SKILL.md`:

1. **Switchable Light & Dark Themes**:
   - Never build dark-only or light-only interfaces.
   - Always provide a clean, high-contrast Light/Dark mode toggle with `localStorage` persistence.
   - Maintain excellent contrast ratios in both modes.

2. **No AI Clutter / Technical Model Badges**:
   - Never display raw backend model identifiers (e.g., `amazon.nova-pro-v1:0 (live)`, `gpt-4o-mini`, `model_id`), raw token counts, or internal runtime strings in user-facing headers or hero cards.
   - Label features by their human/business purpose (e.g. `Cloud Governance Engine`, `Policy Guard`).

3. **Inverted Hierarchy (Job-to-be-Done First)**:
   - Never force the user to start on a massive raw code editor (e.g., uncollapsed `main.tf`), raw configuration files, or walls of text.
   - Lead with actionable findings, primary metrics that matter, and remediation actions above the fold.

4. **Progressive Disclosure (Collapse Secondary Details)**:
   - Keep source code manifests, raw configuration editors, and verbose model rationales **collapsed by default** inside clean `<details>` / accordion sections.
   - Users should only expand them when actively inspecting code or deep rationale.

5. **Proper Rendering of Code, Diffs, and Markdown**:
   - Never dump raw unparsed markdown (e.g., raw `###` or backticks) or raw JSON onto the dashboard.
   - Always parse markdown with clean typography and render Git diffs with syntax highlighting (+ green additions, - red deletions).

6. **Clear, Distinct Navigation**:
   - Tab switching, sidebars, and filters must be visually distinct, tactile, and obvious. Avoid low-contrast or ambiguous tab states.

## 2. Code Quality & Verification
- Always run build and automated tests before committing changes.
- Never fabricate benchmark metrics or test outputs; report only measured values.
- Keep tests green at all times.
