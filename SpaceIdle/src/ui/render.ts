import {
  dominantResources,
  isSearchTargetable,
  searchTargetMinLevel,
  SIZE_TIERS,
} from '../game/asteroidGen.ts'
import {
  formatAwayDuration,
  formatDurationSeconds,
  formatMassKg,
  formatMissionClock,
  formatPercent,
  formatRateKgPerS,
  formatSignedRateKgPerS,
} from '../game/format.ts'
import type { OfflineSummary } from '../game/offline.ts'
import { RESOURCE_BY_ID, RESOURCE_CATALOG } from '../game/resources/catalog.ts'
import {
  getActiveAsteroid,
  resourceAmount,
  searchDurationSeconds,
  totalResourceKg,
} from '../game/state.ts'
import {
  previewBuildDrone,
  previewQueueUpgrade,
  previewSearchUpgrade,
  previewUpgradeDroneFab,
  previewUpgradeDroneSafety,
  previewUpgradeDroneTech,
  droneBuildDurationSeconds,
  meanTimeToFailureSeconds,
  oreHazardMultiplier,
} from '../game/tick.ts'
import type { Asteroid, CostLine, GameLogKind, GameState, MiningDrone } from '../game/types.ts'
import { mountShell as mountShellDom } from './shell.ts'

export { mountShellDom as mountShell }

const STOCKPILE_VISIBLE = 8
const PHASE2_MASS_KG = 250_000
const PHASE2_SEARCH_LEVEL = 3

export type AppTab = 'deck' | 'survey' | 'fleet' | 'terraform' | 'faction'

let lastQueueStructure = ''
let lastDroneGroupKey = ''
let lastSearchTargetKey = ''
let lastLogKey = ''
let queueDragActive = false
let assayExpanded = false

function resourceName(id: string): string {
  return RESOURCE_BY_ID.get(id)?.name ?? id
}

function resourceLabel(id: string): string {
  const def = RESOURCE_BY_ID.get(id)
  if (!def) return id
  return `${def.name} (${def.symbol})`
}

function sizeLabel(tier: Asteroid['sizeTier']): string {
  return SIZE_TIERS.find((s) => s.tier === tier)?.label ?? tier
}

