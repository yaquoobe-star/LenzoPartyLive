import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import {androidBridge} from './utils/androidBridge';

androidBridge.initViewportMetrics();

createRoot(document.getElementById('root')!).render(<App />);
