import WalletDepositSuccessPopup from './components/layout/WalletDepositSuccessPopup'
import AuthSuccessPopup from './components/layout/AuthSuccessPopup'
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
        <AuthSuccessPopup />
        <WalletDepositSuccessPopup />
        <App />
      </NoScamUIProvider>
    </BrowserRouter>
  </StrictMode>,
)