function icon(name: string): string {
  return `<span class="icon" aria-hidden="true">${name}</span>`
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function logKindLabel(kind: GameLogKind): string {
  if (kind === 'danger') return 'HAZARD'
  if (kind === 'warn') return 'WARN'
  if (kind === 'success') return 'SUCCESS'
  return 'INFO'
}

function formatCostHtml(state: GameState, costs: readonly CostLine[]): string {
  return costs
    .map((c) => {
      const short = resourceAmount(state, c.resourceId) + 1e-9 < c.amountKg
      const label = `${formatMassKg(c.amountKg)} ${resourceName(c.resourceId)}`
      return `<span class="${short ? 'cost-short' : ''}">${escapeHtml(label)}</span>`
    })
    .join(' · ')
}

function setText(bind: string, text: string): void {
  const el = document.querySelector(`[data-bind="${bind}"]`)
  if (el) el.textContent = text
}

function setHtml(bind: string, html: string): void {
  const el = document.querySelector(`[data-bind="${bind}"]`)
  if (el) el.innerHTML = html
}

export function setAppTab(tab: AppTab): void {
  const shell = document.querySelector('.shell')
  if (shell instanceof HTMLElement) shell.dataset.tab = tab
  for (const btn of document.querySelectorAll<HTMLElement>('[data-action="set-tab"]')) {
    const on = btn.dataset.tab === tab
    btn.classList.toggle('active', on)
    if (on) btn.setAttribute('aria-current', 'page')
    else btn.removeAttribute('aria-current')
  }
}

export function closeOverflow(): void {
  const menu = document.querySelector<HTMLElement>('[data-bind="overflow-menu"]')
  if (menu) menu.hidden = true
}

export function toggleOverflow(): void {
  const menu = document.querySelector<HTMLElement>('[data-bind="overflow-menu"]')
  if (!menu) return
  menu.hidden = !menu.hidden
}

export function showResetConfirm(): void {
  closeOverflow()
  const el = document.querySelector<HTMLElement>('[data-bind="reset-confirm"]')
  if (el) el.hidden = false
}

export function hideResetConfirm(): void {
  const el = document.querySelector<HTMLElement>('[data-bind="reset-confirm"]')
  if (el) el.hidden = true
}

export function toggleAssayExpanded(): void {
  assayExpanded = !assayExpanded
}

export function showOfflineProgressModal(summary: OfflineSummary): void {
  hideOfflineProgressModal()

  const gains =
    summary.resourceGains.length > 0
      ? summary.resourceGains
          .map((g) => {
            const tag = RESOURCE_BY_ID.get(g.resourceId)?.tag ?? ''
            return `<li><span class="stock-name"><span class="dot ${tag}"></span>${escapeHtml(resourceName(g.resourceId))}</span><span class="offline-gain">+${escapeHtml(formatMassKg(g.kg))}</span></li>`
          })
          .join('')
      : '<li class="empty">No stockpile gains</li>'

  const totalGain = summary.resourceGains.reduce((n, g) => n + g.kg, 0)
  const appliedFrac =
    summary.elapsedSeconds > 0 ? Math.min(1, summary.appliedSeconds / summary.elapsedSeconds) : 1

  const backdrop = document.createElement('div')
  backdrop.className = 'offline-backdrop'
  backdrop.dataset.bind = 'offline-modal'
  backdrop.innerHTML = `
    <div class="offline-modal" role="dialog" aria-modal="true" aria-labelledby="offline-title">
      <div class="offline-accent"></div>
      <div class="offline-body">
        <p class="offline-eyebrow">Log synced</p>
        <h2 id="offline-title">Welcome back, prospector</h2>
        <p class="offline-lede">Mission Control catch-up computation completed</p>
        <div class="away-plate">
          <div class="meta-row" style="margin:0">
            <span>Recorded away</span>
            <span class="mass-pct">${escapeHtml(formatAwayDuration(summary.elapsedSeconds))}</span>
          </div>
          <div class="meta-row" style="margin:0">
            <span>Applied catch-up</span>
            <span style="color:var(--secondary);font-weight:600">${escapeHtml(formatAwayDuration(summary.appliedSeconds))}</span>
          </div>
          <div class="progress thin" style="margin-top:0.35rem">
            <div class="progress-fill ok" style="width:${appliedFrac * 100}%"></div>
          </div>
          ${
            summary.capped
              ? `<div class="meta-row"><span>Offline cap</span><span>${escapeHtml(formatAwayDuration(summary.appliedSeconds))}</span></div>`
              : ''
          }
        </div>
        <div class="offline-facts">
          <div class="offline-fact"><div class="label-sm">Fabricated</div><div class="n">${summary.dronesBuilt} <span class="label-sm">drones</span></div></div>
          <div class="offline-fact"><div class="label-sm">Mined out</div><div class="n">${summary.asteroidsDepleted} <span class="label-sm">rocks</span></div></div>
          <div class="offline-fact"><div class="label-sm">Surveyed</div><div class="n">${summary.asteroidsFound} <span class="label-sm">finds</span></div></div>
          <div class="offline-fact"><div class="label-sm">Losses</div><div class="n">${summary.dronesLost} <span class="label-sm">casualties</span></div></div>
        </div>
        <p class="label-sm">Resources harvested</p>
        <ul class="offline-gains">${gains}</ul>
        <div class="offline-total">
          <span>Total harvest mass</span>
          <span class="mono">+${escapeHtml(formatMassKg(totalGain))}</span>
        </div>
        <button type="button" class="btn primary" data-action="dismiss-offline">
          <span class="btn-title">Collect &amp; resume operations</span>
          <span class="btn-sub">Flush catch-up cache</span>
        </button>
      </div>
    </div>
  `
  document.body.appendChild(backdrop)
}

export function hideOfflineProgressModal(): void {
  document.querySelector('[data-bind="offline-modal"]')?.remove()
}

function compositionCards(asteroid: Asteroid, limit: number): string {
  const entries = dominantResources(asteroid.composition, limit)
  if (entries.length === 0) return `<p class="empty">Unknown composition</p>`
  return entries
    .map((c) => {
      const def = RESOURCE_BY_ID.get(c.resourceId)
      const tag = def?.tag ?? 'silicate'
      const mass = asteroid.remainingKg * c.fraction
      return `
        <div class="assay-chip">
          <div class="assay-top">
            <span style="font-size:11px;font-weight:600">${escapeHtml(resourceLabel(c.resourceId))}</span>
            <span class="tag ${tag}">${escapeHtml(tag)}</span>
          </div>
          <div class="assay-bottom">
            <span style="font-weight:700">${formatPercent(c.fraction)}</span>
            <span>${formatMassKg(mass)}</span>
          </div>
        </div>`
    })
    .join('')
}

function renderSearchTargetChips(state: GameState): void {
  const host = document.querySelector('[data-bind="search-target"]')
  if (!host) return

  const key = `${state.searchLevel}:${state.searchTargetResourceId ?? ''}`
  if (key === lastSearchTargetKey) return
  lastSearchTargetKey = key

  const chips: string[] = [
    `<button type="button" class="target-chip${!state.searchTargetResourceId ? ' active' : ''}" data-action="set-search-target" data-resource-id="">Any ore</button>`,
  ]
  for (const def of RESOURCE_CATALOG) {
    const unlocked = def.minSearchLevel <= state.searchLevel
    const targetable = isSearchTargetable(def, state.searchLevel)
    const need = searchTargetMinLevel(def)
    const active = state.searchTargetResourceId === def.id
    if (!unlocked) {
      chips.push(
        `<button type="button" class="target-chip" disabled>${icon('lock')} ${escapeHtml(def.name)} · detect Lv ${def.minSearchLevel}</button>`,
      )
    } else if (!targetable) {
      chips.push(
        `<button type="button" class="target-chip" disabled>${icon('lock')} ${escapeHtml(def.name)} · target Lv ${need}</button>`,
      )
    } else {
      chips.push(
        `<button type="button" class="target-chip${active ? ' active' : ''}" data-action="set-search-target" data-resource-id="${def.id}">${escapeHtml(def.name)}</button>`,
      )
    }
  }
  host.innerHTML = chips.join('')
}

function renderQueueList(state: GameState): void {
  const host = document.querySelector('[data-bind="queue-list"]')
  if (!host) return
  if (queueDragActive) return

  if (state.asteroidQueue.length === 0) {
    if (lastQueueStructure !== '') {
      host.innerHTML = `<p class="empty">Queue empty — survey will find the next rock.</p>`
      lastQueueStructure = ''
    }
    return
  }

  const structure = state.asteroidQueue.map((a) => a.id).join(',')
  if (structure !== lastQueueStructure) {
    lastQueueStructure = structure
    host.innerHTML = state.asteroidQueue
      .map((a, index) => {
        const active = index === 0
        const top = dominantResources(a.composition, 3)
          .map(
            (c) =>
              `${RESOURCE_BY_ID.get(c.resourceId)?.symbol ?? c.resourceId} ${formatPercent(c.fraction)}`,
          )
          .join(' · ')
        return `
          <div class="queue-item${active ? ' active' : ''}" data-asteroid-id="${a.id}" draggable="true">
            <div>
              <div class="title-row">
                <span class="queue-name">${escapeHtml(a.name)}</span>
                <span class="pill neutral">${escapeHtml(sizeLabel(a.sizeTier))}</span>
              </div>
              <div class="queue-meta" data-queue-meta="${a.id}">${escapeHtml(top)} · <strong>${formatMassKg(a.remainingKg)}</strong>${active ? ' · mining' : ''}</div>
            </div>
            <div class="queue-controls">
              <span class="queue-drag" title="Drag to reorder" aria-hidden="true">⠿</span>
              ${
                active
                  ? ''
                  : `<button type="button" class="queue-icon primary" data-action="move-asteroid-top" data-asteroid-id="${a.id}" title="Mine next">${icon('arrow_upward')}</button>`
              }
              <button type="button" class="queue-icon danger" data-action="discard-asteroid" data-asteroid-id="${a.id}" aria-label="Discard asteroid">${icon('close')}</button>
            </div>
          </div>`
      })
      .join('')
    return
  }

  for (const [index, a] of state.asteroidQueue.entries()) {
    const meta = host.querySelector(`[data-queue-meta="${a.id}"]`)
    if (!meta) continue
    const active = index === 0
    const top = dominantResources(a.composition, 3)
      .map(
        (c) =>
          `${RESOURCE_BY_ID.get(c.resourceId)?.symbol ?? c.resourceId} ${formatPercent(c.fraction)}`,
      )
      .join(' · ')
    meta.innerHTML = `${escapeHtml(top)} · <strong>${formatMassKg(a.remainingKg)}</strong>${active ? ' · mining' : ''}`
  }
}

export function invalidateQueueList(): void {
  lastQueueStructure = ''
}

export function setQueueDragActive(active: boolean): void {
  queueDragActive = active
  if (!active) lastQueueStructure = ''
}

export function setQueueDropTargetIndex(_index: number): void {
  // Drop highlight is applied directly on the DOM during drag.
}

export function setSpeedButtonsActive(speed: number): void {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-action="set-speed"]')) {
    btn.classList.toggle('active', Number(btn.dataset.speed) === speed)
  }
}

