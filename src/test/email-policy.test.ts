import { describe, expect, it, vi } from 'vitest';
import { accountEmailHtml, isHardBounce, isMailbox, MailSendLimiter, safeMailSubject } from '../../supabase/functions/_shared/email-policy';

describe('outbound email safeguards', () => {
  it('keeps identity addresses and verification links unchanged while enforcing account-only email copy', () => {
    const link = 'https://hifrequencytrade.lovable.app/auth?verify=trade-123';
    const result = accountEmailHtml(`<p>High Frequency Trading: start trading right away. Trading balance.</p><a href="${link}">${link}</a>`);
    expect(result).toContain('HFT: access your account. account balance.');
    expect(result).toContain(`href="${link}"`);
    expect(result).toContain(`>${link}</a>`);
    expect(safeMailSubject('Trade won: profit!!!\r\nBcc: victim@example.com')).toBe('activity won: positive balance change! Bcc: victim@example.com');
  });
  it('rejects multiple recipients and email header injection', () => {
    expect(isMailbox('member@example.com')).toBe(true);
    expect(isMailbox('member@example.com\r\nBcc: other@example.com')).toBe(false);
    expect(isMailbox('member@example.com,other@example.com')).toBe(false);
  });
  it('distinguishes nonexistent mailboxes from temporary or policy rejections', () => {
    expect(isHardBounce('550 5.1.1 User unknown')).toBe(true);
    expect(isHardBounce('550 5.7.1 Spam rejected')).toBe(false);
    expect(isHardBounce('451 temporarily unavailable')).toBe(false);
  });
  it('limits active sends and rejects queue overflow', async () => {
    const limiter = new MailSendLimiter(1, 1, 1000);
    await limiter.acquire();
    let acquired = false;
    const waiting = limiter.acquire().then(() => { acquired = true; });
    await expect(limiter.acquire()).rejects.toThrow('busy');
    expect(acquired).toBe(false);
    limiter.release();
    await waiting;
    expect(acquired).toBe(true);
    limiter.release();
  });
  it('expires waiting sends rather than allowing an unbounded wait', async () => {
    vi.useFakeTimers();
    try {
      const limiter = new MailSendLimiter(1, 1, 100);
      await limiter.acquire();
      const rejected = expect(limiter.acquire()).rejects.toThrow('busy');
      await vi.advanceTimersByTimeAsync(101);
      await rejected;
      limiter.release();
      await limiter.acquire();
      limiter.release();
    } finally { vi.useRealTimers(); }
  });
});