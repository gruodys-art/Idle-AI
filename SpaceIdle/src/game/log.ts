import type { GameLogEntry, GameLogKind, GameState } from './types.ts'

export const MAX_LOG_ENTRIES = 80

export function appendLog(
  state: GameState,
  message: string,
  kind: GameLogKind = 'info',
): GameState {
  const id = state.logSerial + 1
  const entry: GameLogEntry = {
    id,
    atSeconds: state.gameTimeSeconds,
    kind,
    message,
  }
  return {
    ...state,
    logSerial: id,
    gameLog: [entry, ...state.gameLog].slice(0, MAX_LOG_ENTRIES),
  }
}

export function appendLogs(
  state: GameState,
  lines: ReadonlyArray<{ message: string; kind?: GameLogKind }>,
): GameState {
  let next = state
  for (const line of lines) {
    next = appendLog(next, line.message, line.kind ?? 'info')
  }
  return next
}
