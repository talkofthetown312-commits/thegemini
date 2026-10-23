import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { lazy, Suspense } from 'react';
const OriginalOfflineTalkOS = lazy(() => import('./recovery/OriginalOfflineTalkOS'));
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="p-5 text-[#800000]">Opening TalkOS…</div>}>
      {import.meta.env.VITE_TALKOS_ORIGINAL_OFFLINE === '1' ? <OriginalOfflineTalkOS /> : <App />}
    </Suspense>
  </StrictMode>,
);
