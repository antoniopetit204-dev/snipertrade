import { Button } from '@/components/ui/button';
import { createVisualBlock, reorderBlocks, VISUAL_BLOCK_PRESETS, type VisualBlock, type VisualBlockKind } from '@/lib/bot-builder';
import { cn } from '@/lib/utils';
import { Activity, BrainCircuit, GripVertical, MousePointer2, ShieldAlert, Sparkles, Trash2, Workflow } from 'lucide-react';

interface VisualBotBuilderProps {
  blocks: VisualBlock[];
  onChange: (blocks: VisualBlock[]) => void;
  onApplyStrategy: () => void;
}

const kindMeta: Record<VisualBlockKind, { label: string; icon: typeof Activity }> = {
  condition: { label: 'Conditions', icon: MousePointer2 },
  indicator: { label: 'Indicators', icon: BrainCircuit },
  action: { label: 'Trade Actions', icon: Activity },
  risk: { label: 'Risk Guards', icon: ShieldAlert },
};

const accentClassMap = {
  primary: 'border-primary/30 bg-primary/10 text-primary',
  profit: 'border-profit/30 bg-profit/10 text-profit',
  loss: 'border-loss/30 bg-loss/10 text-loss',
};

export const VisualBotBuilder = ({ blocks, onChange, onApplyStrategy }: VisualBotBuilderProps) => {
  const moveBlock = (payload: string, targetIndex: number) => {
    if (payload.startsWith('preset:')) {
      const created = createVisualBlock(payload.replace('preset:', ''));
      if (!created) return;
      const next = [...blocks];
      next.splice(targetIndex, 0, created);
      onChange(next);
      return;
    }

    if (payload.startsWith('block:')) {
      const sourceId = payload.replace('block:', '');
      const fromIndex = blocks.findIndex((block) => block.instanceId === sourceId);
      if (fromIndex < 0) return;
      const adjustedIndex = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
      onChange(reorderBlocks(blocks, fromIndex, adjustedIndex));
    }
  };

  const groupedPresets = (['condition', 'indicator', 'action', 'risk'] as VisualBlockKind[]).map((kind) => ({
    kind,
    items: VISUAL_BLOCK_PRESETS.filter((preset) => preset.kind === kind),
  }));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.2fr] gap-4">
      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Drag Strategy Blocks</h2>
            <p className="text-xs text-muted-foreground">Drop conditions, indicators, actions, and risk guards into the canvas.</p>
          </div>
        </div>

        <div className="space-y-3">
          {groupedPresets.map(({ kind, items }) => {
            const Icon = kindMeta[kind].icon;
            return (
              <div key={kind} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Icon className="h-3.5 w-3.5" /> {kindMeta[kind].label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {items.map((preset) => (
                    <div
                      key={preset.id}
                      draggable
                      onDragStart={(event) => event.dataTransfer.setData('text/plain', `preset:${preset.id}`)}
                      className={cn('rounded-lg border p-3 cursor-grab active:cursor-grabbing transition-colors', accentClassMap[preset.accent])}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold">{preset.title}</span>
                        <GripVertical className="h-3.5 w-3.5 opacity-70" />
                      </div>
                      <p className="mt-1 text-[11px] opacity-90">{preset.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Workflow className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-foreground">Strategy Canvas</h2>
              <p className="text-xs text-muted-foreground">Build the exact trading flow the bot should follow.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onChange([])} className="text-xs">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
            </Button>
            <Button size="sm" onClick={onApplyStrategy} className="text-xs bg-primary text-primary-foreground hover:bg-primary/90">
              Apply to Runner
            </Button>
          </div>
        </div>

        <div
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            moveBlock(event.dataTransfer.getData('text/plain'), blocks.length);
          }}
          className="min-h-[320px] rounded-xl border border-dashed border-border bg-secondary/30 p-4"
        >
          {blocks.length === 0 ? (
            <div className="h-full min-h-[288px] flex flex-col items-center justify-center text-center text-muted-foreground">
              <Workflow className="h-10 w-10 mb-3 opacity-40" />
              <p className="text-sm font-medium text-foreground">Drop your first block here</p>
              <p className="text-xs max-w-sm mt-1">Start with a signal block, then add a trade action and a risk guard to create a practical bot.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {blocks.map((block, index) => (
                <div key={block.instanceId}>
                  <div
                    draggable
                    onDragStart={(event) => event.dataTransfer.setData('text/plain', `block:${block.instanceId}`)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      moveBlock(event.dataTransfer.getData('text/plain'), index);
                    }}
                    className={cn('rounded-xl border p-3 transition-colors cursor-grab active:cursor-grabbing', accentClassMap[block.accent])}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-7 w-7 rounded-lg bg-background/70 flex items-center justify-center text-[11px] font-bold shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold">{block.title}</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-75">{kindMeta[block.kind].label}</span>
                          </div>
                          <p className="mt-1 text-[11px] opacity-90">{block.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onChange(blocks.filter((item) => item.instanceId !== block.instanceId))}
                        className="p-1 rounded-md hover:bg-background/60 transition-colors shrink-0"
                        type="button"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {index < blocks.length - 1 && (
                    <div className="flex justify-center py-1.5 text-muted-foreground">
                      <span className="text-xs">↓</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