function groupDronesByTech(drones: readonly MiningDrone[]): {
  techLevel: number
  count: number
  powerEachKgPerS: number
  powerTotalKgPerS: number
}[] {
  const map = new Map<number, { count: number; powerEachKgPerS: number }>()
  for (const d of drones) {
    const prev = map.get(d.techLevel)
    if (prev) prev.count += 1
    else map.set(d.techLevel, { count: 1, powerEachKgPerS: d.powerKgPerS })
  }
  return [...map.entries()]
    .map(([techLevel, g]) => ({
      techLevel,
      count: g.count,
      powerEachKgPerS: g.powerEachKgPerS,
      powerTotalKgPerS: g.powerEachKgPerS * g.count,
    }))
    .sort((a, b) => b.techLevel - a.techLevel)
}

function wingName(tech: number): string {
  if (tech <= 1) return 'Tech 1 Prospector'
  if (tech === 2) return 'Tech 2 Heavy Excavator'
  return `Tech ${tech} Excavator`
}

function renderDroneGroups(state: GameState): void {
  const host = document.querySelector('[data-bind="drone-groups"]')
  const brief = document.querySelector('[data-bind="drone-groups-brief"]')
  const groups = groupDronesByTech(state.drones)
  const key = groups.map((g) => `${g.techLevel}:${g.count}:${g.powerEachKgPerS}`).join('|')
  if (key === lastDroneGroupKey) return
  lastDroneGroupKey = key

  if (brief) {
    brief.innerHTML = groups
      .map((g) => `<div>${g.count}× Tech-${g.techLevel} @ ${formatRateKgPerS(g.powerEachKgPerS)}</div>`)
      .join('')
  }
  if (!host) return
  if (groups.length === 0) {
    host.innerHTML = `<p class="empty">No drones online.</p>`
    return
  }
  host.innerHTML = groups
    .map(
      (g) => `
      <div class="drone-group">
        <div class="drone-group-head">
          <div>
            <div class="title-row">
              <span style="font-weight:600">${escapeHtml(wingName(g.techLevel))}</span>
              <span class="pill neutral">×${g.count}</span>
            </div>
            <div class="drone-group-meta">${formatRateKgPerS(g.powerEachKgPerS)} ea · ${formatRateKgPerS(g.powerTotalKgPerS)} wing</div>
          </div>
          <span class="live-dot ok"></span>
        </div>
      </div>`,
    )
    .join('')
}

