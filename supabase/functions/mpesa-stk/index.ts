import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// Atomic-ish balance helpers (read-modify-write; sufficient for low-concurrency)
async function creditBalance(supabase: any, account: string, amount: number) {
  const { data: existing } = await supabase
    .from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  if (!existing) {
    await supabase.from('user_balances').insert({
      deriv_account: account, balance: amount, total_deposited: amount,
    });
  } else {
    await supabase.from('user_balances').update({
      balance: Number(existing.balance) + amount,
      total_deposited: Number(existing.total_deposited) + amount,
    }).eq('deriv_account', account);
  }
}

async function debitBalance(supabase: any, account: string, amount: number): Promise<boolean> {
  const { data: existing } = await supabase
    .from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  const current = Number(existing?.balance || 0);
  if (current < amount) return false;
  await supabase.from('user_balances').update({
    balance: current - amount,
    total_withdrawn: Number(existing?.total_withdrawn || 0) + amount,
  }).eq('deriv_account', account);
  return true;
}

async function refundBalance(supabase: any, account: string, amount: number) {
  const { data: existing } = await supabase
    .from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  if (!existing) return;
  await supabase.from('user_balances').update({
    balance: Number(existing.balance) + amount,
    total_withdrawn: Math.max(0, Number(existing.total_withdrawn) - amount),
  }).eq('deriv_account', account);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'stk_push';

    const { data: config } = await supabase.from('mpesa_config').select('*').limit(1).single();
    const { data: settings } = await supabase.from('admin_settings').select('*').limit(1).single();
    const minDeposit = Number((settings as any)?.min_deposit ?? 10);
    const minWithdrawal = Number((settings as any)?.min_withdrawal ?? 50);

    // M-Pesa related actions need config
    const needsMpesa = ['stk_push', 'callback', 'query'].includes(action);
    if (needsMpesa && (!config || !config.consumer_key || !config.shortcode)) {
      return json({ error: 'M-Pesa not configured' }, 400);
    }

    let accessToken = '';
    let baseUrl = '';
    if (needsMpesa) {
      baseUrl = config.environment === 'production'
        ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
      const authString = btoa(`${config.consumer_key}:${config.consumer_secret}`);
      const tokenResp = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${authString}` },
      });
      const tokenData = await tokenResp.json();
      accessToken = tokenData.access_token;
      if (!accessToken) return json({ error: 'Failed to get M-Pesa access token' }, 500);
    }

    // ─── STK PUSH ───
    if (action === 'stk_push') {
      const body = await req.json();
      const { phone_number, amount, bot_id, deriv_account, action_type } = body;
      const isDeposit = action_type === 'deposit';

      if (!phone_number || !amount || !deriv_account)
        return json({ error: 'phone_number, amount and deriv_account required' }, 400);
      if (isDeposit && Number(amount) < minDeposit)
        return json({ error: `Minimum deposit is KES ${minDeposit}` }, 400);
      if (!isDeposit && Number(amount) < 1)
        return json({ error: 'Minimum amount is KES 1' }, 400);

      let formattedPhone = phone_number.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
      const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);
      const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-stk?action=callback`;

      const stkPayload = {
        BusinessShortCode: config.shortcode, Password: password, Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline', Amount: Math.round(Number(amount)),
        PartyA: formattedPhone, PartyB: config.shortcode, PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: isDeposit ? `DEP-${deriv_account}` : 'HFTPro',
        TransactionDesc: isDeposit ? `Deposit - ${deriv_account}` : `Bot purchase - ${bot_id || 'premium'}`,
      };

      const stkResp = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(stkPayload),
      });
      const stkData = await stkResp.json();

      if (stkData.ResponseCode === '0') {
        if (isDeposit) {
          await supabase.from('deposits').insert({
            deriv_account, phone_number: formattedPhone, amount: Number(amount),
            mpesa_checkout_request_id: stkData.CheckoutRequestID, status: 'pending',
          });
        } else {
          await supabase.from('purchases').insert({
            deriv_account, bot_id: bot_id || null, phone_number: formattedPhone,
            amount: Number(amount), mpesa_checkout_request_id: stkData.CheckoutRequestID, status: 'pending',
          });
        }
        return json({ success: true, checkout_request_id: stkData.CheckoutRequestID, message: 'STK push sent. Check your phone.' });
      }
      return json({ error: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed' }, 400);
    }

    // ─── CALLBACK ───
    if (action === 'callback') {
      const body = await req.json();
      const result = body?.Body?.stkCallback;
      if (result) {
        const checkoutId = result.CheckoutRequestID;
        const resultCode = result.ResultCode;

        if (resultCode === 0) {
          const items = result.CallbackMetadata?.Item || [];
          const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || '';

          await supabase.from('purchases')
            .update({ status: 'completed', mpesa_receipt: receipt })
            .eq('mpesa_checkout_request_id', checkoutId);

          // Credit balance if it's a deposit that hasn't been credited yet
          const { data: dep } = await supabase.from('deposits')
            .select('*').eq('mpesa_checkout_request_id', checkoutId).maybeSingle();
          if (dep && !dep.credited) {
            await creditBalance(supabase, dep.deriv_account, Number(dep.amount));
            await supabase.from('deposits')
              .update({ status: 'credited', mpesa_receipt: receipt, credited: true })
              .eq('mpesa_checkout_request_id', checkoutId);
          }
        } else {
          await supabase.from('purchases').update({ status: 'cancelled' })
            .eq('mpesa_checkout_request_id', checkoutId);
          await supabase.from('deposits').update({ status: 'cancelled' })
            .eq('mpesa_checkout_request_id', checkoutId);
        }
      }
      return json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // ─── QUERY STK STATUS (also credits if confirmed via polling) ───
    if (action === 'query') {
      const body = await req.json();
      const { checkout_request_id } = body;
      if (!checkout_request_id) return json({ error: 'checkout_request_id required' }, 400);

      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
      const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);

      const queryResp = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode, Password: password, Timestamp: timestamp,
          CheckoutRequestID: checkout_request_id,
        }),
      });
      const queryData = await queryResp.json();

      // If Safaricom says success and we have a pending deposit not credited → credit it now
      if (queryData.ResultCode === '0' || queryData.ResultCode === 0) {
        const { data: dep } = await supabase.from('deposits')
          .select('*').eq('mpesa_checkout_request_id', checkout_request_id).maybeSingle();
        if (dep && !dep.credited) {
          await creditBalance(supabase, dep.deriv_account, Number(dep.amount));
          await supabase.from('deposits')
            .update({ status: 'credited', credited: true })
            .eq('mpesa_checkout_request_id', checkout_request_id);
        }
        await supabase.from('purchases')
          .update({ status: 'completed' })
          .eq('mpesa_checkout_request_id', checkout_request_id);
      } else if (queryData.ResultCode === '1032' || queryData.ResultCode === 1032) {
        await supabase.from('deposits').update({ status: 'cancelled' })
          .eq('mpesa_checkout_request_id', checkout_request_id);
        await supabase.from('purchases').update({ status: 'cancelled' })
          .eq('mpesa_checkout_request_id', checkout_request_id);
      }

      const { data: deposit } = await supabase.from('deposits')
        .select('status, mpesa_receipt').eq('mpesa_checkout_request_id', checkout_request_id).maybeSingle();
      const { data: purchase } = await supabase.from('purchases')
        .select('status, mpesa_receipt').eq('mpesa_checkout_request_id', checkout_request_id).maybeSingle();
      const record = deposit || purchase;

      return json({
        result_code: queryData.ResultCode, result_desc: queryData.ResultDesc,
        db_status: record?.status || 'unknown', receipt: record?.mpesa_receipt || null,
      });
    }

    // ─── WITHDRAW (debits balance immediately; waits for admin approval) ───
    if (action === 'withdraw') {
      const body = await req.json();
      const { phone_number, amount, deriv_account } = body;

      if (!phone_number || !amount || !deriv_account)
        return json({ error: 'phone_number, amount, deriv_account required' }, 400);
      if (Number(amount) < minWithdrawal)
        return json({ error: `Minimum withdrawal is KES ${minWithdrawal}` }, 400);
      if (!(settings as any)?.withdrawal_enabled)
        return json({ error: 'Withdrawals are currently disabled' }, 403);

      // Debit internal balance (reserve funds)
      const ok = await debitBalance(supabase, deriv_account, Number(amount));
      if (!ok) return json({ error: 'Insufficient balance' }, 400);

      let formattedPhone = phone_number.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const { data: withdrawal, error: insertErr } = await supabase.from('withdrawals').insert({
        deriv_account, phone_number: formattedPhone, amount: Number(amount), status: 'pending',
      }).select().single();

      if (insertErr) {
        // refund
        await refundBalance(supabase, deriv_account, Number(amount));
        return json({ error: 'Failed to create withdrawal record' }, 500);
      }

      return json({ success: true, withdrawal_id: withdrawal.id, message: 'Withdrawal pending admin approval' });
    }

    // ─── PROCESS WITHDRAWAL (admin approve / reject, or auto) ───
    if (action === 'process_withdrawal') {
      const body = await req.json();
      const { withdrawal_id, approve } = body;
      if (!withdrawal_id) return json({ error: 'withdrawal_id required' }, 400);

      const { data: w } = await supabase.from('withdrawals')
        .select('*').eq('id', withdrawal_id).single();
      if (!w) return json({ error: 'Withdrawal not found' }, 404);
      if (w.status !== 'pending')
        return json({ error: `Cannot process — already ${w.status}` }, 400);

      if (!approve) {
        await refundBalance(supabase, w.deriv_account, Number(w.amount));
        await supabase.from('withdrawals').update({ status: 'cancelled' }).eq('id', withdrawal_id);
        return json({ success: true, message: 'Withdrawal cancelled & balance refunded' });
      }

      // ── Try real Daraja B2C if enabled & configured ──
      if (config?.b2c_enabled && config?.initiator_name && config?.security_credential && config?.b2c_shortcode) {
        try {
          const b2cBase = config.environment === 'production'
            ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
          const authStr = btoa(`${config.consumer_key}:${config.consumer_secret}`);
          const tokResp = await fetch(`${b2cBase}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${authStr}` },
          });
          const tokJson = await tokResp.json();
          if (!tokJson.access_token) throw new Error('B2C token failed');

          const payload = {
            InitiatorName: config.initiator_name,
            SecurityCredential: config.security_credential,
            CommandID: 'BusinessPayment',
            Amount: Math.floor(Number(w.amount)),
            PartyA: config.b2c_shortcode,
            PartyB: w.phone_number,
            Remarks: 'Withdrawal payout',
            QueueTimeOutURL: config.queue_timeout_url || 'https://example.com/timeout',
            ResultURL: config.result_url || 'https://example.com/result',
            Occasion: 'Withdrawal',
          };
          const b2cResp = await fetch(`${b2cBase}/mpesa/b2c/v3/paymentrequest`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokJson.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const b2cData = await b2cResp.json();
          if (b2cData.ResponseCode === '0' || b2cData.ConversationID) {
            await supabase.from('withdrawals').update({
              status: 'completed',
              mpesa_transaction_id: b2cData.ConversationID || b2cData.OriginatorConversationID || null,
            }).eq('id', withdrawal_id);
            return json({ success: true, message: 'B2C payout dispatched', b2c: b2cData });
          }
          // B2C failed — mark approved (manual fallback) but log error
          await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawal_id);
          return json({ success: false, error: b2cData.errorMessage || 'B2C dispatch failed', b2c: b2cData }, 502);
        } catch (e) {
          await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawal_id);
          return json({ success: false, error: 'B2C error: ' + (e as Error).message }, 502);
        }
      }

      // Fallback: mark completed (admin pays manually)
      await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal_id);
      return json({ success: true, message: 'Withdrawal approved & marked completed' });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
