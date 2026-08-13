import { useState, useEffect } from 'react';

export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const ready = (e) => {
      // Prevents the default mini-infobar or install prompt from appearing
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', ready);

    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      // Show the install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setDeferredPrompt(null);
      } else {
        console.log('User dismissed the install prompt');
      }
    }
  };

  return [deferredPrompt, promptInstall];
}
