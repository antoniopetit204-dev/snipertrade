// Internal account-to-account transfers.
import { invokeFn } from './fn';
import { getRefreshToken } from './auth-email';
import { getUser } from './store';

const call = async <T = any>(action: string, extra: Record<string, unknown> = {}) => {
  const attempt = () => invokeFn<T>(`transfers?action=${action}`, {
    refresh_token: getRefreshToken(), email: getUser()?.email || '', ...extra,
  });
  try {
    return await attempt();
  } catch (e) {
    if (!/session has expired|unauthor/i.test(String((e as Error).message))) throw e;
    const { refreshSession } = await import('./auth-email');
    await refreshSession().catch(() => null);
    return attempt();
  }
};

export interface TransferConfig {
  enabled: boolean; min: number; fee_percent: number; account_number: string; balance: number;
}
export interface TransferReceipt {
  id: string; reference: string; to_account_number: string; to_name: string;
  amount: number; fee: number; total: number; note: string; created_at: string; new_balance: number;
}
export interface TransferRow {
  id: string; direction: 'in' | 'out'; counterparty: string;
  amount: number; fee: number; note: string; status: string; created_at: string;
}

export const fetchTransferConfig = () => call<TransferConfig>('config');
export const lookupRecipient = (recipient: string) =>
  call<{ found: boolean; self?: boolean; account_number?: string; name?: string }>('lookup', { recipient });
export const sendTransfer = (recipient: string, amount: number, note = '') =>
  call<{ success: boolean; receipt: TransferReceipt }>('send', { recipient, amount, note });
export const fetchTransferHistory = () =>
  call<{ transfers: TransferRow[] }>('history').then(d => d.transfers || []);
