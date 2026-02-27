import { setState, getState } from './store.js'
import { createTask } from '../models/task.js'

export function addTask({ title, tags, estimatedMinutes, parentId }) {
  const task = createTask({ title, tags, estimatedMinutes, parentId })

  setState((prev) => {
    const tasks = { ...prev.tasks, [task.id]: task }

    // Register as child of parent
    if (parentId && tasks[parentId]) {
      tasks[parentId] = {
        ...tasks[parentId],
        childIds: [...tasks[parentId].childIds, task.id],
        updatedAt: Date.now(),
      }
    }

    // Add new tags to availableTags
    const tagSet = new Set(prev.availableTags)
    for (const tag of tags) tagSet.add(tag)

    return { ...prev, tasks, availableTags: [...tagSet] }
  })

  return task.id
}

export function editTask(id, changes) {
  setState((prev) => {
    const task = prev.tasks[id]
    if (!task) return prev

    const tasks = {
      ...prev.tasks,
      [id]: { ...task, ...changes, updatedAt: Date.now() },
    }

    // Update availableTags if tags changed
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

    // Recursively collect all descendant IDs
    const toDelete = []
    const collectChildren = (taskId) => {
      toDelete.push(taskId)
      const t = tasks[taskId]
      if (t) {
        for (const childId of t.childIds) {
          collectChildren(childId)
        }
      }
    }
    collectChildren(id)

    // Remove from parent's childIds
    if (task.parentId && tasks[task.parentId]) {
      tasks[task.parentId] = {
        ...tasks[task.parentId],
        childIds: tasks[task.parentId].childIds.filter((cid) => cid !== id),
        updatedAt: Date.now(),
      }
    }

    // Delete all collected tasks
    for (const delId of toDelete) {
      delete tasks[delId]
    }

    // Stop timer if active task was deleted
    let activeTimerTaskId = prev.activeTimerTaskId
    let timerRemainingMs = prev.timerRemainingMs
    let timerPaused = prev.timerPaused
    let pauseResumeAt = prev.pauseResumeAt
    if (toDelete.includes(prev.activeTimerTaskId)) {
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
    }

    return {
      ...prev,
      tasks,
      activeTimerTaskId,
      timerRemainingMs,
      timerPaused,
      pauseResumeAt,
    }
  })
}

export function moveTask(id, newStatus) {
  const state = getState()
  const task = state.tasks[id]
  if (!task) return { ok: false, error: 'タスクが見つかりません' }

  // WIP limit: only 1 top-level task in "inProgress"
  if (newStatus === 'inProgress' && !task.parentId) {
    const hasActive = Object.values(state.tasks).some(
      (t) => t.status === 'inProgress' && !t.parentId && t.id !== id
    )
    if (hasActive) {
      return { ok: false, error: '作業中のタスクは1つまでです' }
    }
  }

  setState((prev) => {
    const tasks = { ...prev.tasks }
    tasks[id] = { ...tasks[id], status: newStatus, updatedAt: Date.now() }

    // Move children along with parent
    const moveChildren = (parentId, status) => {
      const parent = tasks[parentId]
      if (!parent) return
      for (const childId of parent.childIds) {
        if (tasks[childId]) {
          tasks[childId] = {
            ...tasks[childId],
            status,
            updatedAt: Date.now(),
          }
          moveChildren(childId, status)
        }
      }
    }
    moveChildren(id, newStatus)

    // If moved out of inProgress, stop timer
    let activeTimerTaskId = prev.activeTimerTaskId
    let timerRemainingMs = prev.timerRemainingMs
    let timerPaused = prev.timerPaused
    let pauseResumeAt = prev.pauseResumeAt
    if (newStatus !== 'inProgress' && prev.activeTimerTaskId === id) {
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
      tasks[id] = {
        ...tasks[id],
        timerStartedAt: null,
        timerElapsedBeforePause: 0,
      }
    }

    return {
      ...prev,
      tasks,
      activeTimerTaskId,
      timerRemainingMs,
      timerPaused,
      pauseResumeAt,
    }
  })

  return { ok: true }
}

