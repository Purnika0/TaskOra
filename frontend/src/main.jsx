// src/main.jsx — CSS import order matters
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import './styles/tailwind.css'    // Tailwind v4
import './styles/tokens.css'      // Design tokens / CSS variables
import './styles/base.css'        // Reset, typography, animations
import './styles/auth.css'        // Auth pages
import './styles/dashboard.css'   // App shell, sidebar, cards, tables

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode><App/></React.StrictMode>
)
