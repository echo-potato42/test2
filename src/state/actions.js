import { setState, getState } from './store.js'
import { createTask } from '../models/task.js'

function checkParentCompletion(tasks, parentId) {
  const parent = tasks[parentId]
  if (!parent || parent.childIds.length === 0) return

  const allDone = parent.childIds.every((cid) => tasks[cid]?.completed)
  if (allDone && !parent.completed) {
    tasks[parentId] = { ...parent, completed: true, status: 'done', updatedAt: Date.now() }
  } else if (!allDone && parent.completed) {
    tasks[parentId] = { ...parent, completed: false, status: 'todo', updatedAt: Date.now() }
  }
}

export function addTask({ title, tags, estimatedMinutes, parentId }) {
  const task = createTask({ title, tags, estimatedMinutes, parentId })

  setState((prev) => {
    const tasks = { ...prev.tasks, [task.id]: task }
    let { activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt } = prev

    if (parentId && tasks[parentId]) {
      tasks[parentId] = {
        ...tasks[parentId],
        childIds: [...tasks[parentId].childIds, task.id],
        updatedAt: Date.now(),
      }
      if (activeTimerTaskId === parentId) {
        const p = tasks[parentId]
        if (p.timerStartedAt) {
          const elapsed = p.timerElapsedBeforePause + (Date.now() - p.timerStartedAt)
          tasks[parentId] = { ...tasks[parentId], timerStartedAt: null, timerElapsedBeforePause: elapsed }
        }
        activeTimerTaskId = null
        timerRemainingMs = 0
        timerPaused = false
        pauseResumeAt = null
      }
    }

    const tagSet = new Set(prev.availableTags)
    for (const tag of tags) tagSet.add(tag)

    return { ...prev, tasks, availableTags: [...tagSet], activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt }
  })

  return task.id
}

export function editTask(id, changes) {
  setState((prev) => {
    const task = prev.tasks[id]
    if (!task) return prev
    const tasks = { ...prev.tasks, [id]: { ...task, ...changes, updatedAt: Date.now() } }
    let availableTags = prev.availableTags
    if (changes.tags) {
      const tagSet = new Set(prev.availableTags)
      for (const tag of changes.tags) tagSet.add(tag)
      availableTags = [...tagSet]
    }
    return { ...prev, tasks, availableTags }
  })
}

export function deleteTask(id) {
  setState((prev) => {
    const task = prev.tasks[id]
    if (!task) return prev
    const tasks = { ...prev.tasks }

    const toDelete = []
    const collectChildren = (taskId) => {
      toDelete.push(taskId)
      const t = tasks[taskId]
      if (t) for (const childId of t.childIds) collectChildren(childId)
    }
    collectChildren(id)

    if (task.parentId && tasks[task.parentId]) {
      tasks[task.parentId] = {
        ...tasks[task.parentId],
        childIds: tasks[task.parentId].childIds.filter((cid) => cid !== id),
        updatedAt: Date.now(),
      }
    }
    for (const delId of toDelete) delete tasks[delId]

    let { activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt } = prev
    if (toDelete.includes(activeTimerTaskId)) {
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
    }

    if (task.parentId && tasks[task.parentId]) {
      checkParentCompletion(tasks, task.parentId)
    }

    return { ...prev, tasks, activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt }
  })
}

export function moveTask(id, newStatus) {
  const state = getState()
  const task = state.tasks[id]
  if (!task) return { ok: false, error: 'Task not found' }
  if (task.status === newStatus) return { ok: true }

  if (newStatus === 'inProgress') {
    const hasActive = Object.values(state.tasks).some(
      (t) => t.status === 'inProgress' && t.id !== id && t.childIds.length === 0
    )
    if (hasActive) return { ok: false, error: 'Only 1 task can be in progress' }
  }

  setState((prev) => {
    const tasks = { ...prev.tasks }
    const completed = newStatus === 'done'
    tasks[id] = { ...tasks[id], status: newStatus, completed, updatedAt: Date.now() }

    let { activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt } = prev
    if (newStatus !== 'inProgress' && activeTimerTaskId === id) {
      const t = tasks[id]
      if (t.timerStartedAt) {
        const elapsed = t.timerElapsedBeforePause + (Date.now() - t.timerStartedAt)
        tasks[id] = { ...tasks[id], timerStartedAt: null, timerElapsedBeforePause: elapsed }
      }
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
    }

    if (task.parentId) checkParentCompletion(tasks, task.parentId)

    return { ...prev, tasks, activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt }
  })

  return { ok: true }
}

