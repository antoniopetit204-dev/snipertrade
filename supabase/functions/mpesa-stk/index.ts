import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'stk_push';

    // Get M-Pesa config from DB
    const { data: config } = await supabase.from('mpesa_config').select('*').limit(1).single();
    if (!config || !config.consumer_key || !config.shortcode) {
      return new Response(JSON.stringify({ error: 'M-Pesa not configured' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Failed to get M-Pesa access token' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'stk_push') {
      const body = await req.json();
      const { phone_number, amount, bot_id, deriv_account, action_type } = body;
      const isDeposit = action_type === 'deposit';

      if (!phone_number || !amount) {
        return new Response(JSON.stringify({ error: 'phone_number and amount required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Format phone number (ensure 254 prefix)
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
        AccountReference: isDeposit ? 'HFTDeposit' : 'HFTPro',
        TransactionDesc: isDeposit ? `Deposit - ${deriv_account}` : `Bot purchase - ${bot_id || 'premium'}`,
      };

      const stkResp = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stkPayload),
      });

      const stkData = await stkResp.json();

      if (stkData.ResponseCode === '0') {
        // Save to appropriate table
        if (isDeposit) {
          await supabase.from('deposits').insert({
            deriv_account: deriv_account || 'unknown',
            phone_number: formattedPhone,
            amount: Number(amount),
            mpesa_checkout_request_id: stkData.CheckoutRequestID,
            status: 'pending',
          });
        } else {
          await supabase.from('purchases').insert({
            deriv_account: deriv_account || 'unknown',
            bot_id: bot_id || null,
            phone_number: formattedPhone,
            amount: Number(amount),
            mpesa_checkout_request_id: stkData.CheckoutRequestID,
            status: 'pending',
          });
        }

        return new Response(JSON.stringify({
          success: true,
          checkout_request_id: stkData.CheckoutRequestID,
          message: 'STK push sent. Check your phone.',
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } else {
        return new Response(JSON.stringify({
          error: stkData.errorMessage || stkData.ResponseDescription || 'STK push failed',
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

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

          // Update deposits
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
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'query') {
      const body = await req.json();
      const { checkout_request_id } = body;

      if (!checkout_request_id) {
        return new Response(JSON.stringify({ error: 'checkout_request_id required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14);
      const password = btoa(`${config.shortcode}${config.passkey}${timestamp}`);

      const queryResp = await fetch(`${baseUrl}/mpesa/stkpushquery/v1/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: config.shortcode,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkout_request_id,
        }),
      });

      const queryData = await queryResp.json();

      // Check both tables
      const { data: purchase } = await supabase.from('purchases')
        .select('status, mpesa_receipt')
        .eq('mpesa_checkout_request_id', checkout_request_id)
        .single();

      const { data: deposit } = await supabase.from('deposits')
        .select('status, mpesa_receipt')
        .eq('mpesa_checkout_request_id', checkout_request_id)
        .single();

      const record = deposit || purchase;

      return new Response(JSON.stringify({
        result_code: queryData.ResultCode,
        result_desc: queryData.ResultDesc,
        db_status: record?.status || 'unknown',
        receipt: record?.mpesa_receipt || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
