/** Preserve addresses, URLs, and HTML attributes; only normalize human-facing copy. */
export function accountEmailCopy(value: string): string {
  return value.split(/(https?:\/\/[^\s<>"']+|[\w.+-]+@[\w.-]+\.[a-z]{2,}|\{\{\w+\}\})/gi)
    .map((part, index) => index % 2 ? part : part
      .replace(/\bhigh[ -]frequency\s+trading\b/gi, 'HFT')
      .replace(/\bprofit\s*(?:and|&|\/)\s*loss\b|\bP\s*\/\s*L\b/gi, 'balance change')
      .replace(/\btrading\s+balance\b/gi, 'account balance')
      .replace(/\bstart\s+trading(?:\s+right\s+away)?\b/gi, 'access your account')
      .replace(/\btraders?\b/gi, 'member')
      .replace(/\btrading\b/gi, 'account activity')
      .replace(/\btrades?\b/gi, 'activity')
      .replace(/\b(?:forex|stocks?|commodities|cryptocurrency|crypto|investment|investing|gambling|bets?|betting)\b/gi, 'activity')
      .replace(/\bprofits?\b/gi, 'positive balance change')
      .replace(/\blosses?\b/gi, 'negative balance change'))
    .join('');
}

export function accountEmailHtml(html: string): string {
  return html.split(/(<[^>]*>)/g).map((part, index) => index % 2 ? part : accountEmailCopy(part)).join('');
}

export function safeMailSubject(subject: string): string {
  return accountEmailCopy(subject).replace(/[\r\n\u0000-\u001f\u007f]/g, ' ')
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u2713\u2714]/gu, '')
    .replace(/!{2,}/g, '!').replace(/\s{2,}/g, ' ').trim().slice(0, 160);
}

export function isMailbox(value: string): boolean {
  return value.length <= 254 && /^[^\s<>@,;"\r\n]+@[^\s<>@,;"\r\n]+\.[a-z]{2,}$/i.test(value);
}

export const isHardBounce = (message: string) =>
  /\b5\.1\.[0126]\b|user unknown|no such (?:user|mailbox)|mailbox (?:not found|does not exist)|invalid recipient/i.test(message);

/** Bounded, per-worker backpressure; not a global or durable mail queue. */
export class MailSendLimiter {
  private active = 0;
  private waiters: Array<() => void> = [];
  constructor(private readonly parallel = 3, private readonly maxWaiting = 30, private readonly waitMs = 10_000) {}
  async acquire(): Promise<void> {
    if (this.active < this.parallel) { this.active++; return; }
    if (this.waiters.length >= this.maxWaiting) throw new Error('Email service is busy. Please try again shortly.');
    await new Promise<void>((resolve, reject) => {
      const grant = () => { clearTimeout(timer); resolve(); };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter(waiter => waiter !== grant);
        reject(new Error('Email service is busy. Please try again shortly.'));
      }, this.waitMs);
      this.waiters.push(grant);
    });
  }
  release(): void {
    const next = this.waiters.shift();
    if (next) next();
    else this.active = Math.max(0, this.active - 1);
  }
}