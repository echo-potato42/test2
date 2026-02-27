import './style.css'
import { loadState, subscribe, getState } from './state/store.js'
import { renderBoard } from './components/board.js'
import { openTaskForm } from './components/task-form.js'
import { requestPermission } from './components/notification.js'
import { startTimerLoop } from './utils/timer.js'
import { resumeTimerOnLoad } from './utils/timer-resume.js'

// Load persisted state
loadState()

// Resume any active timer from before reload
resumeTimerOnLoad()

// Start the timer tick loop
startTimerLoop()

const app = document.querySelector('#app')

function render() {
  renderBoard(app, {
    onEdit: (taskId) => openTaskForm({ taskId }),
    onAddSubtask: (parentId) => openTaskForm({ parentId }),
    onAddTask: () => openTaskForm(),
  })
}

// Subscribe to state changes
subscribe(render)

// Initial render
render()

// Request notification permission on first interaction
document.addEventListener('click', () => requestPermission(), { once: true })
