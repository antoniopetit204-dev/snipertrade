export type VisualBlockKind = 'condition' | 'indicator' | 'action' | 'risk';
export type VisualAccent = 'primary' | 'profit' | 'loss';

export interface VisualBlockPreset {
  id: string;
  title: string;
  kind: VisualBlockKind;
  description: string;
  accent: VisualAccent;
}

export interface VisualBlock extends VisualBlockPreset {
  instanceId: string;
}

export interface CompiledVisualStrategy {
  contractType: string;
  barrier: string;
  duration: string;
  durationUnit: string;
  rounds: string;
  stopLoss: string;
  takeProfit: string;
  strategyName: string;
  summary: string;
}

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const VISUAL_BLOCK_PRESETS: VisualBlockPreset[] = [
  { id: 'trend-filter', title: 'Trend Filter', kind: 'indicator', description: 'Favors trades aligned with the latest market direction.', accent: 'primary' },
  { id: 'momentum-burst', title: 'Momentum Burst', kind: 'indicator', description: 'Shortens duration for breakout style entries.', accent: 'primary' },
  { id: 'rsi-oversold', title: 'RSI Oversold', kind: 'condition', description: 'Looks for bounce setups after temporary weakness.', accent: 'profit' },
  { id: 'digit-over-4', title: 'Digit > 4', kind: 'condition', description: 'Targets last-digit continuation above 4.', accent: 'profit' },
  { id: 'digit-under-5', title: 'Digit < 5', kind: 'condition', description: 'Targets last-digit continuation below 5.', accent: 'loss' },
  { id: 'buy-rise', title: 'Buy Rise', kind: 'action', description: 'Places a CALL contract when the setup is ready.', accent: 'profit' },
  { id: 'buy-fall', title: 'Buy Fall', kind: 'action', description: 'Places a PUT contract when the setup is ready.', accent: 'loss' },
  { id: 'buy-over', title: 'Buy Digit Over', kind: 'action', description: 'Places a DIGITOVER contract using the selected barrier.', accent: 'profit' },
  { id: 'buy-under', title: 'Buy Digit Under', kind: 'action', description: 'Places a DIGITUNDER contract using the selected barrier.', accent: 'loss' },
  { id: 'scalp-risk', title: 'Scalp Risk', kind: 'risk', description: 'Keeps runs short with tighter loss control.', accent: 'primary' },
  { id: 'tp-guard', title: 'Take Profit Guard', kind: 'risk', description: 'Locks gains earlier once the bot is in profit.', accent: 'profit' },
  { id: 'sl-guard', title: 'Stop Loss Guard', kind: 'risk', description: 'Cuts the sequence quickly when the market turns.', accent: 'loss' },
];

export const createVisualBlock = (presetId: string) => {
  const preset = VISUAL_BLOCK_PRESETS.find((item) => item.id === presetId);
  if (!preset) return null;
  return { ...preset, instanceId: createId() } satisfies VisualBlock;
};

export const reorderBlocks = (blocks: VisualBlock[], fromIndex: number, toIndex: number) => {
  const next = [...blocks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
};

export const compileBlocksToBotConfig = (blocks: VisualBlock[]): CompiledVisualStrategy => {
  let contractType = 'CALL';
  let barrier = '5';
  let duration = '5';
  let durationUnit = 't';
  let rounds = '6';
  let stopLoss = '6';
  let takeProfit = '10';

  const titles = blocks.map((block) => block.title);

  if (blocks.some((block) => block.id === 'momentum-burst')) duration = '3';
  if (blocks.some((block) => block.id === 'digit-over-4')) { contractType = 'DIGITOVER'; barrier = '4'; duration = '5'; }
  if (blocks.some((block) => block.id === 'digit-under-5')) { contractType = 'DIGITUNDER'; barrier = '5'; duration = '5'; }
  if (blocks.some((block) => block.id === 'buy-fall')) contractType = 'PUT';
  if (blocks.some((block) => block.id === 'buy-rise')) contractType = 'CALL';
  if (blocks.some((block) => block.id === 'buy-over')) contractType = 'DIGITOVER';
  if (blocks.some((block) => block.id === 'buy-under')) contractType = 'DIGITUNDER';
  if (blocks.some((block) => block.id === 'scalp-risk')) { rounds = '4'; stopLoss = '4'; takeProfit = '7'; }
  if (blocks.some((block) => block.id === 'tp-guard')) takeProfit = '8';
  if (blocks.some((block) => block.id === 'sl-guard')) stopLoss = '4';

  const actionTitle = blocks.find((block) => block.kind === 'action')?.title || 'Auto Entry';
  const indicatorTitle = blocks.find((block) => block.kind === 'indicator')?.title || 'Signal';

  return {
    contractType,
    barrier,
    duration,
    durationUnit,
    rounds,
    stopLoss,
    takeProfit,
    strategyName: `${actionTitle} • ${indicatorTitle}`,
    summary: titles.length > 0 ? titles.join(' → ') : 'Add blocks to generate a practical trading flow.',
  };
};