function renderStockpile(state: GameState, active: Asteroid | null): void {
  const host = document.querySelector('[data-bind="stockpile"]')
  if (!host) return
  const all = Object.entries(state.resources)
    .filter(([, kg]) => kg > 1e-6)
    .map(([id, kg]) => ({ id, kg }))
    .sort((a, b) => b.kg - a.kg)
  if (all.length === 0) {
    host.innerHTML = `<p class="empty">No stockpile yet.</p>`
    return
  }
  const visible = all.slice(0, STOCKPILE_VISIBLE)
  const hidden = all.length - visible.length
  const unlocked = RESOURCE_CATALOG.filter((r) => r.minSearchLevel <= state.searchLevel).length
  const locked = RESOURCE_CATALOG.length - unlocked
  host.innerHTML =
    visible
      .map((r) => {
        const def = RESOURCE_BY_ID.get(r.id)
        const frac = active?.composition.find((c) => c.resourceId === r.id)?.fraction ?? 0
        const rate = active ? state.miningRateKgPerS * frac : 0
        return `
          <div class="stock-row">
            <span class="stock-name"><span class="dot ${def?.tag ?? ''}"></span>${escapeHtml(resourceLabel(r.id))}</span>
            <span><span class="stock-kg">${formatMassKg(r.kg)}</span>${
              rate > 1e-6 ? `<span class="stock-rate">${formatSignedRateKgPerS(rate)}</span>` : ''
            }</span>
          </div>`
      })
      .join('') +
    `<div class="stock-more">
      <span class="pill neutral">${locked > 0 ? `+${locked} locked species in assay catalog` : hidden > 0 ? `+${hidden} more` : `${unlocked} species in catalog`}</span>
    </div>`
}

