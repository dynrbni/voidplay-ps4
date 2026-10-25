import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { parseRoute, routeHash } from './routes.ts';
import type { Route } from './routes.ts';

type ViewPosition = { scroll: number; focus: HTMLElement | null };

export function useStoreNavigation() {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  const current = useRef(route);
  const positions = useRef(new Map<string, ViewPosition>());
  const focusHeading = useRef<HTMLDivElement>(null);

  function remember() {
    positions.current.set(routeHash(current.current), {
      scroll: window.scrollY,
      focus: document.activeElement instanceof HTMLElement ? document.activeElement : null
    });
  }
  function navigate(next: Route) {
    if (routeHash(next) === routeHash(current.current)) return;
    remember();
    const depth = typeof history.state?.voidplayDepth === 'number' ? history.state.voidplayDepth : 0;
    history.pushState({ voidplayDepth: depth + 1 }, '', routeHash(next));
    setRoute(next);
  }
  function back() {
    if (history.state?.voidplayDepth > 0) history.back();
    else navigate({ page: 'discover' });
  }

  useLayoutEffect(() => {
    current.current = route;
    const saved = positions.current.get(routeHash(route));
    const target = saved?.focus?.isConnected && saved.focus.getClientRects().length ? saved.focus : focusHeading.current;
    target?.focus({ preventScroll: true });
    window.scrollTo(0, saved?.scroll ?? 0);
  }, [route]);

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    function changed() {
      const next = parseRoute(location.hash);
      if (routeHash(next) === routeHash(current.current)) return;
      remember(); setRoute(next);
    }
    function keyboard(event: KeyboardEvent) {
      if (event.key !== 'Escape' || event.defaultPrevented || current.current.page === 'discover') return;
      event.preventDefault();
      if (history.state?.voidplayDepth > 0) history.back();
      else {
        remember();
        history.replaceState({ voidplayDepth: 0 }, '', '#/discover');
        setRoute({ page: 'discover' });
      }
    }
    window.addEventListener('popstate', changed);
    window.addEventListener('hashchange', changed);
    document.addEventListener('keydown', keyboard);
    return () => {
      history.scrollRestoration = previous;
      window.removeEventListener('popstate', changed);
      window.removeEventListener('hashchange', changed);
      document.removeEventListener('keydown', keyboard);
    };
  }, []);
  return { route, navigate, back, focusHeading };
}
