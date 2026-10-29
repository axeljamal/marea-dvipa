import React from 'react';
import { createRoot } from 'react-dom/client';
import Shell from './shell/Shell';
import './shell/shell.css';
import './styles.css';
import './lab/lab.css';
import './welcome/welcome.css';

createRoot(document.getElementById('root')).render(<Shell />);
