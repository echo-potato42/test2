import {
  toggleComplete,
  deleteTask,
  moveTask,
  startTimer,
  pauseTimerForInterruption,
  resumeTimer,
  stopTimer,
  resetTimerProgress,
} from '../state/actions.js'
import { getState } from '../state/store.js'
import { makeDraggable } from '../utils/drag-drop.js'
import { showToast } from './toast.js'

function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function getTimerColor(remaining, total) {
  if (total <= 0) return 'green'
  const ratio = remaining / total
  if (ratio > 0.5) return 'green'
  if (ratio > 0.2) return 'yellow'
  return 'red'
}

export function renderTaskCard(task, { onEdit }) {
  const state = getState()
  const el = document.createElement('div')
  el.className = `task-card${task.completed ? ' completed' : ''}`
  el.dataset.taskId = task.id

  makeDraggable(el, task.id)

  // Header: checkbox + title
  const header = document.createElement('div')
  header.className = 'task-card-header'

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = task.completed
  checkbox.addEventListener('change', () => toggleComplete(task.id))

  const title = document.createElement('span')
  title.className = 'task-title'
  title.textContent = task.title

  header.append(checkbox, title)
  el.appendChild(header)

  // Parent label
  if (task.parentId) {
    const parentTask = state.tasks[task.parentId]
    if (parentTask) {
      const label = document.createElement('div')
      label.className = 'task-parent-label'
      label.textContent = parentTask.title
      el.appendChild(label)
    }
  }

  // Meta: tags + time
  if (task.tags.length > 0 || task.estimatedMinutes) {
    const meta = document.createElement('div')
    meta.className = 'task-meta'

    for (const tagName of task.tags) {
      const tag = document.createElement('span')
      tag.className = 'tag'
      tag.textContent = tagName
      meta.appendChild(tag)
    }

    if (task.estimatedMinutes) {
      const time = document.createElement('span')
      time.className = 'time-badge'
      time.textContent = `${task.estimatedMinutes}min`
      meta.appendChild(time)
    }

    el.appendChild(meta)
  }

  // Timer section (only for inProgress tasks with estimated time)
  if (task.status === 'inProgress' && task.estimatedMinutes) {
    const isActiveTimer = state.activeTimerTaskId === task.id
    const totalMs = task.estimatedMinutes * 60 * 1000
    const hasSavedProgress = task.timerElapsedBeforePause > 0

    if (isActiveTimer) {
      const timerSection = document.createElement('div')
      timerSection.className = 'card-timer'

      const timeDisplay = document.createElement('span')
      timeDisplay.className = `timer-time ${getTimerColor(state.timerRemainingMs, totalMs)}`
      timeDisplay.textContent = formatTime(state.timerRemainingMs)
      timerSection.appendChild(timeDisplay)

      if (state.timerPaused) {
        const pausedLabel = document.createElement('span')
        pausedLabel.className = 'timer-paused-label'
        if (state.pauseResumeAt) {
          const remain = Math.max(0, Math.ceil((state.pauseResumeAt - Date.now()) / 1000))
          const pm = Math.floor(remain / 60)
          const ps = remain % 60
          pausedLabel.textContent = `PAUSED (${pm}:${String(ps).padStart(2, '0')})`
        } else {
          pausedLabel.textContent = 'PAUSED'
        }
        timerSection.appendChild(pausedLabel)
      }

      const controls = document.createElement('div')
      controls.className = 'card-timer-controls'

      if (state.timerPaused) {
        const resumeBtn = document.createElement('button')
        resumeBtn.className = 'btn btn-sm btn-primary'
        resumeBtn.textContent = 'Resume'
        resumeBtn.addEventListener('click', (e) => { e.stopPropagation(); resumeTimer() })
        controls.appendChild(resumeBtn)
      } else {
        const interruptBtn = document.createElement('button')
        interruptBtn.className = 'btn btn-sm'
        interruptBtn.textContent = 'Interrupt'
        interruptBtn.addEventListener('click', (e) => {
          e.stopPropagation()
          showInterruptInput(controls, interruptBtn)
        })
        controls.appendChild(interruptBtn)
      }

      const stopBtn = document.createElement('button')
      stopBtn.className = 'btn btn-sm btn-danger'
      stopBtn.textContent = 'Stop'
      stopBtn.addEventListener('click', (e) => { e.stopPropagation(); stopTimer() })
      controls.appendChild(stopBtn)

      timerSection.appendChild(controls)
      el.appendChild(timerSection)
    } else {
      const timerStart = document.createElement('div')
      timerStart.className = 'card-timer-start'

      const btn = document.createElement('button')
      btn.className = 'btn btn-sm btn-primary'
      if (hasSavedProgress) {
        const remaining = totalMs - task.timerElapsedBeforePause
        btn.textContent = `Resume Timer (${formatTime(remaining)})`
      } else {
        btn.textContent = 'Start Timer'
      }
      btn.addEventListener('click', (e) => { e.stopPropagation(); startTimer(task.id) })
      timerStart.appendChild(btn)

      if (hasSavedProgress) {
        const resetBtn = document.createElement('button')
        resetBtn.className = 'btn btn-sm'
        resetBtn.textContent = 'Reset'
        resetBtn.addEventListener('click', (e) => { e.stopPropagation(); resetTimerProgress(task.id) })
        timerStart.appendChild(resetBtn)
      }

      el.appendChild(timerStart)
    }
  }

  // Actions: edit, delete, move arrows
  const actions = document.createElement('div')
  actions.className = 'task-actions'

  const editBtn = document.createElement('button')
  editBtn.className = 'btn-icon'
  editBtn.textContent = 'Edit'
  editBtn.addEventListener('click', (e) => { e.stopPropagation(); onEdit(task.id) })

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'btn-icon delete'
  deleteBtn.textContent = 'Del'
  deleteBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTask(task.id) })

  actions.append(editBtn, deleteBtn)

  const arrows = document.createElement('div')
  arrows.className = 'move-arrows'
  const statuses = ['todo', 'inProgress', 'done']
  const currentIdx = statuses.indexOf(task.status)

  if (currentIdx > 0) {
    const leftBtn = document.createElement('button')
    leftBtn.className = 'btn-icon'
    leftBtn.textContent = '\u2190'
    leftBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const result = moveTask(task.id, statuses[currentIdx - 1])
      if (!result.ok) showToast(result.error, 'error')
    })
    arrows.appendChild(leftBtn)
  }

  if (currentIdx < statuses.length - 1) {
    const rightBtn = document.createElement('button')
    rightBtn.className = 'btn-icon'
    rightBtn.textContent = '\u2192'
    rightBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      const result = moveTask(task.id, statuses[currentIdx + 1])
      if (!result.ok) showToast(result.error, 'error')
    })
    arrows.appendChild(rightBtn)
  }

  actions.appendChild(arrows)
  el.appendChild(actions)

  return el
}

function showInterruptInput(container, replaceEl) {
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
  okBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    const minutes = parseInt(input.value, 10)
    if (minutes > 0) pauseTimerForInterruption(minutes)
  })

  const cancelBtn = document.createElement('button')
  cancelBtn.className = 'btn btn-sm'
  cancelBtn.textContent = 'Cancel'
  cancelBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    form.replaceWith(replaceEl)
  })

  form.append(input, okBtn, cancelBtn)
  replaceEl.replaceWith(form)
}
