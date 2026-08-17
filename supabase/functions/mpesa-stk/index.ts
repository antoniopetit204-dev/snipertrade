import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptSecurityCredential } from "./rsa.ts";
import { creditFirstDeposit } from "../_shared/affiliate.ts";

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

// Official Safaricom Daraja production certificate (ProductionCertificate.cer).
// Embedded so B2C credential generation never breaks; admins may still paste
// a newer cert in the Admin → M-Pesa "Safaricom Certificate" field to override.
const PRODUCTION_CERT = `-----BEGIN CERTIFICATE-----
MIIGkzCCBXugAwIBAgIKXfBp5gAAAD+hNjANBgkqhkiG9w0BAQsFADBbMRMwEQYK
CZImiZPyLGQBGRYDbmV0MRkwFwYKCZImiZPyLGQBGRYJc2FmYXJpY29tMSkwJwYD
VQQDEyBTYWZhcmljb20gSW50ZXJuYWwgSXNzdWluZyBDQSAwMjAeFw0xNzA0MjUx
NjA3MjRaFw0xODAzMjExMzIwMTNaMIGNMQswCQYDVQQGEwJLRTEQMA4GA1UECBMH
TmFpcm9iaTEQMA4GA1UEBxMHTmFpcm9iaTEaMBgGA1UEChMRU2FmYXJpY29tIExp
bWl0ZWQxEzARBgNVBAsTClRlY2hub2xvZ3kxKTAnBgNVBAMTIGFwaWdlZS5hcGlj
YWxsZXIuc2FmYXJpY29tLmNvLmtlMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEAoknIb5Tm1hxOVdFsOejAs6veAai32Zv442BLuOGkFKUeCUM2s0K8XEsU
t6BP25rQGNlTCTEqfdtRrym6bt5k0fTDscf0yMCoYzaxTh1mejg8rPO6bD8MJB0c
FWRUeLEyWjMeEPsYVSJFv7T58IdAn7/RhkrpBl1dT7SmIZfNVkIlD35+Cxgab+u7
+c7dHh6mWguEEoE3NbV7Xjl60zbD/Buvmu6i9EYz+27jNVPI6pRXHvp+ajIzTSsi
eD8Ztz1eoC9mphErasAGpMbR1sba9bM6hjw4tyTWnJDz7RdQQmnsW1NfFdYdK0qD
RKUX7SG6rQkBqVhndFve4SDFRq6wvQIDAQABo4IDJDCCAyAwHQYDVR0OBBYEFG2w
ycrgEBPFzPUZVjh8KoJ3EpuyMB8GA1UdIwQYMBaAFOsy1E9+YJo6mCBjug1evuh5
TtUkMIIBOwYDVR0fBIIBMjCCAS4wggEqoIIBJqCCASKGgdZsZGFwOi8vL0NOPVNh
ZmFyaWNvbSUyMEludGVybmFsJTIwSXNzdWluZyUyMENBJTIwMDIsQ049U1ZEVDNJ
U1NDQTAxLENOPUNEUCxDTj1QdWJsaWMlMjBLZXklMjBTZXJ2aWNlcyxDTj1TZXJ2
aWNlcyxDTj1Db25maWd1cmF0aW9uLERDPXNhZmFyaWNvbSxEQz1uZXQ/Y2VydGlm
aWNhdGVSZXZvY2F0aW9uTGlzdD9iYXNlP29iamVjdENsYXNzPWNSTERpc3RyaWJ1
dGlvblBvaW50hkdodHRwOi8vY3JsLnNhZmFyaWNvbS5jby5rZS9TYWZhcmljb20l
MjBJbnRlcm5hbCUyMElzc3VpbmclMjBDQSUyMDAyLmNybDCCAQkGCCsGAQUFBwEB
BIH8MIH5MIHJBggrBgEFBQcwAoaBvGxkYXA6Ly8vQ049U2FmYXJpY29tJTIwSW50
ZXJuYWwlMjBJc3N1aW5nJTIwQ0ElMjAwMixDTj1BSUEsQ049UHVibGljJTIwS2V5
JTIwU2VydmljZXMsQ049U2VydmljZXMsQ049Q29uZmlndXJhdGlvbixEQz1zYWZh
cmljb20sREM9bmV0P2NBQ2VydGlmaWNhdGU/YmFzZT9vYmplY3RDbGFzcz1jZXJ0
aWZpY2F0aW9uQXV0aG9yaXR5MCsGCCsGAQUFBzABhh9odHRwOi8vY3JsLnNhZmFy
aWNvbS5jby5rZS9vY3NwMAsGA1UdDwQEAwIFoDA9BgkrBgEEAYI3FQcEMDAuBiYr
BgEEAYI3FQiHz4xWhMLEA4XphTaE3tENhqCICGeGwcdsg7m5awIBZAIBDDAdBgNV
HSUEFjAUBggrBgEFBQcDAgYIKwYBBQUHAwEwJwYJKwYBBAGCNxUKBBowGDAKBggr
BgEFBQcDAjAKBggrBgEFBQcDATANBgkqhkiG9w0BAQsFAAOCAQEAC/hWx7KTwSYr
x2SOyyHNLTRmCnCJmqxA/Q+IzpW1mGtw4Sb/8jdsoWrDiYLxoKGkgkvmQmB2J3zU
ngzJIM2EeU921vbjLqX9sLWStZbNC2Udk5HEecdpe1AN/ltIoE09ntglUNINyCmf
zChs2maF0Rd/y5hGnMM9bX9ub0sqrkzL3ihfmv4vkXNxYR8k246ZZ8tjQEVsKehE
dqAmj8WYkYdWIHQlkKFP9ba0RJv7aBKb8/KP+qZ5hJip0I5Ey6JJ3wlEWRWUYUKh
gYoPHrJ92ToadnFCCpOlLKWc0xVxANofy6fqreOVboPO0qTAYpoXakmgeRNLUiar
0ah6M/q/KA==
-----END CERTIFICATE-----`;

