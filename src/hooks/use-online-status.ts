
'use client';

import { useState, useEffect } from 'react';

export function useOnlineStatus() {
  // For server-side rendering and the initial client render, we'll default to true.
  // The effect will then update to the actual browser status.
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // This function runs only on the client after mounting.
    const handleStatusChange = () => {
      setIsOnline(navigator.onLine);
    };

    // Set initial status from the browser.
    handleStatusChange();

    // Listen for online/offline events.
    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    // Cleanup listeners on unmount.
    return () => {
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
    };
  }, []); // Empty array means this effect runs once on mount and cleanup on unmount.

  return isOnline;
}
