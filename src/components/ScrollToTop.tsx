import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** Start every newly selected product/category/page at its heading, not the previous scroll position. */
export function ScrollToTop() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);
  return null;
}
