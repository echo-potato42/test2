import { save, load } from '../utils/storage.js'

const DEFAULT_STATE = {
  tasks: {},
  activeTimerTaskId: null,
  timerRemainingMs: 0,
  timerPaused: false,
  pauseResumeAt: null,
  availableTags: [],
}

let state = { ...DEFAULT_STATE }
const listeners = new Set()

export function getState() {
  return state
}

export function setState(updater) {
  state = updater(state)
  save(state)
  for (const fn of listeners) {
    fn(state)
  }
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function loadState() {
  const saved = load()
  if (saved) {
    state = { ...DEFAULT_STATE, ...saved }
  }
}
