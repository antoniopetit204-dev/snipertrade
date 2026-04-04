import { getUser } from './store';

export type ContractCategory = 'normal' | 'rise_fall' | 'over_under' | 'accumulators' | 'multipliers' | 'vanillas' | 'turbos';

interface ProposalPayloadOptions {
  symbol: string;
  contractType: string;
  stake: number;
  currency?: string;
  duration?: number;
  durationUnit?: string;
  barrier?: string;
  multiplier?: number;
  growthRate?: number;
  takeProfit?: number | null;
  stopLoss?: number | null;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const isSyntheticSymbol = (symbol: string) => /^R_/.test(symbol) || /^(1HZ|BOOM|CRASH|STEP)/.test(symbol);

export const getAccountCurrency = () => getUser()?.activeAccount?.cur || 'USD';

export const getDefaultDurationUnit = (symbol: string, category: ContractCategory) => {
  if (category === 'over_under') return 't';
  if (category === 'vanillas' || category === 'turbos') return 'm';
  if (category === 'normal' || category === 'multipliers' || category === 'accumulators') return 't';
  return isSyntheticSymbol(symbol) ? 't' : 'm';
};

export const normalizeDuration = (symbol: string, category: ContractCategory, duration: number, durationUnit?: string) => {
  const resolvedUnit = durationUnit || getDefaultDurationUnit(symbol, category);
  const safeDuration = Number.isFinite(duration) && duration > 0 ? Math.floor(duration) : 5;

  if (category === 'over_under') {
    return { duration: clamp(safeDuration, 1, 10), durationUnit: 't' };
  }

  if (category === 'rise_fall') {
    if (resolvedUnit === 't') return { duration: clamp(safeDuration, 1, 15), durationUnit: 't' };
    if (resolvedUnit === 's') return { duration: clamp(safeDuration, 15, 3600), durationUnit: 's' };
    return { duration: clamp(safeDuration, 1, 1440), durationUnit: 'm' };
  }

  if (category === 'vanillas' || category === 'turbos') {
    return { duration: clamp(safeDuration, 1, 120), durationUnit: resolvedUnit === 't' ? 'm' : resolvedUnit };
  }

  return { duration: clamp(safeDuration, 1, 10), durationUnit: 't' };
};

export const getFriendlyTradeError = (error: unknown) => {
  const raw = typeof error === 'string'
    ? error
    : (error as { message?: string; code?: string })?.message || (error as { code?: string })?.code || 'Trade could not be placed.';
  const text = raw.toLowerCase();

  if (text.includes('not authorised for any further contract purchases')) {
    return 'This account or symbol does not support that contract right now. Try a Volatility index, a smaller stake, or another contract tab.';
  }

  if (text.includes('missing required contract parameters')) {
    return 'This contract needs more parameters for the selected market. Try Rise/Fall, or set the digit barrier again for digit trades.';
  }

  if (text.includes('contract type is not available') || text.includes('invalid contract type')) {
    return 'That pair does not support this contract type. Switch symbol or use another trade type.';
  }

  if (text.includes('duration') || text.includes('barrier')) {
    return 'The pair rejected the chosen duration or barrier. Use the suggested defaults or try a synthetic symbol.';
  }

  if (text.includes('amount') || text.includes('stake') || text.includes('price')) {
    return 'The trade amount is outside the allowed range for this market. Adjust the lot size and retry.';
  }

  if (text.includes('currency')) {
    return 'The selected market does not accept the current account currency for this contract.';
  }

  if (text.includes('websocket not connected')) {
    return 'Connection dropped before the order was sent. Reconnect and try again.';
  }

  return raw;
};

export const isContractSupported = (availableContracts: string[], contractType: string) => {
  if (availableContracts.length === 0) return true;
  return availableContracts.includes(contractType);
};

export const buildProposalPayload = ({
  symbol,
  contractType,
  stake,
  currency,
  duration,
  durationUnit,
  barrier,
  multiplier,
  growthRate,
  takeProfit,
  stopLoss,
}: ProposalPayloadOptions) => {
  const payload: Record<string, any> = {
    amount: Math.max(stake || 1, 0.35),
    basis: 'stake',
    contract_type: contractType,
    currency: currency || getAccountCurrency(),
    symbol,
  };

  if (duration && durationUnit && !contractType.startsWith('MULT') && contractType !== 'ACCU') {
    payload.duration = duration;
    payload.duration_unit = durationUnit;
  }

  if (contractType === 'DIGITOVER' || contractType === 'DIGITUNDER') {
    payload.barrier = barrier || '5';
  }

  if (contractType === 'ACCU') {
    payload.growth_rate = growthRate || 0.01;
  }

  if (contractType.startsWith('MULT')) {
    payload.multiplier = multiplier || 20;
    const limit_order: Record<string, number> = {};
    if (takeProfit && takeProfit > 0) limit_order.take_profit = takeProfit;
    if (stopLoss && stopLoss > 0) limit_order.stop_loss = stopLoss;
    if (Object.keys(limit_order).length > 0) payload.limit_order = limit_order;
  }

  return payload;
};
