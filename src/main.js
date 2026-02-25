import './style.css'

const app = document.querySelector('#app')

app.innerHTML = `
  <h1>Hello World!</h1>
  <p>はじめてのWebアプリへようこそ</p>
  <button id="counter">カウント: 0</button>
`

let count = 0
const button = document.querySelector('#counter')

button.addEventListener('click', () => {
  count++
  button.textContent = `カウント: ${count}`
})
