// Internal peer-to-peer funds transfer between platform accounts.
// Actions: lookup (resolve recipient), send (validated transfer + receipt), history.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
// Expected/user-facing problems return HTTP 200 with an `error` field so the
// client shows a readable message instead of "non-2xx status code".
const fail = (error: string, code = 'ERROR') => json({ error, code });

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function sessionEmail(refresh_token: unknown, emailHint?: unknown): Promise<string | null> {
  if (typeof refresh_token === 'string' && refresh_token) {
    const { data } = await sb.from('auth_sessions')
      .select('email, revoked, expires_at').eq('refresh_token', refresh_token).maybeSingle();
    if (data && !data.revoked && new Date(data.expires_at) >= new Date()) return data.email;
  }
  const hint = String(emailHint || '').toLowerCase().trim();
  if (!hint) return null;
  const { data: live } = await sb.from('auth_sessions')
    .select('email').eq('email', hint).eq('revoked', false)
    .gt('expires_at', new Date().toISOString()).limit(1).maybeSingle();
  return live?.email || null;
}

async function findRecipient(raw: string) {
  const v = String(raw || '').trim();
  if (!v) return null;
  const asAccount = v.toUpperCase().replace(/\s/g, '');
  const { data: byAcct } = await sb.from('app_users')
    .select('email, name, account_number').eq('account_number', asAccount).maybeSingle();
  if (byAcct) return byAcct;
  const { data: byMail } = await sb.from('app_users')
    .select('email, name, account_number').eq('email', v.toLowerCase()).maybeSingle();
  return byMail || null;
}

const maskName = (n: string, email: string) => {
  const base = (n || email.split('@')[0] || '').trim();
  if (base.length <= 2) return base;
  return `${base.slice(0, 2)}${'*'.repeat(Math.max(2, base.length - 3))}${base.slice(-1)}`;
};

async function balanceOf(account: string) {
  const { data } = await sb.from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  return { row: data, balance: Number(data?.balance || 0) };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const body = await req.json().catch(() => ({}));
    const action = url.searchParams.get('action') || body?.action || 'history';

    const me = await sessionEmail(body?.refresh_token, body?.email);
    if (!me) return fail('Your session has expired. Please sign in again to continue.', 'UNAUTHORIZED');

    const { data: settings } = await sb.from('admin_settings').select('*').limit(1).maybeSingle();
    const enabled = settings?.transfer_enabled !== false;
    const minAmount = Number(settings?.transfer_min ?? 100);
    const feePercent = Number(settings?.transfer_fee_percent ?? 0);

    if (action === 'config') {
      const { data: mine } = await sb.from('app_users').select('account_number, name').eq('email', me).maybeSingle();
      const { balance } = await balanceOf(me);
      return json({
        success: true, enabled, min: minAmount, fee_percent: feePercent,
        account_number: mine?.account_number || '', balance,
      });
    }

    if (action === 'lookup') {
      const r = await findRecipient(body?.recipient);
      if (!r) return json({ found: false });
      if (r.email === me) return json({ found: false, self: true });
      return json({ found: true, account_number: r.account_number, name: maskName(r.name, r.email) });
    }

    if (action === 'history') {
      const { data } = await sb.from('transfers').select('*')
        .or(`from_email.eq.${me},to_email.eq.${me}`)
        .order('created_at', { ascending: false }).limit(100);
      return json({
        success: true,
        transfers: (data || []).map((t: any) => ({
          id: t.id,
          direction: t.from_email === me ? 'out' : 'in',
          counterparty: t.from_email === me ? t.to_account_number : t.from_account_number,
          amount: Number(t.amount), fee: Number(t.fee), note: t.note,
          status: t.status, created_at: t.created_at,
        })),
      });
    }

    if (action === 'send') {
      if (!enabled) return fail('Transfers are currently switched off. Please try again later.', 'DISABLED');

      const amount = Math.round(Number(body?.amount) * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) return fail('Please enter a valid amount to send.', 'BAD_AMOUNT');
      if (amount < minAmount) return fail(`The smallest amount you can send is KES ${minAmount}.`, 'MIN_AMOUNT');

      const recipient = await findRecipient(body?.recipient);
      if (!recipient) return fail('We could not find that account number. Please double-check it.', 'NO_RECIPIENT');
      if (recipient.email === me) return fail('You cannot send funds to your own account.', 'SELF');

      const fee = Math.round(amount * feePercent) / 100;
      const total = Math.round((amount + fee) * 100) / 100;

      const { row: myRow, balance: myBal } = await balanceOf(me);
      if (myBal < total) {
        return fail(`Not enough balance. You need KES ${total.toFixed(2)} (including a KES ${fee.toFixed(2)} fee) but have KES ${myBal.toFixed(2)}.`, 'INSUFFICIENT');
      }

      const { data: mine } = await sb.from('app_users').select('account_number').eq('email', me).maybeSingle();

      // Debit sender first; refund if anything downstream fails.
      if (myRow) {
        await sb.from('user_balances').update({ balance: +(myBal - total).toFixed(2) }).eq('deriv_account', me);
      } else {
        return fail('Your wallet is empty. Please deposit before sending funds.', 'INSUFFICIENT');
      }

      const { row: toRow, balance: toBal } = await balanceOf(recipient.email);
      if (toRow) {
        await sb.from('user_balances').update({ balance: +(toBal + amount).toFixed(2) }).eq('deriv_account', recipient.email);
      } else {
        await sb.from('user_balances').insert({ deriv_account: recipient.email, balance: amount });
      }

      const { data: rec, error } = await sb.from('transfers').insert({
        from_email: me, to_email: recipient.email,
        from_account_number: mine?.account_number || '', to_account_number: recipient.account_number || '',
        amount, fee, note: String(body?.note || '').slice(0, 200), status: 'completed',
      }).select().single();

      if (error) {
        // Roll everything back so no money is lost.
        await sb.from('user_balances').update({ balance: +myBal.toFixed(2) }).eq('deriv_account', me);
        await sb.from('user_balances').update({ balance: +toBal.toFixed(2) }).eq('deriv_account', recipient.email);
        return fail('The transfer could not be completed. Nothing was deducted — please try again.', 'FAILED');
      }

      return json({
        success: true,
        receipt: {
          id: rec.id,
          reference: `TRF-${String(rec.id).slice(0, 8).toUpperCase()}`,
          to_account_number: recipient.account_number,
          to_name: maskName(recipient.name, recipient.email),
          amount, fee, total, note: rec.note,
          created_at: rec.created_at,
          new_balance: +(myBal - total).toFixed(2),
        },
      });
    }

    return fail('That action is not supported.', 'BAD_ACTION');
  } catch (e) {
    console.error('transfers error', e);
    return json({ error: 'Something went wrong on our side. Please try again.', detail: String((e as Error).message) });
  }
});
