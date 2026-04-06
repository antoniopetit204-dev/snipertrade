import { useCallback, useEffect, useMemo, useState } from 'react';

interface DeferredInstallPrompt extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const INSTALL_DISMISS_KEY = 'hft_install_prompt_hidden';

const isStandaloneMode = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

const isIosSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  const ios = /iphone|ipad|ipod/.test(ua);
  const safari = /safari/.test(ua) && !/crios|fxios|edgios/.test(ua);
  return ios && safari;
};

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<DeferredInstallPrompt | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandaloneMode());
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(INSTALL_DISMISS_KEY) === '1');

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as DeferredInstallPrompt);
      setDismissed(false);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(INSTALL_DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const canInstall = useMemo(() => !dismissed && !isInstalled && Boolean(deferredPrompt), [dismissed, isInstalled, deferredPrompt]);
  const showIosHint = useMemo(() => !dismissed && !isInstalled && !deferredPrompt && isIosSafari(), [dismissed, isInstalled, deferredPrompt]);

  return {
    canInstall,
    dismiss,
    install,
    isInstalled,
    showIosHint,
  };
};