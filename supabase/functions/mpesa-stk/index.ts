import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "https://esm.sh/node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

// ── Safaricom public certificates (used to RSA-encrypt initiator passwords) ──
const SANDBOX_CERT = `-----BEGIN CERTIFICATE-----
MIIGgDCCBWigAwIBAgIKMvrulAAAAARG5DANBgkqhkiG9w0BAQsFADBbMRMwEQYK
CZImiZPyLGQBGRYDbmV0MRkwFwYKCZImiZPyLGQBGRYJc2FmYXJpY29tMSkwJwYD
VQQDEyBTYWZhcmljb20gSW50ZXJuYWwgSXNzdWluZyBDQSAwMjAeFw0xNzA0MjUx
NjA3MjRaFw0xODAzMzAwNzAwMjNaMIGNMQswCQYDVQQGEwJLRTEQMA4GA1UECBMH
TmFpcm9iaTEQMA4GA1UEBxMHTmFpcm9iaTEaMBgGA1UEChMRU2FmYXJpY29tIExp
bWl0ZWQxEzARBgNVBAsTClRlY2hub2xvZ3kxKTAnBgNVBAMTIGFwaWdlZS5hcGlj
YWxsZXIuc2FmYXJpY29tLmNvLmtlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAoknIb5Tm1hxOVdFsOejAs6veAai32Zv442BLuOGkFKUeCUM2s0K8XEsU
t6BP25rQGNlTCTEqfdtRrym6bt5k0fTDscf0yMCoYzaxTh1mejg8rPO6bD8MJB0c
FWRUeLEyWjMeEPsYVSJFv7T58IdAn7/RhkrpBl1cT/Lpu8t+eRgZxXAv1ngfPmCV
tCJ1u1lxLN0WkdQQ9toF286KGzGAIyP5IUjW0CmtMNuRcwYHEml9V2bDhCqIxsko
quHcGfeqe8YeGuS9NbWAVE0QlqdM1eL4Z/f8YJBNFXIXjbiXusezgFmFOdSrFGOf
ZBgvVfaRyhmIs8bYNU9eEgMwBlG6YwIDAQABo4IDLTCCAykwHQYDVR0OBBYEFG2w
ycrgEBPFzPUZVjh8KoJ3EpuyMB8GA1UdIwQYMBaAFOsy1E9+YJo6mCBjug1evuh5
TtUkMIIBSwYDVR0fBIIBQjCCAT4wggE6oIIBNqCCATKGgdZsZGFwOi8vL0NOPVNh
ZmFyaWNvbSUyMEludGVybmFsJTIwSXNzdWluZyUyMENBJTIwMDIsQ049U1ZEVDNJ
U1NDQTAxLENOPUNEUCxDTj1QdWJsaWMlMjBLZXklMjBTZXJ2aWNlcyxDTj1TZXJ2
aWNlcyxDTj1Db25maWd1cmF0aW9uLERDPXNhZmFyaWNvbSxEQz1uZXQ/Y2VydGlm
aWNhdGVSZXZvY2F0aW9uTGlzdD9iYXNlP29iamVjdENsYXNzPWNSTERpc3RyaWJ1
dGlvblBvaW50hldodHRwOi8vY3JsLnNhZmFyaWNvbS5jby5rZS9TYWZhcmljb20l
MjBJbnRlcm5hbCUyMElzc3VpbmclMjBDQSUyMDAyKDEpLmNybDCCAQkGCCsGAQUF
BwEBBIH8MIH5MIHJBggrBgEFBQcwAoaBvGxkYXA6Ly8vQ049U2FmYXJpY29tJTIw
SW50ZXJuYWwlMjBJc3N1aW5nJTIwQ0ElMjAwMixDTj1BSUEsQ049UHVibGljJTIw
S2V5JTIwU2VydmljZXMsQ049U2VydmljZXMsQ049Q29uZmlndXJhdGlvbixEQz1z
YWZhcmljb20sREM9bmV0P2NBQ2VydGlmaWNhdGU/YmFzZT9vYmplY3RDbGFzcz1j
ZXJ0aWZpY2F0aW9uQXV0aG9yaXR5MCsGCCsGAQUFBzABhh9odHRwOi8vY3JsLnNh
ZmFyaWNvbS5jby5rZS9vY3NwMAsGA1UdDwQEAwIFoDA9BgkrBgEEAYI3FQcEMDAu
BiYrBgEEAYI3FQiHz4xWhMLEA4XphTaE3tENhqCICGeG9JgcgT/zAgFkAgEKMBMG
A1UdJQQMMAoGCCsGAQUFBwMBMBsGCSsGAQQBgjcVCgQOMAwwCgYIKwYBBQUHAwEw
DQYJKoZIhvcNAQELBQADggEBADQh3SrSldL3qLgEZ7uS7VStdLmizUbtPHbo7CYK
DDH+iCVdy6yzhfeJDmFmgUzL61OEM2vEnFTcaO9MlGv7BNJEuJaTJOGiH/khe6tx
T1WaXa9hT3+8/lOTNz4xPjr4HhMc5/yokYLnu5cWS+8h6kQjxn+rdgXjJTjp/HLO
HEukR0msZGZj+kKtY4QPLEGr2tgmGS+jpRTREv7yJpJSyM8ZS56i2tWcj5dDywuB
qb2L3IUYqZSjlVJzS0v2ZBlYg7sokj/D5jWqOTOiKsRsX1lZ2gxA1MGr3kFm5VEx
M6rT44PaLs9ymA4SX/Q88OYa5/dHmEs59SihrFulIN2NwI8=
-----END CERTIFICATE-----`;

