import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Users, TrendingUp, ShieldCheck, Wallet } from 'lucide-react';

interface AppUser {
  id: string; email: string; name?: string; phone?: string;
  win_tier?: string; verified?: boolean; created_at?: string;
}

const UsersAdminTab = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [house, setHouse] = useState<any>(null);
  const [floorInput, setFloorInput] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: us }, { data: h }] = await Promise.all([
      (supabase as any).from('app_users').select('*').order('created_at', { ascending: false }),
      (supabase as any).from('house_ledger').select('*').limit(1).maybeSingle(),
    ]);
    setUsers((us || []) as AppUser[]);
    setHouse(h || { pool: 0, total_user_stakes: 0, total_user_payouts: 0, min_floor: 0 });
    setFloorInput(String(h?.min_floor ?? 0));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const setTier = async (u: AppUser, tier: 'normal' | 'high') => {
    await (supabase as any).from('app_users').update({ win_tier: tier }).eq('id', u.id);
    setUsers(users.map(x => x.id === u.id ? { ...x, win_tier: tier } : x));
    toast({ title: `${u.email} → ${tier === 'high' ? '🟢 High Win (90%)' : 'Normal'}` });
  };

  const saveFloor = async () => {
    if (!house?.id) return;
    const v = Number(floorInput) || 0;
    await (supabase as any).from('house_ledger').update({ min_floor: v }).eq('id', house.id);
    setHouse({ ...house, min_floor: v });
    toast({ title: 'House floor updated' });
  };

  const filtered = users.filter(u =>
    !search || (u.email || '').toLowerCase().includes(search.toLowerCase())
            || (u.phone || '').toLowerCase().includes(search.toLowerCase())
            || (u.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* House Ledger */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-card border border-primary/30 rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><Wallet className="h-3 w-3" /> House Pool</p>
          <p className={`text-lg font-bold font-mono ${Number(house?.pool || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>KES {Number(house?.pool || 0).toFixed(2)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground">User Stakes In</p>
          <p className="text-lg font-bold font-mono text-foreground">KES {Number(house?.total_user_stakes || 0).toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-[10px] uppercase text-muted-foreground">Payouts Out</p>
          <p className="text-lg font-bold font-mono text-loss">KES {Number(house?.total_user_payouts || 0).toFixed(0)}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-3 space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Safety Floor</p>
          <div className="flex gap-1">
            <Input value={floorInput} onChange={e => setFloorInput(e.target.value)} type="number" className="h-7 text-xs bg-secondary border-border" />
            <Button size="sm" className="h-7 text-xs" onClick={saveFloor}>Save</Button>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Users ({users.length})
          </h2>
          <Input placeholder="Search email, phone, name…" value={search} onChange={e => setSearch(e.target.value)}
            className="max-w-xs h-8 text-xs bg-secondary border-border" />
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={load}>Refresh</Button>
        </div>

        {loading ? (
          <p className="text-xs text-muted-foreground text-center py-6">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No users found.</p>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map(u => (
              <div key={u.id} className="py-2 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-foreground truncate flex items-center gap-1.5">
                    {u.email}
                    {u.win_tier === 'high' && <span className="text-[9px] uppercase bg-profit/20 text-profit px-1.5 py-0.5 rounded flex items-center gap-1"><TrendingUp className="h-2.5 w-2.5" />High Win</span>}
                    {!u.verified && <span className="text-[9px] uppercase bg-loss/20 text-loss px-1.5 py-0.5 rounded">Unverified</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {u.name || '—'} {u.phone ? `• ${u.phone}` : ''}
                  </p>
                </div>
                <div className="shrink-0 flex gap-1">
                  {u.win_tier === 'high' ? (
                    <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => setTier(u, 'normal')}>Set Normal</Button>
                  ) : (
                    <Button size="sm" className="text-[10px] h-7 bg-profit/20 text-profit hover:bg-profit/30" onClick={() => setTier(u, 'high')}>Boost to 90%</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground pt-1">
          High-Win users win ~90% of bot trades. The house ledger ensures total payouts never exceed the safety floor — when the pool gets low, even high-win users see losses to keep the house solvent.
        </p>
      </div>
    </div>
  );
};

export default UsersAdminTab;
