// Internal balance + manual trade helpers
import { supabase } from './supabase';

export interface UserBalance {
  deriv_account: string;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
}

export const fetchUserBalance = async (account: string): Promise<UserBalance> => {
  const { data } = await (supabase as any)
    .from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  return {
    deriv_account: account,
    balance: Number(data?.balance || 0),
    total_deposited: Number(data?.total_deposited || 0),
    total_withdrawn: Number(data?.total_withdrawn || 0),
  };
};

export const updateUserBalance = async (account: string, newBalance: number) => {
  const { data: existing } = await (supabase as any)
    .from('user_balances').select('id').eq('deriv_account', account).maybeSingle();
  if (existing) {
    return (supabase as any).from('user_balances').update({ balance: newBalance }).eq('deriv_account', account);
  }
  return (supabase as any).from('user_balances').insert({ deriv_account: account, balance: newBalance });
};

export interface ManualTrade {
  id?: string;
  deriv_account: string;
  bot_id: string | null;
  bot_name: string;
  stake: number;
  payout: number;
  profit: number;
  result: 'win' | 'loss';
  balance_after: number;
  run_id: string;
  created_at?: string;
}

export const insertManualTrade = async (t: Omit<ManualTrade, 'id' | 'created_at'>) => {
  return (supabase as any).from('manual_trades').insert(t);
};

export const fetchManualTrades = async (account: string, limit = 100): Promise<ManualTrade[]> => {
  const { data } = await (supabase as any)
    .from('manual_trades').select('*')
    .eq('deriv_account', account)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data || []) as ManualTrade[];
};