const PROD_CERT = `-----BEGIN CERTIFICATE-----
MIIGkzCCBXugAwIBAgIKXfBp5gAAAAQAUjANBgkqhkiG9w0BAQsFADBbMRMwEQYK
CZImiZPyLGQBGRYDbmV0MRkwFwYKCZImiZPyLGQBGRYJc2FmYXJpY29tMSkwJwYD
VQQDEyBTYWZhcmljb20gSW50ZXJuYWwgSXNzdWluZyBDQSAwMjAeFw0yMTA1MTAx
MzE5MjVaFw0yMjA1MTAxMzE5MjVaMHsxCzAJBgNVBAYTAktFMRAwDgYDVQQIEwdO
YWlyb2JpMRAwDgYDVQQHEwdOYWlyb2JpMRYwFAYDVQQKEw1TYWZhcmljb20gUExD
MRMwEQYDVQQLEwpEaWdpdGFsIElUMRswGQYDVQQDExJhcGkuc2FmYXJpY29tLmNv
LmtlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk1ldOXrV04PJ7QQp
oVeOcg3jX/eK1eAYqV0YvtCfb0WgRfwUVqOFt3O3HzrFTLI8FzEnYa9wB3UVEFpZ
fjAhEbpFxFy7s4DyMaPNyhz/Yc7VPgYXVjQrI5dWoMl4OWxAxiL6FNJB+ofRWlIa
BBKKzVcm+1RNdcyx5y/EXmpsNm5VOBL/iCXIVmZAOK6lQjgEjFCDQ7XNPxYIYGdM
HQE0CdAo0YqyKjQXKZSdAEZxKqQJD2QUu5IxKVfd4LqYqfH8a9XV2vQbWxOFEjbT
mQpFtCq2EXBRsW3FQUlqGzWfWmiBnLOe4d8h+AhmybhPwR93JeJyJBJgUNVbBPyD
QwIDAQABo4IDJzCCAyMwHQYDVR0OBBYEFEUFXyKLkBQ/F7E0bdt4HxLslmkqMB8G
A1UdIwQYMBaAFOsy1E9+YJo6mCBjug1evuh5TtUkMIIBSwYDVR0fBIIBQjCCAT4w
ggE6oIIBNqCCATKGgdZsZGFwOi8vL0NOPVNhZmFyaWNvbSUyMEludGVybmFsJTIw
SXNzdWluZyUyMENBJTIwMDIsQ049U1ZEVDNJU1NDQTAxLENOPUNEUCxDTj1QdWJs
aWMlMjBLZXklMjBTZXJ2aWNlcyxDTj1TZXJ2aWNlcyxDTj1Db25maWd1cmF0aW9u
LERDPXNhZmFyaWNvbSxEQz1uZXQ/Y2VydGlmaWNhdGVSZXZvY2F0aW9uTGlzdD9i
YXNlP29iamVjdENsYXNzPWNSTERpc3RyaWJ1dGlvblBvaW50hldodHRwOi8vY3Js
LnNhZmFyaWNvbS5jby5rZS9TYWZhcmljb20lMjBJbnRlcm5hbCUyMElzc3Vpbmcl
MjBDQSUyMDAyKDEpLmNybDCCAQkGCCsGAQUFBwEBBIH8MIH5MIHJBggrBgEFBQcw
AoaBvGxkYXA6Ly8vQ049U2FmYXJpY29tJTIwSW50ZXJuYWwlMjBJc3N1aW5nJTIw
Q0ElMjAwMixDTj1BSUEsQ049UHVibGljJTIwS2V5JTIwU2VydmljZXMsQ049U2Vy
dmljZXMsQ049Q29uZmlndXJhdGlvbixEQz1zYWZhcmljb20sREM9bmV0P2NBQ2Vy
dGlmaWNhdGU/YmFzZT9vYmplY3RDbGFzcz1jZXJ0aWZpY2F0aW9uQXV0aG9yaXR5
MCsGCCsGAQUFBzABhh9odHRwOi8vY3JsLnNhZmFyaWNvbS5jby5rZS9vY3NwMAsG
A1UdDwQEAwIFoDA9BgkrBgEEAYI3FQcEMDAuBiYrBgEEAYI3FQiHz4xWhMLEA4Xp
hTaE3tENhqCICGeG9JgcgT/zAgFkAgEKMBMGA1UdJQQMMAoGCCsGAQUFBwMBMBsG
CSsGAQQBgjcVCgQOMAwwCgYIKwYBBQUHAwEwDQYJKoZIhvcNAQELBQADggEBABAE
fUaktKVUe3SrgXC3F2pK7lBxEcgxfp/jPkUbjmuJUjMyJOLhsRJZ6QrjzghpDpFi
3X0fSGM4tH3sEm5GFkxbZeBN9R5+s0e/dQXmpiZX2nb3qV1xv1OPYz9XU9N5p6tT
PqUmGgQp+J0JtKjjB7+0qkH9DwLfJrG2g3R1Dh4VZQwM6lJ2P1uV0lFq9bD3i8KZ
xMxnq+RaGcZJgM6XKLm1g9rxC3xQ8eu0L2c1c5+a8XO0w6/HnLZ7Z9DZqkFwQGgL
EnNRXh3wd8oP0xVL0X1fhYwSqRm+VqzHsxr4U2vXcF3HJB1Rj4LXVZ5NqMmHvK0c
Vzhxa9b8sk0gZQqXkw==
-----END CERTIFICATE-----`;