export function toggleComplete(id) {
  setState((prev) => {
    const tasks = { ...prev.tasks }
    const task = { ...tasks[id] }
    task.completed = !task.completed
    task.status = task.completed ? 'done' : 'todo'
    task.updatedAt = Date.now()
    tasks[id] = task

    let { activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt } = prev
    if (activeTimerTaskId === id && task.completed) {
      if (task.timerStartedAt) {
        const elapsed = task.timerElapsedBeforePause + (Date.now() - task.timerStartedAt)
        tasks[id] = { ...tasks[id], timerStartedAt: null, timerElapsedBeforePause: elapsed }
      }
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
    }

    if (task.parentId) checkParentCompletion(tasks, task.parentId)

    return { ...prev, tasks, activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt }
  })
}

// --- Timer ---

export function startTimer(taskId) {
  const state = getState()
  const task = state.tasks[taskId]
  if (!task || !task.estimatedMinutes) return

  const totalMs = task.estimatedMinutes * 60 * 1000
  const elapsed = task.timerElapsedBeforePause || 0
  const remaining = totalMs - elapsed
  if (remaining <= 0) return

  setState((prev) => {
    const tasks = { ...prev.tasks }
    tasks[taskId] = { ...tasks[taskId], timerStartedAt: Date.now() }
    return { ...prev, tasks, activeTimerTaskId: taskId, timerRemainingMs: remaining, timerPaused: false, pauseResumeAt: null }
  })
}

export function tickTimer() {
  const state = getState()
  if (!state.activeTimerTaskId || state.timerPaused) return state.timerRemainingMs

  const task = state.tasks[state.activeTimerTaskId]
  if (!task || !task.timerStartedAt) return state.timerRemainingMs

  const totalMs = task.estimatedMinutes * 60 * 1000
  const elapsed = task.timerElapsedBeforePause + (Date.now() - task.timerStartedAt)
  const remaining = Math.max(0, totalMs - elapsed)

  setState((prev) => ({ ...prev, timerRemainingMs: remaining }))
  return remaining
}

export function pauseTimerForInterruption(minutes) {
  const state = getState()
  if (!state.activeTimerTaskId) return
  const task = state.tasks[state.activeTimerTaskId]
  if (!task || !task.timerStartedAt) return

  const elapsedSoFar = task.timerElapsedBeforePause + (Date.now() - task.timerStartedAt)

  setState((prev) => {
    const tasks = { ...prev.tasks }
    tasks[prev.activeTimerTaskId] = { ...tasks[prev.activeTimerTaskId], timerElapsedBeforePause: elapsedSoFar, timerStartedAt: null }
    return { ...prev, tasks, timerPaused: true, pauseResumeAt: Date.now() + minutes * 60 * 1000 }
  })
}

export function resumeTimer() {
  setState((prev) => {
    if (!prev.activeTimerTaskId) return prev
    const tasks = { ...prev.tasks }
    tasks[prev.activeTimerTaskId] = { ...tasks[prev.activeTimerTaskId], timerStartedAt: Date.now() }
    return { ...prev, tasks, timerPaused: false, pauseResumeAt: null }
  })
}

export function stopTimer() {
  setState((prev) => {
    if (!prev.activeTimerTaskId) return prev
    const tasks = { ...prev.tasks }
    tasks[prev.activeTimerTaskId] = { ...tasks[prev.activeTimerTaskId], timerStartedAt: null, timerElapsedBeforePause: 0 }
    return { ...prev, tasks, activeTimerTaskId: null, timerRemainingMs: 0, timerPaused: false, pauseResumeAt: null }
  })
}

export function resetTimerProgress(taskId) {
  setState((prev) => {
    const tasks = { ...prev.tasks }
    if (!tasks[taskId]) return prev
    tasks[taskId] = { ...tasks[taskId], timerStartedAt: null, timerElapsedBeforePause: 0 }
    let { activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt } = prev
    if (activeTimerTaskId === taskId) {
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
    }
    return { ...prev, tasks, activeTimerTaskId, timerRemainingMs, timerPaused, pauseResumeAt }
  })
}

export function triggerUpdate() {
  setState((prev) => ({ ...prev }))
}