function renderEventLog(state: GameState): void {
  const host = document.querySelector('[data-bind="event-log"]')
  if (!host) return
  const key = state.gameLog[0] ? `${state.gameLog[0].id}:${state.gameLog.length}` : 'empty'
  if (key === lastLogKey) return
  lastLogKey = key
  if (state.gameLog.length === 0) {
    host.innerHTML = `<p class="empty">No events yet.</p>`
    return
  }
  host.innerHTML = state.gameLog
    .slice(0, 24)
    .map(
      (entry) => `
      <div class="log-row kind-${entry.kind}">
        <div class="log-head">
          <span>${escapeHtml(formatMissionClock(entry.atSeconds))}</span>
          <span class="log-kind">${logKindLabel(entry.kind)}</span>
        </div>
        <div class="log-msg">${escapeHtml(entry.message)}</div>
      </div>`,
    )
    .join('')
}

function mttfLabel(seconds: number): string {
  if (seconds === Number.POSITIVE_INFINITY) return '∞'
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)}h`
  if (seconds >= 60) return `${(seconds / 60).toFixed(0)}m`
  return `${seconds.toFixed(0)}s`
}

export function render(state: GameState): void {
  const active = getActiveAsteroid(state)
  const need = searchDurationSeconds(state.searchLevel)
  const queueFull = state.asteroidQueue.length >= state.queueCapacity
  const searchFrac = need > 0 ? Math.min(1, state.searchProgressSeconds / need) : 0
  const searchEta = queueFull ? 0 : Math.max(0, need - state.searchProgressSeconds)

  const buildPreview = previewBuildDrone(state)
  const techPreview = previewUpgradeDroneTech(state)
  const fabPreview = previewUpgradeDroneFab(state)
  const safetyPreview = previewUpgradeDroneSafety(state)
  const searchPreview = previewSearchUpgrade(state)
  const queuePreview = previewQueueUpgrade(state)

  const totalKg = totalResourceKg(state)
  const gateFrac = Math.min(1, totalKg / PHASE2_MASS_KG)
  const searchOk = state.searchLevel >= PHASE2_SEARCH_LEVEL

  setText('mission-clock', formatMissionClock(state.gameTimeSeconds))
  setText('header-mass', formatMassKg(totalKg))
  setText('header-rate', formatSignedRateKgPerS(state.miningRateKgPerS))
  setText('total-mass', formatMassKg(totalKg))
  setText('rate', formatSignedRateKgPerS(state.miningRateKgPerS))
  setText('gate-pct', formatPercent(gateFrac))
  setText('gate-mass', `${formatMassKg(totalKg)} / ${formatMassKg(PHASE2_MASS_KG)} stored`)
  setHtml(
    'gate-req',
    searchOk
      ? `${icon('verified')} Survey Lv ${state.searchLevel}`
      : `${icon('lock')} Req. Survey Lv ${PHASE2_SEARCH_LEVEL}`,
  )
  const gateFill = document.querySelector<HTMLElement>('[data-bind="gate-fill"]')
  if (gateFill) gateFill.style.width = `${gateFrac * 100}%`

  setText('fleet-levels', `Fab ${state.droneFabLevel} · Safety ${state.droneSafetyLevel}`)
  setText('fleet-count', String(state.drones.length))
  setText('fleet-count-label', state.drones.length === 1 ? 'unit deployed' : 'units deployed')
  setText('fleet-yield', formatSignedRateKgPerS(state.miningRateKgPerS))
  {
    const n = state.drones.length
    const pending = state.droneBuildActive ? 1 : 0
    setText(
      'fleet-summary',
      `${n} drone${n === 1 ? '' : 's'}${pending ? ' · +1 building' : ''} · ${formatRateKgPerS(state.miningRateKgPerS)}`,
    )
  }

  const h = oreHazardMultiplier(active)
  const mttf = meanTimeToFailureSeconds(state.droneSafetyLevel, active)
  const hazardEl = document.querySelector('[data-bind="ore-hazard"]')
  if (hazardEl) {
    hazardEl.className = `pill ${h >= 5 ? 'hot' : 'warn'}`
    hazardEl.textContent = `Hazard ${h.toFixed(1)}× · MTTF ${mttfLabel(mttf)}`
  }
  setText('fleet-mttf', `${mttfLabel(meanTimeToFailureSeconds(state.droneSafetyLevel, null))} (benign)`)

  setText('radar-level', `Lv ${state.searchLevel} radar`)
  setText('search-level-copy', `Search Lv ${state.searchLevel} · Scan cycle ${formatDurationSeconds(need)}`)
  setText('search-cycle', formatDurationSeconds(need))
  setText('queue-slots', `${state.asteroidQueue.length} / ${state.queueCapacity}`)
  setText(
    'search-status-copy',
    queueFull ? 'Survey paused until a slot frees' : 'Next asteroid orbital calculation incoming',
  )
  setText('search-eta', queueFull ? 'Queue full' : `${formatDurationSeconds(searchEta)} to detection`)
  setText('search-countdown', queueFull ? 'HOLD' : formatDurationSeconds(searchEta))

  const searchFill = document.querySelector<HTMLElement>('[data-bind="search-fill"]')
  if (searchFill) searchFill.style.width = `${Math.max(0, Math.min(100, searchFrac * 100))}%`

  if (active) {
    const fraction = active.totalKg > 0 ? active.remainingKg / active.totalKg : 0
    setText('asteroid-name', active.name)
    const status = document.querySelector('[data-bind="status"]')
    if (status) {
      status.className = 'pill mining'
      status.innerHTML = `<span class="live-dot ok"></span> Mining · ${formatRateKgPerS(state.miningRateKgPerS)}`
    }
    setText('asteroid-tier', sizeLabel(active.sizeTier))
    setText('remaining', formatMassKg(active.remainingKg))
    setText('total', formatMassKg(active.totalKg))
    setText('pct', `${formatPercent(fraction)} remaining`)
    const fill = document.querySelector<HTMLElement>('[data-bind="progress-fill"]')
    if (fill) fill.style.width = `${Math.max(0, Math.min(100, fraction * 100))}%`
    setText(
      'depletion-eta',
      state.miningRateKgPerS > 0
        ? `Est. depletion in ${formatDurationSeconds(active.remainingKg / state.miningRateKgPerS)}`
        : 'No mining throughput',
    )
    setText('mine-rate-note', `${formatRateKgPerS(state.miningRateKgPerS)} drill array`)
    const assay = document.querySelector('[data-bind="assay-grid"]')
    if (assay) {
      assay.innerHTML = compositionCards(
        active,
        assayExpanded ? active.composition.length : Math.min(4, active.composition.length),
      )
    }
  } else {
    setText('asteroid-name', 'No active asteroid')
    const status = document.querySelector('[data-bind="status"]')
    if (status) {
      status.className = 'pill idle'
      status.textContent = 'Idle'
    }
    setText('asteroid-tier', '—')
    setText('remaining', formatMassKg(0))
    setText('total', formatMassKg(0))
    setText('pct', formatPercent(0))
    const fill = document.querySelector<HTMLElement>('[data-bind="progress-fill"]')
    if (fill) fill.style.width = '0%'
    setText('depletion-eta', 'Select a rock from the queue, or wait for survey.')
    setText('mine-rate-note', 'Idle')
    const assay = document.querySelector('[data-bind="assay-grid"]')
    if (assay) assay.innerHTML = `<p class="empty">No assay until a rock is queued.</p>`
  }

  const discardActive = document.querySelector<HTMLButtonElement>('[data-bind="discard-active"]')
  if (discardActive) {
    discardActive.disabled = !active
    if (active) discardActive.dataset.asteroidId = active.id
    else delete discardActive.dataset.asteroidId
  }

  const buildWrap = document.querySelector<HTMLElement>('[data-bind="build-progress-wrap"]')
  const buildNeed = droneBuildDurationSeconds(
    state.droneBuildActive ? state.droneBuildTechLevel : state.droneTechLevel,
    state.droneFabLevel,
  )
  if (buildWrap) {
    if (state.droneBuildActive) {
      buildWrap.hidden = false
      const frac = buildNeed > 0 ? Math.min(1, state.droneBuildProgressSeconds / buildNeed) : 0
      const buildFill = document.querySelector<HTMLElement>('[data-bind="build-fill"]')
      if (buildFill) buildFill.style.width = `${frac * 100}%`
      const left = Math.max(0, buildNeed - state.droneBuildProgressSeconds)
      setText(
        'build-eta',
        `Fabricating T${state.droneBuildTechLevel} drone · ${formatDurationSeconds(left)} left (${Math.round(frac * 100)}%)`,
      )
      setHtml(
        'build-drone-cost',
        `In progress · ${formatRateKgPerS(buildPreview.nextPowerKgPerS)} when done`,
      )
    } else {
      buildWrap.hidden = true
      setHtml(
        'build-drone-cost',
        `${formatCostHtml(state, buildPreview.costs)} · ${formatDurationSeconds(buildPreview.durationSeconds)} · → ${formatRateKgPerS(buildPreview.nextPowerKgPerS)}`,
      )
    }
  }

  setHtml(
    'drone-tech-cost',
    `Lv ${techPreview.level} · ${formatCostHtml(state, techPreview.costs)} · next drone ${formatRateKgPerS(techPreview.nextDronePowerKgPerS)}`,
  )
  setHtml(
    'drone-fab-cost',
    `Lv ${fabPreview.level} · ${formatCostHtml(state, fabPreview.costs)} · → ${formatDurationSeconds(fabPreview.nextBuildSeconds)} / drone`,
  )
  setHtml(
    'drone-safety-cost',
    `Lv ${safetyPreview.level} · ${formatCostHtml(state, safetyPreview.costs)} · → ~${formatDurationSeconds(safetyPreview.nextMttfRockSeconds)} MTTF (benign)`,
  )
  setHtml(
    'search-upgrade-cost',
    `Lv ${searchPreview.level} · ${formatCostHtml(state, searchPreview.costs)} · → ${formatDurationSeconds(searchPreview.nextSearchSeconds)} / find`,
  )
  setHtml(
    'queue-upgrade-cost',
    `${queuePreview.capacity} → ${queuePreview.nextCapacity} slots · ${formatCostHtml(state, queuePreview.costs)}`,
  )

  const buildBtn = document.querySelector<HTMLButtonElement>('[data-action="build-drone"]')
  const techBtn = document.querySelector<HTMLButtonElement>('[data-action="upgrade-drone-tech"]')
  const fabBtn = document.querySelector<HTMLButtonElement>('[data-action="upgrade-drone-fab"]')
  const safetyBtn = document.querySelector<HTMLButtonElement>('[data-action="upgrade-drone-safety"]')
  const searchBtn = document.querySelector<HTMLButtonElement>('[data-action="upgrade-search"]')
  const queueBtn = document.querySelector<HTMLButtonElement>('[data-action="upgrade-queue"]')
  if (buildBtn) buildBtn.disabled = buildPreview.busy || !buildPreview.affordable
  if (techBtn) techBtn.disabled = !techPreview.affordable
  if (fabBtn) fabBtn.disabled = !fabPreview.affordable
  if (safetyBtn) safetyBtn.disabled = !safetyPreview.affordable
  if (searchBtn) searchBtn.disabled = !searchPreview.affordable
  if (queueBtn) queueBtn.disabled = !queuePreview.affordable

  const autoCheck = document.querySelector<HTMLInputElement>('[data-bind="auto-build"]')
  if (autoCheck && autoCheck.checked !== state.droneAutoBuild) autoCheck.checked = state.droneAutoBuild
  const autoToggle = document.querySelector('[data-bind="auto-build-toggle"]')
  if (autoToggle) {
    autoToggle.classList.toggle('on', state.droneAutoBuild)
    autoToggle.textContent = state.droneAutoBuild ? 'AUTO: ON' : 'AUTO: OFF'
  }
  const targetInput = document.querySelector<HTMLInputElement>('[data-bind="drone-target"]')
  if (targetInput && document.activeElement !== targetInput) {
    const shown = String(state.droneTargetCount)
    if (targetInput.value !== shown) targetInput.value = shown
  }
  const pending = state.droneBuildActive ? 1 : 0
  setText(
    'auto-build-status',
    `${state.drones.length}${pending ? '+1' : ''} / ${state.droneTargetCount}${
      state.droneAutoBuild ? ' · auto' : ''
    }`,
  )

  const hint = document.querySelector('[data-bind="search-target-hint"]')
  if (hint) {
    if (state.searchTargetResourceId) {
      hint.textContent = `Finds always include ${resourceName(state.searchTargetResourceId)}.`
    } else {
      const next = RESOURCE_CATALOG.find(
        (r) =>
          r.minSearchLevel <= state.searchLevel && !isSearchTargetable(r, state.searchLevel),
      )
      hint.textContent = next
        ? `Target ${next.name} from search Lv ${searchTargetMinLevel(next)}.`
        : 'Choose a resource to guarantee in finds.'
    }
  }

  renderStockpile(state, active)
  renderDroneGroups(state)
  renderEventLog(state)
  renderQueueList(state)
  renderSearchTargetChips(state)
}
