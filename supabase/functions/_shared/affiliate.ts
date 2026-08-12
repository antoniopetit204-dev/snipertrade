// Shared affiliate/referral engine used by auth-email (attribution),
// mpesa-stk (first-deposit commissions) and the affiliate function (stats).
//
// Algorithm
//  1. Every user owns a permanent, unique affiliate CODE (never regenerated).
//  2. A visit to `<their-domain>/?ref=CODE` records one click per unique
//     visitor id (deduped) and bumps the affiliate's click counter.
//  3. On signup the code is attributed and locked to the new user forever
//     (`app_users.referred_by_code`) — the credit can never be reassigned.
//     Referral rows are created for up to 3 upline levels.
//  4. Commissions pay out ONLY on the referred user's FIRST successful
//     deposit, using the admin-set level percentages. A unique constraint on
//     (referred_email, affiliate_email, level) makes it impossible to pay twice.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function genCode(len = 8): string {
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => ALPHABET[b % ALPHABET.length]).join('');
}

export function normalizeCode(raw: unknown): string {
  return String(raw ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
}

/** Get (or lazily create) the affiliate record for a user email. */
export async function ensureAffiliate(sb: any, email: string) {
  const mail = String(email || '').toLowerCase().trim();
  if (!mail) return null;
  const { data: existing } = await sb.from('affiliates').select('*').eq('email', mail).maybeSingle();
  if (existing) return existing;

  for (let attempt = 0; attempt < 6; attempt++) {
    const code = genCode();
    const { data, error } = await sb.from('affiliates').insert({ email: mail, code }).select().single();
    if (!error && data) {
      await sb.from('app_users').update({ referral_code: code }).eq('email', mail);
      return data;
    }
    // 23505 = unique violation (code collision or concurrent insert)
    const { data: again } = await sb.from('affiliates').select('*').eq('email', mail).maybeSingle();
    if (again) return again;
  }
  return null;
}

/** Record one click per unique visitor for a code. Returns true if new. */
export async function recordClick(
  sb: any,
  code: string,
  visitorId: string,
  meta: { ip?: string; user_agent?: string; referer?: string; landing_origin?: string } = {},
) {
  const c = normalizeCode(code);
  if (!c || !visitorId) return false;
  const { data: aff } = await sb.from('affiliates').select('id, clicks').eq('code', c).maybeSingle();
  if (!aff) return false;
  const { error } = await sb.from('affiliate_clicks').insert({
    code: c,
    visitor_id: String(visitorId).slice(0, 64),
    ip: meta.ip || '',
    user_agent: (meta.user_agent || '').slice(0, 300),
    referer: (meta.referer || '').slice(0, 300),
    landing_origin: (meta.landing_origin || '').slice(0, 200),
  });
  if (error) return false; // duplicate visitor → not a new click
  await sb.from('affiliates').update({ clicks: Number(aff.clicks || 0) + 1 }).eq('id', aff.id);
  return true;
}

/**
 * Attribute a signup to a referral code. Idempotent, and never overwrites an
 * existing attribution — an affiliate cannot lose credit once earned.
 */
export async function attributeSignup(sb: any, referredEmail: string, rawCode: string) {
  const mail = String(referredEmail || '').toLowerCase().trim();
  const code = normalizeCode(rawCode);
  if (!mail || !code) return { attributed: false, reason: 'no_code' };

  const { data: user } = await sb.from('app_users').select('id, referred_by_code').eq('email', mail).maybeSingle();
  if (user?.referred_by_code) return { attributed: true, reason: 'already_attributed', code: user.referred_by_code };

  const { data: aff } = await sb.from('affiliates').select('*').eq('code', code).maybeSingle();
  if (!aff) return { attributed: false, reason: 'invalid_code' };
  if (aff.email === mail) return { attributed: false, reason: 'self_referral' };

  await sb.from('app_users').update({ referred_by_code: code }).eq('email', mail);

  // Build up to 3 upline levels.
  let uplineEmail: string | null = aff.email;
  let uplineCode: string | null = aff.code;
  for (let level = 1; level <= 3 && uplineEmail; level++) {
    if (uplineEmail === mail) break;
    await sb.from('referrals').insert({
      referrer_email: uplineEmail,
      referrer_code: uplineCode,
      referred_email: mail,
      level,
      status: 'pending',
    });
    const { data: upAff } = await sb.from('affiliates').select('signups, id').eq('email', uplineEmail).maybeSingle();
    if (level === 1 && upAff) {
      await sb.from('affiliates').update({ signups: Number(upAff.signups || 0) + 1 }).eq('id', upAff.id);
    }
    // Walk one level up: who referred the upline?
    const { data: upUser } = await sb.from('app_users').select('referred_by_code').eq('email', uplineEmail).maybeSingle();
    const nextCode = normalizeCode(upUser?.referred_by_code);
    if (!nextCode) break;
    const { data: nextAff } = await sb.from('affiliates').select('email, code').eq('code', nextCode).maybeSingle();
    uplineEmail = nextAff?.email || null;
    uplineCode = nextAff?.code || null;
  }

  return { attributed: true, code };
}

async function creditBalance(sb: any, account: string, amount: number) {
  const { data: existing } = await sb.from('user_balances').select('*').eq('deriv_account', account).maybeSingle();
  if (!existing) {
    await sb.from('user_balances').insert({ deriv_account: account, balance: amount });
  } else {
    await sb.from('user_balances').update({ balance: Number(existing.balance) + amount }).eq('deriv_account', account);
  }
}

/**
 * Pay commissions on the referred user's FIRST successful deposit only.
 * Safe to call on every deposit — it exits early once conversion happened.
 */
export async function creditFirstDeposit(
  sb: any,
  referredAccount: string,
  depositAmount: number,
  depositId?: string,
) {
  const mail = String(referredAccount || '').toLowerCase().trim();
  const amount = Number(depositAmount);
  if (!mail || !(amount > 0)) return { credited: 0 };

  const { data: settings } = await sb.from('admin_settings').select('*').limit(1).maybeSingle();
  if (!settings?.affiliate_enabled) return { credited: 0, reason: 'disabled' };

  const { data: rows } = await sb.from('referrals').select('*').eq('referred_email', mail);
  if (!rows || rows.length === 0) return { credited: 0, reason: 'no_referral' };
  if (rows.some((r: any) => r.status === 'converted')) return { credited: 0, reason: 'already_converted' };

  // Guard: this must be the FIRST credited deposit for this user.
  const { count } = await sb.from('deposits')
    .select('id', { count: 'exact', head: true })
    .eq('deriv_account', mail).eq('credited', true);
  if ((count ?? 0) > 1) {
    await sb.from('referrals').update({ status: 'converted', converted_at: new Date().toISOString() })
      .eq('referred_email', mail);
    return { credited: 0, reason: 'not_first_deposit' };
  }

  const pct: Record<number, number> = {
    1: Number(settings.affiliate_l1_percent ?? 10),
    2: Number(settings.affiliate_l2_percent ?? 3),
    3: Number(settings.affiliate_l3_percent ?? 1),
  };

  let credited = 0;
  for (const r of rows) {
    const percent = pct[Number(r.level)] ?? 0;
    const commission = +((amount * percent) / 100).toFixed(2);
    if (commission <= 0) continue;

    const { error } = await sb.from('affiliate_commissions').insert({
      affiliate_email: r.referrer_email,
      referred_email: mail,
      level: r.level,
      deposit_amount: amount,
      percent,
      amount: commission,
      deposit_id: depositId || null,
    });
    if (error) continue; // already paid (unique constraint) → skip

    await creditBalance(sb, r.referrer_email, commission);
    const { data: aff } = await sb.from('affiliates').select('id, total_earned, conversions').eq('email', r.referrer_email).maybeSingle();
    if (aff) {
      await sb.from('affiliates').update({
        total_earned: +(Number(aff.total_earned || 0) + commission).toFixed(2),
        conversions: Number(aff.conversions || 0) + (Number(r.level) === 1 ? 1 : 0),
      }).eq('id', aff.id);
    }
    await sb.from('referrals').update({
      status: 'converted',
      first_deposit_amount: amount,
      commission_paid: commission,
      converted_at: new Date().toISOString(),
    }).eq('id', r.id);
    credited += commission;
  }

  return { credited: +credited.toFixed(2) };
}
