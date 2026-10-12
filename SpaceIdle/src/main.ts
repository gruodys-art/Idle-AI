import './style.css'
import { hydrateState } from './game/migrate.ts'
import {
  applyOfflineCatchUp,
  buildOfflineSummary,
  MAX_CATCH_UP_SECONDS,
  MIN_OFFLINE_MODAL_SECONDS,
  type OfflineSummary,
} from './game/offline.ts'
import { createInitialState, syncDerivedStats } from './game/state.ts'
import {
  buildDrone,
  buyQueueUpgrade,
  buySearchUpgrade,
  discardAsteroid,
  moveAsteroidToIndex,
  moveAsteroidToTop,
  setAutoBuildDrones,
  setRequestedDroneCount,
  setSearchTargetResource,
  tick,
  upgradeDroneFab,
  upgradeDroneSafety,
  upgradeDroneTech,
} from './game/tick.ts'
import type { GameState } from './game/types.ts'
import {
  closeOverflow,
  hideOfflineProgressModal,
  hideResetConfirm,
  invalidateQueueList,
  mountShell,
  render,
  setAppTab,
  setQueueDragActive,
  setQueueDropTargetIndex,
  setSpeedButtonsActive,
  showOfflineProgressModal,
  showResetConfirm,
  toggleAssayExpanded,
  toggleOverflow,
  type AppTab,
} from './ui/render.ts'

const SPEED_OPTIONS = [1, 10, 100, 1000] as const
type GameSpeed = (typeof SPEED_OPTIONS)[number]

const SAVE_KEY = 'spaceidle.mining.v2'
const SAVE_KEY_V1 = 'spaceidle.mining.v1'
const SAVE_AT_KEY = 'spaceidle.mining.savedAt'

function loadSavedAtMs(): number | null {
  try {
    const raw = localStorage.getItem(SAVE_AT_KEY)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

function loadState(): GameState {
  try {
    const rawV2 = localStorage.getItem(SAVE_KEY)
    if (rawV2) {
      return syncDerivedStats(hydrateState(JSON.parse(rawV2)))
    }
    const rawV1 = localStorage.getItem(SAVE_KEY_V1)
    if (rawV1) {
      const migrated = syncDerivedStats(hydrateState(JSON.parse(rawV1)))
      localStorage.setItem(SAVE_KEY, JSON.stringify(migrated))
      return migrated
    }
    return createInitialState()
  } catch {
    return createInitialState()
  }
}

function saveState(gameState: GameState): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(gameState))
  localStorage.setItem(SAVE_AT_KEY, String(Date.now()))
}

function clearSaves(): void {
  localStorage.removeItem(SAVE_KEY)
  localStorage.removeItem(SAVE_KEY_V1)
  localStorage.removeItem(SAVE_AT_KEY)
}

function resolveOfflineOnBoot(loaded: GameState): {
  state: GameState
  summary: OfflineSummary | null
} {
  const savedAt = loadSavedAtMs()
  if (savedAt == null) {
    return { state: loaded, summary: null }
  }

  const elapsedSeconds = (Date.now() - savedAt) / 1000
  if (!(elapsedSeconds >= 1)) {
    return { state: loaded, summary: null }
  }

  const before = loaded
  const after = applyOfflineCatchUp(before, elapsedSeconds)
  const summary = buildOfflineSummary(before, after, elapsedSeconds)
  return {
    state: after,
    summary: summary.appliedSeconds >= MIN_OFFLINE_MODAL_SECONDS ? summary : null,
  }
}

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) {
  throw new Error('#app root missing')
}

const boot = resolveOfflineOnBoot(loadState())
let state = boot.state
let dragAsteroidId: string | null = null
let dragArmedFromHandle = false
/** Test-only sim speed; not persisted. */
let gameSpeed: GameSpeed = 1

mountShell(app)
setSpeedButtonsActive(gameSpeed)
saveState(state)
render(state)
if (boot.summary) {
  showOfflineProgressModal(boot.summary)
}

function applyState(next: GameState): void {
  state = next
  saveState(state)
  render(state)
}

app.addEventListener('pointerdown', (event) => {
  const target = event.target
  dragArmedFromHandle =
    target instanceof Element && Boolean(target.closest('.queue-drag'))
})

