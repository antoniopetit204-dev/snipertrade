import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'stk_push';

    // Get M-Pesa config from DB
    const { data: config } = await supabase.from('mpesa_config').select('*').limit(1).single();
    if (!config || !config.consumer_key || !config.shortcode) {
      return json({ error: 'M-Pesa not configured' }, 400);
    }

    const baseUrl = config.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    // Get OAuth token
    const authString = btoa(`${config.consumer_key}:${config.consumer_secret}`);
    const tokenResp = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${authString}` },
    });
    const tokenData = await tokenResp.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return json({ error: 'Failed to get M-Pesa access token' }, 500);

    // ─── STK PUSH (Deposit / Bot Purchase) ───
    if (action === 'stk_push') {
      const body = await req.json();
      const { phone_number, amount, bot_id, deriv_account, action_type } = body;
      const isDeposit = action_type === 'deposit';

      if (!phone_number || !amount || !deriv_account) {
        return json({ error: 'phone_number, amount and deriv_account required' }, 400);
      }
      if (Number(amount) < 1) return json({ error: 'Minimum amount is KES 1' }, 400);

      let formattedPhone = phone_number.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
      const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);
      const callbackUrl = `${supabaseUrl}/functions/v1/mpesa-stk?action=callback`;

      const stkPayload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(Number(amount)),
        PartyA: formattedPhone,
        PartyB: config.shortcode,
        PhoneNumber: formattedPhone,
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

    // ─── CALLBACK (Safaricom webhook) ───
    if (action === 'callback') {
      const body = await req.json();
      const result = body?.Body?.stkCallback;
      if (result) {
        const checkoutId = result.CheckoutRequestID;
        const resultCode = result.ResultCode;

        if (resultCode === 0) {
          const items = result.CallbackMetadata?.Item || [];
          const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value || '';

          // Update purchases
          await supabase.from('purchases')
            .update({ status: 'completed', mpesa_receipt: receipt })
            .eq('mpesa_checkout_request_id', checkoutId);

          // Update deposits and mark credited
          await supabase.from('deposits')
            .update({ status: 'completed', mpesa_receipt: receipt, credited: true })
            .eq('mpesa_checkout_request_id', checkoutId);
        } else {
          await supabase.from('purchases')
            .update({ status: 'cancelled' })
            .eq('mpesa_checkout_request_id', checkoutId);
          await supabase.from('deposits')
            .update({ status: 'cancelled' })
            .eq('mpesa_checkout_request_id', checkoutId);
        }
      }
      return json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // ─── QUERY STK STATUS ───
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

      const { data: deposit } = await supabase.from('deposits')
        .select('status, mpesa_receipt').eq('mpesa_checkout_request_id', checkout_request_id).single();
      const { data: purchase } = await supabase.from('purchases')
        .select('status, mpesa_receipt').eq('mpesa_checkout_request_id', checkout_request_id).single();
      const record = deposit || purchase;

      return json({
        result_code: queryData.ResultCode, result_desc: queryData.ResultDesc,
        db_status: record?.status || 'unknown', receipt: record?.mpesa_receipt || null,
      });
    }

    // ─── WITHDRAW (Admin-initiated B2C payout) ───
    if (action === 'withdraw') {
      const body = await req.json();
      const { phone_number, amount, deriv_account } = body;

      if (!phone_number || !amount || !deriv_account) return json({ error: 'phone_number, amount, deriv_account required' }, 400);
      if (Number(amount) < 10) return json({ error: 'Minimum withdrawal is KES 10' }, 400);

      // Check withdrawal enabled
      const { data: settings } = await supabase.from('admin_settings').select('withdrawal_enabled').limit(1).single();
      if (!settings?.withdrawal_enabled) return json({ error: 'Withdrawals are currently disabled' }, 403);

      let formattedPhone = phone_number.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      // Create withdrawal record
      const { data: withdrawal, error: insertErr } = await supabase.from('withdrawals').insert({
        deriv_account, phone_number: formattedPhone, amount: Number(amount), status: 'pending',
      }).select().single();

      if (insertErr) return json({ error: 'Failed to create withdrawal record' }, 500);

      // Note: B2C requires separate Safaricom credentials (Initiator, Security Credential)
      // For now, withdrawals are created as pending for admin approval + manual processing
      // or automatic B2C if configured. This is a common pattern in dcash-style systems.

      return json({ success: true, withdrawal_id: withdrawal.id, message: 'Withdrawal request submitted for processing' });
    }

    // ─── PROCESS WITHDRAWAL (Admin approve & send B2C) ───
    if (action === 'process_withdrawal') {
      const body = await req.json();
      const { withdrawal_id, approve } = body;

      if (!withdrawal_id) return json({ error: 'withdrawal_id required' }, 400);

      if (!approve) {
        await supabase.from('withdrawals').update({ status: 'cancelled' }).eq('id', withdrawal_id);
        return json({ success: true, message: 'Withdrawal cancelled' });
      }

      // Mark as approved/processing
      await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawal_id);

      // In production with B2C credentials, you'd call:
      // POST ${baseUrl}/mpesa/b2c/v3/paymentrequest
      // For now we mark as completed (admin manually sends via Safaricom portal)
      await supabase.from('withdrawals').update({ status: 'completed' }).eq('id', withdrawal_id);

      return json({ success: true, message: 'Withdrawal processed' });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
