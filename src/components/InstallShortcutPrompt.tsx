import { Download, Share2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { getSettings } from '@/lib/store';

interface InstallShortcutPromptProps {
  variant?: 'landing' | 'dashboard';
}

export const InstallShortcutPrompt = ({ variant = 'dashboard' }: InstallShortcutPromptProps) => {
  const { canInstall, dismiss, install, isInstalled, showIosHint } = useInstallPrompt();
  const settings = getSettings();

  if (isInstalled || (!canInstall && !showIosHint)) return null;

  const compact = variant === 'dashboard';

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-sm ${compact ? 'p-3 sm:p-4' : 'p-4 sm:p-5'}`}>
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        aria-label="Dismiss install prompt"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-3 pr-8">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-secondary">
          {settings.favicon || settings.logoUrl ? (
            <img src={settings.favicon || settings.logoUrl} alt={`${settings.siteName || 'HFT Pro'} app icon`} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <Smartphone className="h-5 w-5 text-primary" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">Install Shortcut</p>
          <h2 className={`font-semibold text-foreground ${compact ? 'text-sm' : 'text-base sm:text-lg'}`}>
            Open {settings.siteName || 'HFT Pro'} like a mobile app
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {showIosHint
              ? 'On iPhone/iPad, tap Share in Safari, then choose Add to Home Screen.'
              : 'Add this dashboard to your home screen for a fast app-style launch on Android and iPhone.'}
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {canInstall ? (
              <Button onClick={() => void install()} className="h-8 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
                <Download className="mr-1.5 h-3.5 w-3.5" /> Install App
              </Button>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary px-3 py-2 text-xs text-foreground">
                <Share2 className="h-3.5 w-3.5 text-primary" /> Share → Add to Home Screen
              </div>
            )}
            <Button variant="outline" onClick={dismiss} className="h-8 rounded-xl border-border px-3 text-xs">
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};