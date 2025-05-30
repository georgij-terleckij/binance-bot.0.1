import React from 'react'
import ReactDOM from 'react-dom/client'
import { WebSocketProvider } from './websocket/WebSocketClient'
import App from './App'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
      <WebSocketProvider url="ws://localhost:8001/ws">
        <App />
        </WebSocketProvider>
  </React.StrictMode>
)
