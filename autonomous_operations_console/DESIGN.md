---
name: Autonomous Operations Console
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-code-lg:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-code-md:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-code-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes a high-density, mission-critical workspace engineered for Site Reliability Engineers, Platform Architects, and DevOps leaders. It delivers total situational awareness during high-stress operational incidents while conveying calm, automated precision during autonomous remediation workflows.

The visual style merges **Technical Minimalism** with **Subtle Neon Luminescence**:
- **Deep Matte Canvas:** Interfaces leverage rich, low-reflectance charcoal and obsidian layers, eliminating screen glare during long incident triage shifts.
- **Micro-Precision Engineering:** 1px hairline borders define structural containers, avoiding heavy dropped shadows in favor of crisp architectural delineations.
- **Autonomous Glow Signals:** Transient status glows and directional luminescence highlight AI-driven remediations, automated rollbacks, and active heuristics without cluttering the screen.
- **High-Density Utility:** Data layouts maximize horizontal and vertical real estate, delivering sub-second metric readability and high-contrast log streaming.

## Colors

The palette relies on deep slate foundations punctuated by surgical telemetry accents:

- **Foundation (Neutrals):**
  - Surface 0 (Canvas): `#020617` (Deep Obsidian)
  - Surface 1 (Cards/Panels): `#0B0F19` (Matte Slate Deep)
  - Surface 2 (Overlays/Inputs): `#111827` (Interactive Slate)
  - Surface 3 (Elevated Toolbars): `#1E293B`
  - Border Subtle: `#1E293B` (Hairline boundary)
  - Border Prominent: `#334155` (Active/Hover boundaries)
  - Text Primary: `#F8FAFC`
  - Text Secondary: `#94A3B8`
  - Text Muted: `#64748B`

- **Core Brand & Intelligence:**
  - Primary (`#6366F1` Indigo): Core interactive actions, selections, and execution triggers.
  - Secondary (`#06B6D4` Cyan): Heuristic self-healing engine telemetry, AI synthesis, and autonomous orchestration paths.

- **Telemetry & Status Semantics:**
  - Emerald (`#10B981`): Healthy, Passing, Auto-resolved, Synchronized.
  - Amber (`#F59E0B`): Warning, Degraded, Heuristic Drift, Rate-throttled.
  - Rose (`#F43F5E`): Critical Incident, Pipeline Failure, Outage, Escalation Required.
  - Violet (`#8B5CF6`): Autonomous Action In-Flight, Predictive Sandbox.

## Typography

The typography strategy couples **Inter** for clean, neutral user interface controls and documentation with **JetBrains Mono** for mission-critical metrics, microservices addresses, traces, and code payloads.

- **Numerics & Telemetry:** All timestamps, memory statistics, latency counters, and pod coordinates must strictly render in `JetBrains Mono` with tabular numbers enabled (`tnum`) to avoid layout jitter during live telemetry polling.
- **Information Hierarchy:** Headers use tight letter tracking (`-0.01em` to `-0.02em`) with semi-bold weights (`600`) to guarantee distinct section headers in dense multi-column operational boards.
- **Log Density:** Log outputs and console views use `label-code-md` (11px) with strict 16px line heights to preserve terminal-like scanning efficiency across massive datasets.

## Layout & Spacing

The system implements a compact, responsive layout framework built for dashboard visualization, split-pane investigation, and deep terminal consoles.

- **Grid Framework:** A 12-column fluid grid system with `1rem` (16px) gutters and `1.5rem` (24px) canvas margins on desktop displays. 
- **Desktop & Multi-Display Adaptations:** Screens `>= 1440px` retain a full-bleed layout with persistent left navigation (collapsible from 240px to 64px) and an optional contextual drawer (360px) for incident triage.
- **Tablet (`768px - 1023px`):** Main metric grids collapse to 6 columns. Context drawers convert to modal side-sheets with backdrop dims.
- **Mobile (`< 768px`):** Single-column layout. Margin shrinks to `1rem`. Secondary telemetry metrics collapse into swipeable cards or expandable detail accordions.
- **Density Rules:** Standard input fields and table cells operate on 28px–32px vertical height envelopes to sustain high-density monitoring without touch-target degradation.

## Elevation & Depth

Visual hierarchy uses **tonal stacking** and **micro-borders** rather than heavy drop shadows:

