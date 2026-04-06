import { useEffect } from 'react';
import { useSettings } from '@/hooks/useSettings';

const upsertHeadTag = (selector: string, create: () => HTMLElement, apply: (element: HTMLElement) => void) => {
  let element = document.head.querySelector(selector) as HTMLElement | null;
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  apply(element);
};

export const WebAppMeta = () => {
  const { settings } = useSettings();

  useEffect(() => {
    const iconHref = settings.favicon || settings.logoUrl || '/app-icon-192.png';

    upsertHeadTag('link[rel="manifest"]', () => document.createElement('link'), (element) => {
      const link = element as HTMLLinkElement;
      link.rel = 'manifest';
      link.href = '/manifest.webmanifest';
    });

    upsertHeadTag('meta[name="theme-color"]', () => document.createElement('meta'), (element) => {
      const meta = element as HTMLMetaElement;
      meta.name = 'theme-color';
      meta.content = '#0b1018';
    });

    upsertHeadTag('meta[name="apple-mobile-web-app-capable"]', () => document.createElement('meta'), (element) => {
      const meta = element as HTMLMetaElement;
      meta.name = 'apple-mobile-web-app-capable';
      meta.content = 'yes';
    });

    upsertHeadTag('meta[name="apple-mobile-web-app-status-bar-style"]', () => document.createElement('meta'), (element) => {
      const meta = element as HTMLMetaElement;
      meta.name = 'apple-mobile-web-app-status-bar-style';
      meta.content = 'black-translucent';
    });

    upsertHeadTag('meta[name="apple-mobile-web-app-title"]', () => document.createElement('meta'), (element) => {
      const meta = element as HTMLMetaElement;
      meta.name = 'apple-mobile-web-app-title';
      meta.content = settings.siteName || 'HFT Pro';
    });

    upsertHeadTag('link[rel="apple-touch-icon"]', () => document.createElement('link'), (element) => {
      const link = element as HTMLLinkElement;
      link.rel = 'apple-touch-icon';
      link.href = iconHref;
    });
  }, [settings.favicon, settings.logoUrl, settings.siteName]);

  return null;
};