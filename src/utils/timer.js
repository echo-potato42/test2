import { getState } from '../state/store.js'
import { tickTimer, resumeTimer, stopTimer, triggerUpdate } from '../state/actions.js'
import { sendNotification } from '../components/notification.js'
import { showToast } from '../components/toast.js'

let intervalId = null

export function startTimerLoop() {
  stopTimerLoop()
  intervalId = setInterval(() => {
    const state = getState()
    if (!state.activeTimerTaskId) return

    // Paused: check auto-resume, trigger re-render for countdown display
    if (state.timerPaused) {
      if (state.pauseResumeAt && Date.now() >= state.pauseResumeAt) {
        resumeTimer()
        showToast('Timer resumed')
      } else {
        triggerUpdate()
      }
      return
    }

    const remaining = tickTimer()

    if (remaining <= 0 && state.activeTimerTaskId) {
      const task = state.tasks[state.activeTimerTaskId]
      const title = task ? task.title : 'Task'
      stopTimer()
      sendNotification('Time is up!', `${title} - timer has finished`)
      showToast(`${title} - time is up!`)
    }
  }, 1000)
}

export function stopTimerLoop() {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}
