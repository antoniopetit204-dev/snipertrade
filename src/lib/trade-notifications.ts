// Trade notification system with sound alerts

export interface TradeNotification {
  id: string;
  type: 'win' | 'loss' | 'info' | 'warning' | 'stop_loss' | 'take_profit';
  title: string;
  message: string;
  timestamp: Date;
  profit?: number;
}

type NotificationHandler = (notification: TradeNotification) => void;

class TradeNotificationService {
  private handlers: NotificationHandler[] = [];
  private audioCtx: AudioContext | null = null;
  private notifications: TradeNotification[] = [];
  private soundEnabled = true;

  get allNotifications() { return this.notifications; }
  get isSoundEnabled() { return this.soundEnabled; }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }

  subscribe(handler: NotificationHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter(h => h !== handler);
    };
  }

  notify(notification: Omit<TradeNotification, 'id' | 'timestamp'>) {
    const full: TradeNotification = {
      ...notification,
      id: Math.random().toString(36).slice(2),
      timestamp: new Date(),
    };
    this.notifications.unshift(full);
    if (this.notifications.length > 50) this.notifications = this.notifications.slice(0, 50);
    
    this.handlers.forEach(h => h(full));
    
    if (this.soundEnabled) {
      this.playSound(notification.type);
    }
  }

  private getAudioContext() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  private playSound(type: string) {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      switch (type) {
        case 'win':
        case 'take_profit':
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
          osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.2);
          break;
        case 'loss':
        case 'stop_loss':
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(330, ctx.currentTime + 0.15);
          break;
        case 'warning':
          osc.frequency.setValueAtTime(660, ctx.currentTime);
          osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
          break;
        default:
          osc.frequency.setValueAtTime(700, ctx.currentTime);
          break;
      }

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }

  clearAll() {
    this.notifications = [];
  }
}

export const tradeNotifications = new TradeNotificationService();
