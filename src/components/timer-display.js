import { getState } from '../state/store.js'
import {
  pauseTimerForInterruption,
  resumeTimer,
  stopTimer,
} from '../state/actions.js'

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function getTimerColor(remaining, total) {
  if (total <= 0) return 'green'
  const ratio = remaining / total
  if (ratio > 0.5) return 'green'
  if (ratio > 0.2) return 'yellow'
  return 'red'
}

export function renderTimerBar() {
  const state = getState()
  const el = document.createElement('div')
  el.className = 'timer-bar'

  if (!state.activeTimerTaskId) {
    el.classList.add('hidden')
    return el
  }

  const task = state.tasks[state.activeTimerTaskId]
  if (!task) {
    el.classList.add('hidden')
    return el
  }

  const totalMs = task.estimatedMinutes * 60 * 1000

  // Time display
  const timeEl = document.createElement('span')
  timeEl.className = `timer-time ${getTimerColor(state.timerRemainingMs, totalMs)}`
  timeEl.textContent = formatTime(state.timerRemainingMs)
  el.appendChild(timeEl)

  // Task name
  const nameEl = document.createElement('span')
  nameEl.className = 'timer-task-name'
  nameEl.textContent = task.title
  el.appendChild(nameEl)

  // Paused label
  if (state.timerPaused) {
    const pausedEl = document.createElement('span')
    pausedEl.className = 'timer-paused-label'
    if (state.pauseResumeAt) {
      const remainPause = Math.max(
        0,
        Math.ceil((state.pauseResumeAt - Date.now()) / 1000)
      )
      const m = Math.floor(remainPause / 60)
      const s = remainPause % 60
      pausedEl.textContent = `PAUSED (${m}:${String(s).padStart(2, '0')})`
    } else {
      pausedEl.textContent = 'PAUSED'
    }
    el.appendChild(pausedEl)
  }

  // Actions
  const actions = document.createElement('div')
  actions.className = 'timer-actions'

  if (state.timerPaused) {
    const resumeBtn = document.createElement('button')
    resumeBtn.className = 'btn btn-sm btn-primary'
    resumeBtn.textContent = 'Resume'
    resumeBtn.addEventListener('click', () => resumeTimer())
    actions.appendChild(resumeBtn)
  } else {
    // Interrupt button
    const interruptBtn = document.createElement('button')
    interruptBtn.className = 'btn btn-sm'
    interruptBtn.textContent = 'Interrupt'
    interruptBtn.addEventListener('click', () => {
      showInterruptForm(actions)
    })
    actions.appendChild(interruptBtn)
  }

  const stopBtn = document.createElement('button')
  stopBtn.className = 'btn btn-sm btn-danger'
  stopBtn.textContent = 'Stop'
  stopBtn.addEventListener('click', () => stopTimer())
  actions.appendChild(stopBtn)

  el.appendChild(actions)
  return el
}

function showInterruptForm(container) {
  // Replace the interrupt button with an inline form
  const existing = container.querySelector('.interrupt-form')
  if (existing) return

  const form = document.createElement('div')
  form.className = 'interrupt-form'

  const input = document.createElement('input')
  input.type = 'number'
  input.min = '1'
  input.placeholder = 'min'
  input.value = '5'

  const okBtn = document.createElement('button')
  okBtn.className = 'btn btn-sm btn-primary'
  okBtn.textContent = 'OK'
  okBtn.addEventListener('click', () => {
    const minutes = parseInt(input.value, 10)
    if (minutes > 0) {
      pauseTimerForInterruption(minutes)
    }
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'btn btn-sm'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', () => form.remove())

  form.append(input, okBtn, cancelBtn)

  // Insert before the stop button
  const interruptBtn = container.querySelector('.btn:not(.btn-danger)')
  if (interruptBtn) {
    interruptBtn.replaceWith(form)
  } else {
    container.prepend(form)
  }
}
