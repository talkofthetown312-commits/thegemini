import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

// A standalone offline-first Android entry has no Firebase imports or initialization.
// The existing cloud-connected TalkOS website remains on its original entry point.
const Application = lazy(() => import.meta.env.VITE_TALKOS_LOCAL_FIRST === '1'
  ? import('./fresh/FreshTalkOS').then(module => ({ default: module.FreshTalkOS }))
  : import('./App').then(module => ({ default: module.default }))
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={<div className="p-6 text-[#800000]">Loading TalkOS…</div>}>
      <Application />
    </Suspense>
  </StrictMode>
);