- **Level 0 (Canvas Base):** `#020617` background with faint structural grid guides if telemetry topologies are displayed.
- **Level 1 (Card & Module Layer):** `#0B0F19` with a subtle `1px solid #1E293B` border. No drop shadow.
- **Level 2 (Active/Hover States & Dropdowns):** `#111827` with `1px solid #334155` and ambient shadow: `0 4px 16px -2px rgba(0, 0, 0, 0.6)`.
- **Level 3 (Modals & Critical Alerts):** `#1E293B` container framed with `1px solid #475569`, backed by an ambient shadow: `0 12px 32px -4px rgba(0, 0, 0, 0.8)`.
- **Autonomous Glow Signals:** Dynamic status indicators utilize radial ambient luminescence:
  - AI Self-Healing in progress: `0 0 12px 2px rgba(99, 102, 241, 0.35)`
  - Active critical degradation: `0 0 12px 2px rgba(244, 63, 94, 0.4)`
  - Re-stabilized / Healthy: `0 0 8px 1px rgba(16, 185, 129, 0.3)`

## Shapes

The design system maintains a **Soft Architectural (`roundedness: 1`)** geometry:
- Standard control elements, inputs, buttons, and alert strips utilize `0.25rem` (4px) corner radii, communicating precision and enterprise structure.
- Panels, metric modules, data cards, and modals utilize `0.5rem` (8px) corner radii.
- Badges, status tags, and inline telemetry indicators utilize `0.25rem` (4px) or full-capsule pill designs where explicitly designated (such as health-state lozenges).

## Components

### Buttons
- **Primary (Action/Remediate):** Solid `#6366F1` background, `#FFFFFF` text, 4px radius, 32px height for standard buttons. On hover, shifts to `#4F46E5` with subtle indigo edge-glow.
- **Secondary (Inspect/Logs):** Translucent background (`rgba(30, 41, 59, 0.6)`), 1px border (`#334155`), `#F8FAFC` text.
- **Destructive/Force-Kill:** Solid `#F43F5E` background or ghost variant with `#F43F5E` micro-border and crimson text.
- **Icon Utility:** 28x28px square button with 4px radius for terminal toggles, refresh triggers, and filter panels.

### Status Chips & Telemetry Pills
- Height: 20px–22px, font: `label-code-sm`.
- **Healthy:** Background `rgba(16, 185, 129, 0.12)`, border `rgba(16, 185, 129, 0.3)`, text `#34D399`, accompanied by a 6px solid emerald status dot.
- **Degraded/Warning:** Background `rgba(245, 158, 11, 0.12)`, border `rgba(245, 158, 11, 0.3)`, text `#FBBF24`, 6px amber dot.
- **Incident/Fatal:** Background `rgba(244, 63, 94, 0.12)`, border `rgba(244, 63, 94, 0.35)`, text `#FB7185`, pulsing 6px rose dot.
- **Autonomous Healing:** Background `rgba(6, 182, 212, 0.12)`, border `rgba(6, 182, 212, 0.4)`, text `#22D3EE` with a rotating sync glyph.

### Data Tables & Event Streams
- Row Height: 36px (dense mode) to 44px (standard mode).
- Alternating rows avoid zebra fills; separation occurs exclusively via 1px bottom borders (`#1E293B`).
- Selected row: `rgba(99, 102, 241, 0.08)` fill with a 2px vertical Indigo bar on the leading edge.
- Live stream updates introduce a momentary 400ms flash in cyan before resolving into standard row contrast.

### Form Inputs & Search Syntax
- Inputs use `#111827` fill with `#1E293B` hairline border and 4px radius. Height: 32px.
- Focus state: Border color transitions to `#6366F1` with an outer ring of `0 0 0 1px #6366F1`.
- Search boxes accommodate KQL/SQL syntax highlighting natively inside the input field using `JetBrains Mono`.

### Cards & Metric Containers
- Modular headers featuring an uppercase 11px mono label, inline status indicator, and icon action menu.
- Metric values presented in 24px `JetBrains Mono` with mini sparkline charts positioned directly underneath the value baseline.

### System Topology Graphs & Service Nodes
- Hexagonal or soft-squared service nodes (`#0B0F19` background, `#334155` border).
- Active dependency lines render in low-opacity slate (`#334155`), switching to animated dashed lines in `#06B6D4` when healing workloads bypass degraded nodes.