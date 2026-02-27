import { getState, setState } from '../state/store.js'
import { sendNotification } from '../components/notification.js'
import { showToast } from '../components/toast.js'

export function resumeTimerOnLoad() {
  const state = getState()
  if (!state.activeTimerTaskId) return

  const task = state.tasks[state.activeTimerTaskId]
  if (!task || !task.estimatedMinutes) return

  const totalMs = task.estimatedMinutes * 60 * 1000

  // If timer was paused, check if the pause period has elapsed
  if (state.timerPaused) {
    if (state.pauseResumeAt && Date.now() >= state.pauseResumeAt) {
      // Pause period ended while page was closed — resume timer
      // Calculate how much extra time passed after pause ended
      const extraElapsed = Date.now() - state.pauseResumeAt
      const newElapsed = task.timerElapsedBeforePause + extraElapsed
      const remaining = Math.max(0, totalMs - newElapsed)

      setState((prev) => {
        const tasks = { ...prev.tasks }
        tasks[prev.activeTimerTaskId] = {
          ...tasks[prev.activeTimerTaskId],
          timerStartedAt: Date.now(),
          timerElapsedBeforePause: newElapsed,
        }
        return {
          ...prev,
          tasks,
          timerPaused: false,
          pauseResumeAt: null,
          timerRemainingMs: remaining,
        }
      })

      if (remaining <= 0) {
        sendNotification('Time is up!', `${task.title} - timer finished while away`)
        showToast(`${task.title} - time is up!`)
      }
    }
    // If still within pause period, just leave it paused
    return
  }

  // Timer was running — calculate remaining from timerStartedAt
  if (!task.timerStartedAt) return

  const elapsed = task.timerElapsedBeforePause + (Date.now() - task.timerStartedAt)
  const remaining = Math.max(0, totalMs - elapsed)

  setState((prev) => ({
    ...prev,
    timerRemainingMs: remaining,
  }))

  if (remaining <= 0) {
    sendNotification('Time is up!', `${task.title} - timer finished while away`)
    showToast(`${task.title} - time is up!`)
  }
}
