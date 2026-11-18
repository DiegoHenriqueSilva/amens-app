import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import './app-frame.css';

/** Reserve a separate navigation row while reading a prayer, including mobile safe areas. */
export function AppFrame({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const prayerPage = pathname === '/pray';
  const scrollArea = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (prayerPage) scrollArea.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [prayerPage, search]);
  return (
    <div className={prayerPage ? 'prayer-app-frame' : 'min-h-screen relative'}>
      {prayerPage ? (
        <main ref={scrollArea} className="prayer-app-frame__content">
          {children}
        </main>
      ) : (
        children
      )}
      <BottomNav inline={prayerPage} />
    </div>
  );
}
