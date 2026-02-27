let permissionRequested = false

export function requestPermission() {
  if (permissionRequested) return
  if ('Notification' in window && Notification.permission === 'default') {
    permissionRequested = true
    Notification.requestPermission()
  }
}

export function sendNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}
