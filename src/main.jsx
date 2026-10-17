import React from 'react';
import { createRoot } from 'react-dom/client';
import 'semplex-ui/tokens.css';
import 'semplex-ui/bundle.css';
import './app.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(<App />);