app.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  const button = target.closest<HTMLElement>('[data-action]')
  if (!button) return
  if (button instanceof HTMLButtonElement && button.disabled) return
  if (button instanceof HTMLSelectElement) return
  if (button instanceof HTMLInputElement) return

  const action = button.dataset.action
  const id = button.dataset.asteroidId

  if (action === 'set-speed') {
    const next = Number(button.dataset.speed)
    if (SPEED_OPTIONS.includes(next as GameSpeed)) {
      gameSpeed = next as GameSpeed
      setSpeedButtonsActive(gameSpeed)
    }
    return
  }

  if (action === 'set-tab') {
    const tab = button.dataset.tab as AppTab | undefined
    if (tab) setAppTab(tab)
    return
  }

  if (action === 'toggle-overflow') {
    toggleOverflow()
    return
  }

  if (action === 'open-reset') {
    showResetConfirm()
    return
  }

  if (action === 'cancel-reset') {
    hideResetConfirm()
    return
  }

  if (action === 'reset-game') {
    hideResetConfirm()
    resetGame()
    return
  }

  if (action === 'toggle-assay') {
    toggleAssayExpanded()
    render(state)
    return
  }

  if (action === 'toggle-auto-build') {
    applyState(setAutoBuildDrones(state, !state.droneAutoBuild))
    return
  }

  if (action === 'nudge-drone-target') {
    const delta = Number(button.dataset.delta)
    applyState(setRequestedDroneCount(state, state.droneTargetCount + delta))
    return
  }

  if (action === 'set-search-target') {
    const resourceId = button.dataset.resourceId || null
    applyState(setSearchTargetResource(state, resourceId))
    return
  }

  if (action === 'build-drone') {
    applyState(buildDrone(state))
  } else if (action === 'upgrade-drone-tech') {
    applyState(upgradeDroneTech(state))
  } else if (action === 'upgrade-drone-fab') {
    applyState(upgradeDroneFab(state))
  } else if (action === 'upgrade-drone-safety') {
    applyState(upgradeDroneSafety(state))
  } else if (action === 'upgrade-search') {
    applyState(buySearchUpgrade(state))
  } else if (action === 'upgrade-queue') {
    applyState(buyQueueUpgrade(state))
  } else if (action === 'move-asteroid-top' && id) {
    invalidateQueueList()
    applyState(moveAsteroidToTop(state, id))
  } else if (action === 'discard-asteroid' && id) {
    invalidateQueueList()
    applyState(discardAsteroid(state, id))
  }
})

document.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (
    target.closest('[data-action="dismiss-offline"]') ||
    target.matches('[data-bind="offline-modal"]')
  ) {
    hideOfflineProgressModal()
  }
})

document.addEventListener('click', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (
    !target.closest('[data-bind="overflow-menu"]') &&
    !target.closest('[data-action="toggle-overflow"]')
  ) {
    closeOverflow()
  }
})

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  hideOfflineProgressModal()
  hideResetConfirm()
  closeOverflow()
})

app.addEventListener('change', (event) => {
  const target = event.target
  if (target instanceof HTMLSelectElement) {
    if (target.dataset.action === 'set-search-target') {
      const id = target.value || null
      applyState(setSearchTargetResource(state, id))
    }
    return
  }
  if (!(target instanceof HTMLInputElement)) return
  const action = target.dataset.action
  if (action === 'toggle-auto-build') {
    applyState(setAutoBuildDrones(state, target.checked))
  } else if (action === 'set-drone-target') {
    applyState(setRequestedDroneCount(state, Number(target.value)))
  }
})

app.addEventListener('dragstart', (event) => {
  const target = event.target
  if (!(target instanceof Element)) return
  if (!dragArmedFromHandle) {
    event.preventDefault()
    return
  }
  const item = target.closest<HTMLElement>('.queue-item[draggable="true"]')
  if (!item || !event.dataTransfer) return
  const id = item.dataset.asteroidId
  if (!id) return
  dragAsteroidId = id
  setQueueDragActive(true)
  item.classList.add('dragging')
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', id)
})

app.addEventListener('dragend', () => {
  dragAsteroidId = null
  dragArmedFromHandle = false
  setQueueDragActive(false)
  setQueueDropTargetIndex(-1)
  invalidateQueueList()
  render(state)
})

app.addEventListener('dragover', (event) => {
  if (!dragAsteroidId) return
  const target = event.target
  if (!(target instanceof Element)) return
  const item = target.closest<HTMLElement>('.queue-item[data-asteroid-id]')
  if (!item) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'

  const overId = item.dataset.asteroidId
  if (!overId || overId === dragAsteroidId) return
  const toIndex = state.asteroidQueue.findIndex((a) => a.id === overId)
  if (toIndex < 0) return
  setQueueDropTargetIndex(toIndex)

  for (const el of app.querySelectorAll('.queue-item.drop-target')) {
    el.classList.remove('drop-target')
  }
  item.classList.add('drop-target')
})

app.addEventListener('drop', (event) => {
  event.preventDefault()
  const target = event.target
  if (!(target instanceof Element) || !dragAsteroidId) return
  const item = target.closest<HTMLElement>('.queue-item[data-asteroid-id]')
  if (!item) return
  const overId = item.dataset.asteroidId
  if (!overId) return
  const toIndex = state.asteroidQueue.findIndex((a) => a.id === overId)
  if (toIndex < 0) return

  setQueueDragActive(false)
  invalidateQueueList()
  applyState(moveAsteroidToIndex(state, dragAsteroidId, toIndex))
  dragAsteroidId = null
  setQueueDropTargetIndex(-1)
})

let lastTs = performance.now()
let saveAccum = 0

function resetGame(): void {
  clearSaves()
  hideOfflineProgressModal()
  invalidateQueueList()
  dragAsteroidId = null
  dragArmedFromHandle = false
  lastTs = performance.now()
  saveAccum = 0
  applyState(createInitialState())
}

function frame(now: number): void {
  const rawDt = (now - lastTs) / 1000
  lastTs = now
  const wallDt = Math.min(Math.max(rawDt, 0), MAX_CATCH_UP_SECONDS)
  const dt = Math.min(wallDt * gameSpeed, MAX_CATCH_UP_SECONDS)

  state = tick(state, dt)
  saveAccum += wallDt
  if (saveAccum >= 2) {
    saveState(state)
    saveAccum = 0
  }

  render(state)
  requestAnimationFrame(frame)
}

window.addEventListener('pagehide', () => {
  saveState(state)
})

requestAnimationFrame(frame)
