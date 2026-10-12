---
name: Orbital Operations Terminal
colors:
  surface: '#f7f9ff'
  surface-dim: '#cadcf1'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#d8eaff'
  surface-container-highest: '#d2e4f9'
  on-surface: '#0b1d2c'
  on-surface-variant: '#56423a'
  inverse-surface: '#213242'
  inverse-on-surface: '#e8f2ff'
  outline: '#8a7269'
  outline-variant: '#ddc1b6'
  surface-tint: '#9f410f'
  primary: '#9c3f0d'
  on-primary: '#ffffff'
  primary-container: '#bc5625'
  on-primary-container: '#fffbff'
  inverse-primary: '#ffb597'
  secondary: '#1e6c3d'
  on-secondary: '#ffffff'
  secondary-container: '#a6f4b9'
  on-secondary-container: '#267243'
  tertiary: '#964400'
  on-tertiary: '#ffffff'
  tertiary-container: '#b65c1c'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbcd'
  primary-fixed-dim: '#ffb597'
  on-primary-fixed: '#360f00'
  on-primary-fixed-variant: '#7d2d00'
  secondary-fixed: '#a6f4b9'
  secondary-fixed-dim: '#8bd79e'
  on-secondary-fixed: '#00210d'
  on-secondary-fixed-variant: '#005229'
  tertiary-fixed: '#ffdbc9'
  tertiary-fixed-dim: '#ffb68c'
  on-tertiary-fixed: '#321200'
  on-tertiary-fixed-variant: '#753400'
  background: '#f7f9ff'
  on-background: '#0b1d2c'
  surface-variant: '#d2e4f9'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Outfit
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.03em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.02em
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  telemetry-xs:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  label-md:
    fontFamily: Outfit
    fontSize: 13px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Outfit
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.875rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style
The design system manifests an operational research station in cis-lunar and asteroidal orbit: bright, precise, calm, and grounded in rigorous physics. Rejecting the trope of high-contrast black-void science fiction interfaces, this aesthetic adopts a cleanroom aerospace telemetry standard. It evokes the quiet, high-stakes confidence of an advanced mission control room lit by daylight-calibrated 5600K fixtures, paper flight manuals, high-resolution matte instrumentation, and functional industrial robotics.

The visual style blends **Modern Utilitarian Telemetry** with **Soft Industrial Tactility**:
- **Cleanroom Light Wash:** Clean white composite surface panels resting on soft, atmospheric blue-gray alloy frames.
- **Physical Precision:** Hard-engineered information density where typography and numerical precision (SI metrics, scientific rates, physical state units) govern visual hierarchy.
- **Functional Materiality:** Crisp hair-thin structural dividers, engineered status pill designations, high-visibility tactile copper-orange action triggers, and dedicated telemetry readout panels.
- **Tone & Demeanor:** Methodical, unhurried, technically literate, and quietly optimistic about humanity's resource-gathering footprint across the solar system.

## Colors
The palette is rooted in daylight operations laboratories, high-grade treated aerospace alloy surfaces, and mission telemetry readouts.

### Palette Architecture
- **Canvas & Enclosure Background:** `#e8eef4` transitioning to `#dce5ee`. A non-glare, cool atmospheric alloy hue that relieves eye strain during sustained operational monitoring.
- **Surfaces & Cards:** `#ffffff` pure telemetry instrument white, flanked by structural inset plates at `#f4f8fb`.
- **Primary / Industrial Copper:** `#c45c2a` (Empire Field Copper). Represents physical kinetic actions, propulsion, ignition, and orbital fabrication. Interactive hover sits at `#b14f20`, with soft field highlights at `#faefe9`.
- **Success / Nominal Metric:** Deep science green `#2f7a4a` paired with `#eaf5ee` tint. Indicates optimal flow, sealed atmospheric integrity, completed orbits, and positive net yields.
- **Hazard / Critical Exceedance:** Radiated crimson `#b04040` paired with `#faeaea` tint. Reserved for pressure loss, seal degradation, thermal runaways, and uncontained radiation.
- **Warning / Thermal State:** Copper-amber `#d97736` and reactive hot thermal shifts `#e67e22` / `#c0392b` for friction spikes, capacity limits, and heat-sink dissipation bottlenecks.
- **Structural Text & Contrast:**
  - `Primary Telemetry`: Slate `#1a2430` (4.5:1+ contrast across all light fills).
  - `Secondary Readings`: Industrial muted steel `#5a6b7d`.
  - `Tertiary / Metric Units`: Atmospheric slate `#8798a9`.
  - `Borders & Frame Hairlines`: Cool structural anodized steel `#c5d0dc`.

