import './styles/noscam-final-ui.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { NoScamUIProvider } from './components/ui/NoScamUI'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <NoScamUIProvider>
        <App />
      </NoScamUIProvider>
    </BrowserRouter>
  </StrictMode>,
)