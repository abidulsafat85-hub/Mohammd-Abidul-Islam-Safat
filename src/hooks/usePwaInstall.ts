import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('pwa_installed') === 'true'
    );
  });
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone / PWA mode or marked installed
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      localStorage.getItem('pwa_installed') === 'true'
    ) {
      setIsInstalled(true);
    }

    // Check iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    const onAppInstalled = () => {
      setIsInstalled(true);
      try {
        localStorage.setItem('pwa_installed', 'true');
      } catch {}
      setDeferredPrompt(null);
    };

    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const markAsInstalled = () => {
    setIsInstalled(true);
    try {
      localStorage.setItem('pwa_installed', 'true');
    } catch {}
    setDeferredPrompt(null);
  };

  const promptInstall = async (): Promise<'accepted' | 'dismissed' | 'unsupported'> => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        try {
          localStorage.setItem('pwa_installed', 'true');
        } catch {}
      }
      setDeferredPrompt(null);
      return choiceResult.outcome;
    }
    return 'unsupported';
  };

  return {
    deferredPrompt,
    isInstallable: Boolean(deferredPrompt) || isIOS,
    isInstalled,
    isIOS,
    promptInstall,
    markAsInstalled,
  };
}