export function toggleComplete(id) {
  setState((prev) => {
    const tasks = { ...prev.tasks }
    const task = { ...tasks[id] }
    task.completed = !task.completed
    task.updatedAt = Date.now()

    // If completing parent, complete all children too
    if (task.completed) {
      task.status = 'done'
      const completeAll = (taskId) => {
        const t = tasks[taskId]
        if (!t) return
        for (const childId of t.childIds) {
          tasks[childId] = {
            ...tasks[childId],
            completed: true,
            status: 'done',
            updatedAt: Date.now(),
          }
          completeAll(childId)
        }
      }
      completeAll(id)
    } else {
      // Un-completing: move back to todo
      task.status = 'todo'
    }

    tasks[id] = task

    // Walk up parent chain
    let currentParentId = task.parentId
    while (currentParentId) {
      const parent = { ...tasks[currentParentId] }
      const allDone = parent.childIds.every((cid) => tasks[cid]?.completed)

      if (allDone && !parent.completed) {
        parent.completed = true
        parent.status = 'done'
        parent.updatedAt = Date.now()
      } else if (!allDone && parent.completed) {
        parent.completed = false
        parent.status = 'todo'
        parent.updatedAt = Date.now()
      }

      tasks[currentParentId] = parent
      currentParentId = parent.parentId
    }

    // Stop timer if the completed task was being timed
    let activeTimerTaskId = prev.activeTimerTaskId
    let timerRemainingMs = prev.timerRemainingMs
    let timerPaused = prev.timerPaused
    let pauseResumeAt = prev.pauseResumeAt
    if (prev.activeTimerTaskId === id && task.completed) {
      activeTimerTaskId = null
      timerRemainingMs = 0
      timerPaused = false
      pauseResumeAt = null
    }

    return {
      ...prev,
      tasks,
      activeTimerTaskId,
      timerRemainingMs,
      timerPaused,
      pauseResumeAt,
    }
  })
}

// Timer actions

export function startTimer(taskId) {
  const state = getState()
  const task = state.tasks[taskId]
  if (!task || !task.estimatedMinutes) return

  const totalMs = task.estimatedMinutes * 60 * 1000

  setState((prev) => {
    const tasks = { ...prev.tasks }
    tasks[taskId] = {
      ...tasks[taskId],
      timerStartedAt: Date.now(),
      timerElapsedBeforePause: 0,
    }
    return {
      ...prev,
      tasks,
      activeTimerTaskId: taskId,
      timerRemainingMs: totalMs,
      timerPaused: false,
      pauseResumeAt: null,
    }
  })
}

export function tickTimer() {
  const state = getState()
  if (!state.activeTimerTaskId || state.timerPaused) return 0

  const task = state.tasks[state.activeTimerTaskId]
  if (!task || !task.timerStartedAt) return 0

  const totalMs = task.estimatedMinutes * 60 * 1000
  const elapsed = task.timerElapsedBeforePause + (Date.now() - task.timerStartedAt)
  const remaining = Math.max(0, totalMs - elapsed)

  // Only update store every ~1s to avoid excessive re-renders
  // The caller (timer-display) handles visual updates at 250ms locally
  setState((prev) => ({
    ...prev,
    timerRemainingMs: remaining,
  }))

  return remaining
}

export function pauseTimerForInterruption(minutes) {
  const state = getState()
  if (!state.activeTimerTaskId) return

  const task = state.tasks[state.activeTimerTaskId]
  if (!task || !task.timerStartedAt) return

  // Calculate elapsed so far and store it
  const elapsedSoFar =
    task.timerElapsedBeforePause + (Date.now() - task.timerStartedAt)

  setState((prev) => {
    const tasks = { ...prev.tasks }
    tasks[prev.activeTimerTaskId] = {
      ...tasks[prev.activeTimerTaskId],
      timerElapsedBeforePause: elapsedSoFar,
      timerStartedAt: null,
    }
    return {
      ...prev,
      tasks,
      timerPaused: true,
      pauseResumeAt: Date.now() + minutes * 60 * 1000,
    }
  })
}

export function resumeTimer() {
  setState((prev) => {
    if (!prev.activeTimerTaskId) return prev

    const tasks = { ...prev.tasks }
    tasks[prev.activeTimerTaskId] = {
      ...tasks[prev.activeTimerTaskId],
      timerStartedAt: Date.now(),
    }
    return {
      ...prev,
      tasks,
      timerPaused: false,
      pauseResumeAt: null,
    }
  })
}

export function stopTimer() {
  setState((prev) => {
    if (!prev.activeTimerTaskId) return prev

    const tasks = { ...prev.tasks }
    tasks[prev.activeTimerTaskId] = {
      ...tasks[prev.activeTimerTaskId],
      timerStartedAt: null,
      timerElapsedBeforePause: 0,
    }
    return {
      ...prev,
      tasks,
      activeTimerTaskId: null,
      timerRemainingMs: 0,
      timerPaused: false,
      pauseResumeAt: null,
    }
  })
}