## Typography
Typographic hierarchy enforces the separation between operational command interfaces and empirical quantitative measurement.

- **Primary Interface Voice (Outfit):** Delivers clean geometry, exceptional optical legibility at tight scale, and a humanist warmth that avoids the sterility of generic neo-grotesques. Used for module headings, operational sub-systems, navigation, narrative logs, and high-level summaries.
- **Telemetry & Science Stream (JetBrains Mono / IBM Plex Mono equivalent):** Dedicated monospaced layout strictly applied to physical parameters: mass figures (`kg`, `t`, `Gt`), dimensional flow rates (`kg/s`), thermodynamic thresholds (`K`), chamber pressure (`bar`), reliability indices (`MTTF`), structural albedos, orbital flight clocks, and raw resource balances. Numbers must feature tabular sizing so columns remain rock-steady under constant real-time calculation increments.

## Layout & Spacing
The layout adheres to a high-density, multi-panel mission control console designed to display simultaneous telemetry feeds, action banks, resource inventories, and visual orbital queues without feeling cramped.

### Layout Mechanics
- **Grid Architecture:** 12-column adaptive fluid grid for desktop displays, transitioning to an 8-column layout on medium-viewport tablets, and a unified stacked single-column modular console on mobile screens.
- **Telemetry Column Rhythm:** Fixed-width operational sidebars (280px to 320px) on desktop hold permanent real-time resource accumulation counters and flight clocks, allowing the central canvas to switch fluidly across Sector Scanning, Excavation, Refining, and Orbital Assembly.
- **Rhythm & Padding:** Densified 4px foundational increment (`0.25rem`). Component gaps rely on tight micro-spacing (`space-sm` for related numeric labels) and structural macro-spacing (`space-lg` to `space-xl`) between distinct orbital module chassis.
- **Responsive Constraints:** Mobile viewports pin core yield rates to a compact, non-intrusive persistent top flight telemetry strip, shifting module upgrade decks into thumb-accessible vertical card runs.

## Elevation & Depth
Elevation mimics precision aerospace cleanroom modules: flush composite faceplates, clean laser-cut boundaries, and subtle daylight shadows. Floating, dramatic atmospheric drops are rejected in favor of mechanical layer stratification.

### Surface Tiers & Physics
- **Base Canvas Tier (Ground):** `#e8eef4` with a microscopic grain mask mimicking non-glare anodized instrument housing.
- **Module Floor Tier (Default Instrument Cards):** Solid `#ffffff` composite paneling bounded by a clean 1px hairline border in `#c5d0dc`. Elevation is delivered via an ambient diffused contact shadow: `0 2px 6px -1px rgba(26, 36, 48, 0.05), 0 1px 3px 0 rgba(26, 36, 48, 0.03)`.
- **Raised Interactive Units (Active Module Nodes & Command Triggers):** Subtle elevation stepping with `0 4px 12px -2px rgba(26, 36, 48, 0.08), 0 2px 4px -1px rgba(26, 36, 48, 0.04)`.
- **Inset Telemetry Receptors & Recessed Slots:** Gauge trays, progress track sleeves, and log consoles use an inverted recessed fill of `#f0f5fa` with a 1px inner border `#d5e0eb` to create a physically routed hardware housing.
- **Warning & Hazard States:** In high thermal or radiated alerts, surfaces reject drop shadows and adopt localized perimeter warning lines (1px solid `#b04040` or `#d97736`) with soft, 4px ambient outer dissipation halos.

## Shapes
The structural envelope standardizes on an engineered 14px outer module perimeter, delivering modern ergonomics without feeling toy-like or purely rounded.