const generateSecurityCredential = (initiatorPassword: string, env: string): string => {
  const certPem = env === 'production' ? PROD_CERT : SANDBOX_CERT;
  const cert = forge.pki.certificateFromPem(certPem);
  const publicKey = cert.publicKey as forge.pki.rsa.PublicKey;
  const encrypted = publicKey.encrypt(initiatorPassword, 'RSAES-PKCS1-V1_5');
  return forge.util.encode64(encrypted);
};

// Atomic-ish balance helpers
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

    // ─── GENERATE SECURITY CREDENTIAL (no M-Pesa call) ───
    if (action === 'b2c_generate_credential') {
      const body = await req.json();
      const { initiator_password, environment } = body;
      if (!initiator_password) return json({ error: 'initiator_password required' }, 400);
      try {
        const credential = generateSecurityCredential(initiator_password, environment || 'sandbox');
        return json({ success: true, security_credential: credential });
      } catch (e) {
        return json({ error: 'Encryption failed: ' + (e as Error).message }, 500);
      }
    }

    // ─── B2C RESULT CALLBACK (from Safaricom) ───
    if (action === 'b2c_result') {
      const body = await req.json().catch(() => ({}));
      const result = body?.Result;
      if (result) {
        const convId = result.ConversationID || result.OriginatorConversationID;
        const code = Number(result.ResultCode);
        const desc = result.ResultDesc || '';
        const receiptItem = result.ResultParameters?.ResultParameter?.find(
          (p: any) => p.Key === 'TransactionReceipt'
        );
        const receipt = receiptItem?.Value || null;

        const { data: w } = await supabase.from('withdrawals')
          .select('*').eq('mpesa_transaction_id', convId).maybeSingle();
        if (w) {
          if (code === 0) {
            await supabase.from('withdrawals').update({
              status: 'completed', mpesa_receipt: receipt,
            }).eq('id', w.id);
          } else {
            // Failure → refund
            await refundBalance(supabase, w.deriv_account, Number(w.amount));
            await supabase.from('withdrawals').update({
              status: 'failed', mpesa_receipt: `FAIL: ${desc}`,
            }).eq('id', w.id);
          }
        }
      }
      return json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    // ─── B2C QUEUE TIMEOUT CALLBACK ───
    if (action === 'b2c_timeout') {
      const body = await req.json().catch(() => ({}));
      const convId = body?.ConversationID || body?.OriginatorConversationID;
      if (convId) {
        const { data: w } = await supabase.from('withdrawals')
          .select('*').eq('mpesa_transaction_id', convId).maybeSingle();
        if (w && w.status !== 'completed') {
          await refundBalance(supabase, w.deriv_account, Number(w.amount));
          await supabase.from('withdrawals').update({ status: 'failed' }).eq('id', w.id);
        }
      }
      return json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    const { data: config } = await supabase.from('mpesa_config').select('*').limit(1).single();
    const { data: settings } = await supabase.from('admin_settings').select('*').limit(1).single();
    const minDeposit = Number((settings as any)?.min_deposit ?? 10);
    const minWithdrawal = Number((settings as any)?.min_withdrawal ?? 50);

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

    // ─── WITHDRAW ───
    if (action === 'withdraw') {
      const body = await req.json();
      const { phone_number, amount, deriv_account } = body;

      if (!phone_number || !amount || !deriv_account)
        return json({ error: 'phone_number, amount, deriv_account required' }, 400);
      if (Number(amount) < minWithdrawal)
        return json({ error: `Minimum withdrawal is KES ${minWithdrawal}` }, 400);
      if (!(settings as any)?.withdrawal_enabled)
        return json({ error: 'Withdrawals are currently disabled' }, 403);

      const ok = await debitBalance(supabase, deriv_account, Number(amount));
      if (!ok) return json({ error: 'Insufficient balance' }, 400);

      let formattedPhone = phone_number.replace(/\s+/g, '').replace(/^0/, '254').replace(/^\+/, '');
      if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

      const { data: withdrawal, error: insertErr } = await supabase.from('withdrawals').insert({
        deriv_account, phone_number: formattedPhone, amount: Number(amount), status: 'pending',
      }).select().single();

      if (insertErr) {
        await refundBalance(supabase, deriv_account, Number(amount));
        return json({ error: 'Failed to create withdrawal record' }, 500);
      }

      return json({ success: true, withdrawal_id: withdrawal.id, message: 'Withdrawal submitted' });
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

      // Try real Daraja B2C if enabled & configured
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

          // Auto-build callback URLs pointing back to this edge function
          const resultUrl = config.result_url || `${supabaseUrl}/functions/v1/mpesa-stk?action=b2c_result`;
          const timeoutUrl = config.queue_timeout_url || `${supabaseUrl}/functions/v1/mpesa-stk?action=b2c_timeout`;

          const payload = {
            InitiatorName: config.initiator_name,
            SecurityCredential: config.security_credential,
            CommandID: 'BusinessPayment',
            Amount: Math.floor(Number(w.amount)),
            PartyA: config.b2c_shortcode,
            PartyB: w.phone_number,
            Remarks: 'Withdrawal payout',
            QueueTimeOutURL: timeoutUrl,
            ResultURL: resultUrl,
            Occasion: 'Withdrawal',
          };
          const b2cResp = await fetch(`${b2cBase}/mpesa/b2c/v3/paymentrequest`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${tokJson.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const b2cData = await b2cResp.json();
          if (b2cData.ResponseCode === '0' || b2cData.ConversationID) {
            // Mark as processing — callback will finalize to completed/failed
            await supabase.from('withdrawals').update({
              status: 'processing',
              mpesa_transaction_id: b2cData.ConversationID || b2cData.OriginatorConversationID || null,
            }).eq('id', withdrawal_id);
            return json({ success: true, message: 'B2C payout dispatched', b2c: b2cData });
          }
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
