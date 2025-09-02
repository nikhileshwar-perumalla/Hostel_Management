import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App.jsx';
import './index.css';

// Configure Axios base URL from env (set VITE_API_URL in Vercel)
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);