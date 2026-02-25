import {
  toggleComplete,
  deleteTask,
  moveTask,
  startTimer,
} from '../state/actions.js'
import { getState } from '../state/store.js'
import { makeDraggable } from '../utils/drag-drop.js'
import { showToast } from './toast.js'

export function renderTaskCard(task, { onEdit, onAddSubtask }) {
  const state = getState()
  const el = document.createElement('div')
  el.className = `task-card${task.completed ? ' completed' : ''}`
  el.dataset.taskId = task.id

  // Only top-level tasks are draggable
  if (!task.parentId) {
    makeDraggable(el, task.id)
  }

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

  // Meta: tags + estimated time
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

  // Timer start button (inProgress + has time + no active timer on this task)
  if (
    task.status === 'inProgress' &&
    task.estimatedMinutes &&
    !task.parentId &&
    state.activeTimerTaskId !== task.id
  ) {
    const timerBtn = document.createElement('button')
    timerBtn.className = 'btn btn-sm btn-primary'
    timerBtn.textContent = 'Start Timer'
    timerBtn.style.marginTop = '0.5rem'
    timerBtn.addEventListener('click', (e) => {
      e.stopPropagation()
      startTimer(task.id)
    })
    el.appendChild(timerBtn)
  }

  // Subtasks
  if (task.childIds.length > 0) {
    const subtaskList = document.createElement('div')
    subtaskList.className = 'subtask-list'

    for (const childId of task.childIds) {
      const child = state.tasks[childId]
      if (!child) continue

      const item = document.createElement('div')
      item.className = `subtask-item${child.completed ? ' completed' : ''}`

      const childCheck = document.createElement('input')
      childCheck.type = 'checkbox'
      childCheck.checked = child.completed
      childCheck.addEventListener('change', () => toggleComplete(childId))

      const childLabel = document.createElement('span')
      childLabel.textContent = child.title

      if (child.estimatedMinutes) {
        const childTime = document.createElement('span')
        childTime.className = 'time-badge'
        childTime.textContent = `${child.estimatedMinutes}min`
        item.append(childCheck, childLabel, childTime)
      } else {
        item.append(childCheck, childLabel)
      }

      subtaskList.appendChild(item)
    }

    el.appendChild(subtaskList)
  }

  // Add subtask button
  const addSubBtn = document.createElement('button')
  addSubBtn.className = 'add-subtask-btn'
  addSubBtn.textContent = '+ subtask'
  addSubBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    onAddSubtask(task.id)
  })
  el.appendChild(addSubBtn)

  // Actions: edit, delete, move arrows
  const actions = document.createElement('div')
  actions.className = 'task-actions'

  const editBtn = document.createElement('button')
  editBtn.className = 'btn-icon'
  editBtn.textContent = 'Edit'
  editBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    onEdit(task.id)
  })

  const deleteBtn = document.createElement('button')
  deleteBtn.className = 'btn-icon delete'
  deleteBtn.textContent = 'Del'
  deleteBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    deleteTask(task.id)
  })

  actions.append(editBtn, deleteBtn)

  // Move arrows (only for top-level tasks)
  if (!task.parentId) {
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
  }

  el.appendChild(actions)

  return el
}