const generateSecurityCredential = (initiatorPassword: string, env: string, customCertPem?: string): string => {
  const cert = (customCertPem || '').trim();
  const certPem = (cert && cert.replace(/-----[A-Z ]+-----/g, '').replace(/\s+/g, '').length > 200)
    ? cert
    : (env === 'production' ? PRODUCTION_CERT : SANDBOX_CERT);
  return encryptSecurityCredential(initiatorPassword, certPem);
};


// ── Kenyan MSISDN normaliser: returns 2547XXXXXXXX / 2541XXXXXXXX or null ──
function normalizeMsisdn(raw: string): string | null {
  let p = String(raw || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  else if (/^(7|1)\d{8}$/.test(p)) p = '254' + p;
  return /^254(7|1)\d{8}$/.test(p) ? p : null;
}

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
      let body: any = {};
      try { body = await req.json(); } catch { /* empty */ }
      const { initiator_password, environment, cert_pem } = body || {};
      if (!initiator_password || typeof initiator_password !== 'string')
        return json({ error: 'initiator_password (string) required' }, 400);
      try {
        const credential = generateSecurityCredential(initiator_password, environment || 'sandbox', cert_pem);
        return json({ success: true, security_credential: credential });
      } catch (e) {
        console.error('B2C cred error:', e);
        return json({
          error: 'Encryption failed. For production, paste Safaricom\'s ProductionCertificate.cer contents in the cert_pem field.',
          detail: (e as Error).message,
        }, 500);
      }
    }

    // ─── RECONCILE B2C WITHDRAWALS (cron/admin) ───
    // Cross-checks processing/approved withdrawals older than X minutes and
    // marks them failed (with refund) if no callback ever arrived.
    if (action === 'b2c_reconcile') {
      const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString(); // 15 min stale
      const { data: stale } = await supabase.from('withdrawals')
        .select('*').in('status', ['processing', 'approved']).lt('updated_at', cutoff);
      let healed = 0;
      for (const w of (stale || [])) {
        // No receipt + no completion → treat as failed and refund.
        if (!w.mpesa_receipt) {
          await refundBalance(supabase, w.deriv_account, Number(w.amount));
          await supabase.from('withdrawals').update({
            status: 'failed', mpesa_receipt: 'AUTO-RECONCILED: no callback within 15m',
          }).eq('id', w.id);
          healed++;
        }
      }
      return json({ success: true, scanned: stale?.length || 0, healed });
    }

    // ─── B2C RESULT CALLBACK (from Safaricom) ───
    if (action === 'b2c_result') {
      const body = await req.json().catch(() => ({}));
      const result = body?.Result;
      if (result) {
        const convId = result.ConversationID || result.OriginatorConversationID;
        const origId = String(result.OriginatorConversationID || '');
        const code = Number(result.ResultCode);
        const desc = result.ResultDesc || '';
        const receiptItem = result.ResultParameters?.ResultParameter?.find(
          (p: any) => p.Key === 'TransactionReceipt'
        );
        const receipt = receiptItem?.Value || null;

        let { data: w } = await supabase.from('withdrawals')
          .select('*').eq('mpesa_transaction_id', convId).maybeSingle();
        // Fallback: we send OriginatorConversationID as `WD-<withdrawal_id>`
        if (!w && origId.startsWith('WD-')) {
          const res = await supabase.from('withdrawals')
            .select('*').eq('id', origId.slice(3)).maybeSingle();
          w = res.data;
        }
        if (w && !['completed', 'failed', 'rejected'].includes(w.status)) {
          if (code === 0) {
            await supabase.from('withdrawals').update({
              status: 'completed', mpesa_receipt: receipt,
            }).eq('id', w.id);
          } else {
            // Failure → refund
            const hint = code === 2001
              ? ' (Fix: regenerate the Security Credential in Admin → M-Pesa using the API Operator initiator password, and confirm the Initiator Name.)'
              : '';
            await refundBalance(supabase, w.deriv_account, Number(w.amount));
            await supabase.from('withdrawals').update({
              status: 'failed', mpesa_receipt: `FAIL: ${desc}${hint}`,
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

      const formattedPhone = normalizeMsisdn(phone_number);
      if (!formattedPhone)
        return json({ error: 'Enter a valid Safaricom number, e.g. 07XXXXXXXX' }, 400);

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
            await creditFirstDeposit(supabase, dep.deriv_account, Number(dep.amount), dep.id);
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
          await creditFirstDeposit(supabase, dep.deriv_account, Number(dep.amount), dep.id);
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

      const formattedPhone = normalizeMsisdn(phone_number);
      if (!formattedPhone)
        return json({ error: 'Enter a valid Safaricom number, e.g. 07XXXXXXXX' }, 400);
      if (!Number.isInteger(Number(amount)) || Number(amount) < 10)
        return json({ error: 'Withdrawal amount must be a whole number of at least KES 10' }, 400);

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
    // Idempotent and explicit status machine:
    //   pending  →  approved  →  processing  →  completed | failed
    //   pending  →  rejected (refund)
    // Any other transition is rejected so retries from the UI are safe.
    if (action === 'process_withdrawal') {
      const body = await req.json().catch(() => ({}));
      const { withdrawal_id, approve } = body || {};
      if (!withdrawal_id) return json({ error: 'withdrawal_id required' }, 400);

      const { data: w } = await supabase.from('withdrawals')
        .select('*').eq('id', withdrawal_id).single();
      if (!w) return json({ error: 'Withdrawal not found' }, 404);

      // Idempotency — return current state instead of erroring out on retry.
      const terminal = ['completed', 'failed', 'rejected', 'cancelled'];
      if (terminal.includes(w.status)) {
        return json({ success: true, idempotent: true, status: w.status, message: `Already ${w.status}` });
      }
      if (w.status === 'processing' && approve) {
        return json({ success: true, idempotent: true, status: 'processing', message: 'B2C already dispatched, awaiting callback' });
      }
      if (!['pending', 'approved'].includes(w.status)) {
        return json({ error: `Invalid state transition from ${w.status}` }, 409);
      }

      // ── REJECT ──
      if (!approve) {
        if (w.status !== 'pending') {
          return json({ error: `Cannot reject a ${w.status} withdrawal` }, 409);
        }
        await refundBalance(supabase, w.deriv_account, Number(w.amount));
        await supabase.from('withdrawals').update({
          status: 'rejected',
          mpesa_receipt: 'Rejected by admin — balance refunded',
        }).eq('id', withdrawal_id);
        return json({ success: true, status: 'rejected', message: 'Withdrawal rejected & balance refunded' });
      }

      // ── APPROVE ── promote pending → approved first (intermediate state)
      if (w.status === 'pending') {
        await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', withdrawal_id);
        w.status = 'approved';
      }

      // Try real Daraja B2C if enabled & fully configured.
      // NOTE: every failure below returns HTTP 200 with success:false so the
      // client can surface the real reason instead of a generic
      // "Edge Function returned a non-2xx status code".
      const b2cReady = config?.b2c_enabled && config?.initiator_name && config?.security_credential && config?.b2c_shortcode;
      if (b2cReady) {
        try {
          const partyB = normalizeMsisdn(w.phone_number);
          if (!partyB) {
            return json({
              success: false, status: 'approved',
              error: `Invalid M-Pesa number "${w.phone_number}" — payout not sent. Withdrawal stays Approved for manual payout.`,
            });
          }
          const amountInt = Math.floor(Number(w.amount));
          if (!Number.isFinite(amountInt) || amountInt < 10) {
            return json({
              success: false, status: 'approved',
              error: 'B2C minimum payout is KES 10. Withdrawal stays Approved for manual payout.',
            });
          }

          const b2cBase = config.environment === 'production'
            ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
          const authStr = btoa(`${config.consumer_key}:${config.consumer_secret}`);
          const tokResp = await fetch(`${b2cBase}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${authStr}` },
          });
          const tokJson = await tokResp.json().catch(() => ({}));
          if (!tokJson.access_token) {
            return json({
              success: false, status: 'approved',
              error: 'B2C OAuth token failed — check consumer key/secret. Withdrawal stays Approved for manual payout.',
              detail: tokJson,
            });
          }

          const resultUrl = config.result_url || `${supabaseUrl}/functions/v1/mpesa-stk?action=b2c_result`;
          const timeoutUrl = config.queue_timeout_url || `${supabaseUrl}/functions/v1/mpesa-stk?action=b2c_timeout`;
          const payload = {
            OriginatorConversationID: `WD-${withdrawal_id}`,
            InitiatorName: config.initiator_name,
            SecurityCredential: config.security_credential,
            CommandID: 'BusinessPayment',
            Amount: amountInt,
            PartyA: String(config.b2c_shortcode),
            PartyB: partyB,
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
          const rawB2c = await b2cResp.text();
          let b2cData: any = {};
          try { b2cData = JSON.parse(rawB2c); } catch { b2cData = { raw: rawB2c }; }

          if (b2cData.ResponseCode === '0' || b2cData.ConversationID) {
            await supabase.from('withdrawals').update({
              status: 'processing',
              mpesa_transaction_id: b2cData.ConversationID || b2cData.OriginatorConversationID || null,
            }).eq('id', withdrawal_id);
            return json({ success: true, status: 'processing', message: 'B2C payout dispatched', b2c: b2cData });
          }
          console.error('B2C dispatch failed', b2cResp.status, rawB2c);
          return json({
            success: false, status: 'approved',
            error: (b2cData.errorMessage || b2cData.ResponseDescription || `Daraja HTTP ${b2cResp.status}`) +
              ' — withdrawal stays Approved for manual payout.',
            b2c: b2cData,
          });
        } catch (e) {
          console.error('B2C error', e);
          return json({
            success: false, status: 'approved',
            error: 'B2C error: ' + (e as Error).message + ' — withdrawal stays Approved for manual payout.',
          });
        }
      }


      // No B2C credentials → admin-paid manual fallback
      await supabase.from('withdrawals').update({
        status: 'completed',
        mpesa_receipt: 'MANUAL PAYOUT by admin (B2C not configured)',
      }).eq('id', withdrawal_id);
      return json({ success: true, status: 'completed', message: 'Marked completed (manual payout — configure B2C for automation)' });
    }

    // ─── B2C TRANSACTION STATUS QUERY (admin "Check status" button) ───
    if (action === 'b2c_status') {
      const body = await req.json().catch(() => ({}));
      const { withdrawal_id } = body || {};
      if (!withdrawal_id) return json({ error: 'withdrawal_id required' }, 400);
      const { data: w } = await supabase.from('withdrawals').select('*').eq('id', withdrawal_id).maybeSingle();
      if (!w) return json({ error: 'Withdrawal not found' }, 404);
      if (!w.mpesa_transaction_id)
        return json({ success: true, status: w.status, message: 'No B2C conversation id yet' });
      if (!config?.b2c_enabled || !config?.initiator_name || !config?.security_credential)
        return json({ error: 'B2C not configured' }, 400);

      const base = config.environment === 'production'
        ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';
      const tokResp = await fetch(`${base}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${btoa(`${config.consumer_key}:${config.consumer_secret}`)}` },
      });
      const tok = await tokResp.json();
      if (!tok.access_token) return json({ error: 'OAuth failed — check consumer key/secret' }, 502);

      const statusResp = await fetch(`${base}/mpesa/transactionstatus/v1/query`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${tok.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Initiator: config.initiator_name,
          SecurityCredential: config.security_credential,
          CommandID: 'TransactionStatusQuery',
          TransactionID: w.mpesa_receipt || '',
          OriginatorConversationID: w.mpesa_transaction_id,
          PartyA: config.b2c_shortcode,
          IdentifierType: '4',
          ResultURL: config.result_url || `${supabaseUrl}/functions/v1/mpesa-stk?action=b2c_result`,
          QueueTimeOutURL: config.queue_timeout_url || `${supabaseUrl}/functions/v1/mpesa-stk?action=b2c_timeout`,
          Remarks: 'Withdrawal status check',
          Occasion: 'Withdrawal',
        }),
      });
      const statusData = await statusResp.json();
      return json({ success: true, status: w.status, daraja: statusData });
    }

    return json({ error: 'Invalid action' }, 400);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