### Geometry Specifications
- **Module Enclosures & Master Cards:** Set to a precise 14px outer corner radius (`rounded-lg` level, tuned for crisp instrument enclosures).
- **Secondary Containers & Inset Gauges:** 8px radius (`space-sm` matching) for internal resource trays, status clusters, and telemetry sub-panels.
- **Command Buttons & Interactive Tiles:** 8px to 10px continuous contour rounding to retain a distinct mechanical push-surface profile.
- **Pills, Nodes & Indicators:** Full continuous pill profiles (`rounded-full` / 9999px) strictly for operational state indicators (e.g., `[MINING]`, `[IDLE]`, `[HOT]`) and chemical/element composition tags.

## Components

### 1. Two-Line Action & Upgrade Buttons
- **Structure:** Dual-stratum functional button. The primary upper line renders the operational action name in `label-md` (`Outfit` SemiBold). The lower auxiliary line displays costs, consumption, and delta metrics in `telemetry-xs` (`JetBrains Mono`).
- **Primary Kinetic State (Copper):** Background `#c45c2a`, primary text `#ffffff`, mono rate/cost subtitle `#faefe9`. Hover transitions to `#b14f20`.
- **Unaffordable / Insufficient Material State:** 45% container opacity, maintaining 100% vector contrast internally; missing resource metrics highlight in radiated crimson `#b04040` to make procurement shortfalls instantly diagnosable.
- **Padding & Insets:** 10px horizontal, 12px vertical; minimum target height of 48px on mobile, 44px on desktop.

### 2. Composition Chips & Resource Nodes
- **Structure:** Pill-shaped tags displaying elemental signifier, scientific formula, or resource classification paired with SI mass metrics or percentage breakdowns.
- **Styling:** Recessed `#f0f5fa` background, `#c5d0dc` boundary hairline. Leading symbol sets a bold contrast mark (e.g., `Fe`, `³He`, `H₂O`, `Regolith`) in slate `#1a2430`, alongside mass values formatted in `telemetry-xs` `#5a6b7d`.

### 3. Mission Telemetry Progress Bars
- **Frame:** 10px continuous height, enclosed in a recessed track `#e2ebf3` with 9999px pill corner boundaries.
- **Fill Active:** Linear gradient reflecting the operation: Deep science green `#2f7a4a` for nominal automated processing; Empire copper `#c45c2a` for primary extraction and fabrication; warning copper-amber `#d97736` for thermal cycles.
- **Annotation Overlay:** Integrated upper label row hosting the active stage in `label-sm` with the monospaced dynamic countdown timer / ETA (`04m 12s`, `0.48 kg/s`) flush to the right boundary.

### 4. Operational Status Pills
- **Specs:** Height 22px, pill-radiused, horizontal padding 8px, letter-spacing `0.04em`, uppercase `telemetry-xs`.
- **States:**
  - `IDLE`: Steel `#5a6b7d` text, `#eef3f8` fill.
  - `MINING` / `EXTRACTING`: Science green `#2f7a4a` text, `#eaf5ee` fill, pulsing 4px focal dot.
  - `HOT` / `HAZARD`: Radiated crimson `#b04040` text, `#faeaea` fill.
  - `QUEUE FULL` / `THERMAL SATURATION`: Amber `#d97736` text, `#fdf3ea` fill.

### 5. Numerical Telemetry Readouts & SI Mass Formats
- Monospaced typography with tabular numerals.
- Auto-scaling unit notation: milligram (`mg`), gram (`g`), kilogram (`kg`), metric ton (`t`), kiloton (`kt`), megaton (`Mt`), gigaton (`Gt`).
- Second-order rates display clear forward-slash deltas (`+14.2 kg/s`, `-0.04 bar/s`).

### 6. Event Log Stream
- Inset operational log box with `#f8fbfe` fill and hairline boundary `#c5d0dc`.
- Log entries display monospaced UTC/Mission flight timestamps `[T+148:12:09]`, an uppercase severity code chip (`[INFO]`, `[WARN]`, `[CRIT]`), and brief, unambiguous system messages in `body-sm`.

### 7. Form Fields & Manual Flight Adjusters
- Inputs for targeted payload limits or automated trade threshold sliders: clean white plate with 1px border `#c5d0dc`, focusing to an assertive 1.5px copper-orange `#c45c2a` perimeter ring with no blurry outer drops.