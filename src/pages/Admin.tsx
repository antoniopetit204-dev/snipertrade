import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getSettings, saveSettings, getBots, saveBots, type AdminSettings, type Bot, setUser } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bot as BotIcon, Globe, Shield, LogOut, Activity, Plus, Trash2, Key, AppWindow, Users, Palette, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

const Admin = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSettings>(getSettings());
  const [bots, setBots] = useState<Bot[]>(getBots());
  const [newBot, setNewBot] = useState({ name: '', description: '', strategy: '', category: 'free' as 'free' | 'premium' });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/login'); return; }
  }, [user, navigate]);

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast({ title: 'Settings saved' });
  };

  const toggleBot = (id: string) => {
    const updated = bots.map(b => b.id === id ? { ...b, enabled: !b.enabled } : b);
    setBots(updated); saveBots(updated);
  };

  const deleteBot = (id: string) => {
    const updated = bots.filter(b => b.id !== id);
    setBots(updated); saveBots(updated);
    toast({ title: 'Bot deleted' });
  };

  const addBot = () => {
    if (!newBot.name) return;
    const bot: Bot = {
      id: Date.now().toString(), name: newBot.name, description: newBot.description,
      strategy: newBot.strategy || 'Custom', enabled: false,
      createdAt: new Date().toISOString().split('T')[0],
      profitLoss: 0, trades: 0, winRate: 0, category: newBot.category,
    };
    const updated = [...bots, bot];
    setBots(updated); saveBots(updated);
    setNewBot({ name: '', description: '', strategy: '', category: 'free' });
    toast({ title: `${bot.name} created` });
  };

  const handleLogout = () => { setUser(null); navigate('/'); };

  if (!user || user.role !== 'admin') return null;

  const inputClass = "bg-secondary border-border text-foreground text-xs sm:text-sm";
  const labelClass = "text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider";

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-3 sm:px-6 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-2 sm:gap-3">
          <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
          <div>
            <h1 className="text-sm sm:text-lg font-bold text-foreground">Admin Panel</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground truncate max-w-[150px] sm:max-w-none">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground border-border hover:text-foreground text-xs h-7 sm:h-8">
            Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-loss border-border hover:bg-loss/10 text-xs h-7 sm:h-8">
            <LogOut className="h-3 w-3 sm:mr-1" /> <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-3 sm:p-6">
        <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
          <TabsList className="bg-card border border-border flex-wrap h-auto gap-1 p-1">
            {[
              { value: 'general', icon: Globe, label: 'General' },
              { value: 'api', icon: Key, label: 'API' },
              { value: 'bots', icon: BotIcon, label: 'Bots' },
              { value: 'seo', icon: AppWindow, label: 'SEO' },
              { value: 'appearance', icon: Palette, label: 'Look' },
              { value: 'users', icon: Users, label: 'Users' },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5">
                <tab.icon className="h-3 w-3 mr-1" /> {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* General */}
          <TabsContent value="general">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Site Settings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { key: 'siteName', label: 'Site Name' },
                  { key: 'siteTitle', label: 'Site Title' },
                  { key: 'contactEmail', label: 'Contact Email' },
                  { key: 'contactPhone', label: 'Contact Phone' },
                  { key: 'telegramLink', label: 'Telegram Link' },
                  { key: 'supportUrl', label: 'Support URL' },
                  { key: 'footerText', label: 'Footer Text' },
                  { key: 'announcementBar', label: 'Announcement Bar' },
                  { key: 'termsUrl', label: 'Terms URL' },
                  { key: 'privacyUrl', label: 'Privacy URL' },
                ].map(field => (
                  <div key={field.key} className="space-y-2">
                    <Label className={labelClass}>{field.label}</Label>
                    <Input value={(settings as any)[field.key]} onChange={e => setSettings({ ...settings, [field.key]: e.target.value })} className={inputClass} />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <Switch checked={settings.maintenanceMode} onCheckedChange={v => setSettings({ ...settings, maintenanceMode: v })} />
                  <Label className="text-xs sm:text-sm text-foreground">Maintenance Mode</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settings.allowSignups} onCheckedChange={v => setSettings({ ...settings, allowSignups: v })} />
                  <Label className="text-xs sm:text-sm text-foreground">Allow Signups</Label>
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">Save Settings</Button>
            </motion.div>
          </TabsContent>

          {/* API */}
          <TabsContent value="api">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Deriv API Configuration
              </h2>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Get credentials from <a href="https://api.deriv.com" target="_blank" className="text-primary hover:underline">api.deriv.com</a>.
                Set redirect URL to: <span className="text-primary font-mono break-all">{window.location.origin}/callback</span>
              </p>
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className={labelClass}>App ID</Label>
                  <Input value={settings.appId} onChange={e => setSettings({ ...settings, appId: e.target.value })} placeholder="e.g. 97552" className={`${inputClass} font-mono`} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>API Token (Optional)</Label>
                  <Input value={settings.apiKey} onChange={e => setSettings({ ...settings, apiKey: e.target.value })} type="password" className={`${inputClass} font-mono`} />
                </div>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-3 sm:p-4 space-y-1">
                <p className="text-[10px] sm:text-xs font-semibold text-foreground">OAuth URL:</p>
                <p className="text-[10px] sm:text-xs font-mono text-primary break-all">
                  {settings.appId ? `https://oauth.deriv.com/oauth2/authorize?app_id=${settings.appId}&l=EN&brand=deriv` : 'Enter App ID first'}
                </p>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">Save API Config</Button>
            </motion.div>
          </TabsContent>

          {/* Bots */}
          <TabsContent value="bots">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-3 sm:space-y-4">
                <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Create Bot
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <Input value={newBot.name} onChange={e => setNewBot({ ...newBot, name: e.target.value })} placeholder="Bot name" className={inputClass} />
                  <Input value={newBot.strategy} onChange={e => setNewBot({ ...newBot, strategy: e.target.value })} placeholder="Strategy" className={inputClass} />
                  <Input value={newBot.description} onChange={e => setNewBot({ ...newBot, description: e.target.value })} placeholder="Description" className={inputClass} />
                  <select value={newBot.category} onChange={e => setNewBot({ ...newBot, category: e.target.value as any })}
                    className="bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-xs sm:text-sm">
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <Button onClick={addBot} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">
                  <Plus className="h-3 w-3 mr-1" /> Add Bot
                </Button>
              </div>

              <div className="bg-card border border-border rounded-lg">
                <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border">
                  <h2 className="text-xs sm:text-sm font-semibold text-foreground">Manage Bots ({bots.length})</h2>
                </div>
                <div className="divide-y divide-border">
                  {bots.map(bot => (
                    <div key={bot.id} className="px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between hover:bg-accent/30 transition-colors gap-2">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <Switch checked={bot.enabled} onCheckedChange={() => toggleBot(bot.id)} />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium text-foreground flex items-center gap-1.5 truncate">
                            {bot.name}
                            {bot.category === 'premium' && <Crown className="h-3 w-3 text-primary shrink-0" />}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                            {bot.strategy} • {bot.trades} trades • <span className={bot.category === 'free' ? 'text-profit' : 'text-primary'}>{bot.category}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <span className={`text-xs sm:text-sm font-mono ${bot.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {bot.profitLoss >= 0 ? '+' : ''}${bot.profitLoss.toFixed(0)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => deleteBot(bot.id)} className="text-loss hover:text-loss hover:bg-loss/10 h-7 w-7 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* SEO */}
          <TabsContent value="seo">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <AppWindow className="h-4 w-4 text-primary" /> SEO & Meta
              </h2>
              <div className="space-y-3 sm:space-y-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Meta Description</Label>
                  <Textarea value={settings.metaDescription} onChange={e => setSettings({ ...settings, metaDescription: e.target.value })} className={inputClass} rows={3} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Meta Keywords</Label>
                  <Input value={settings.metaKeywords} onChange={e => setSettings({ ...settings, metaKeywords: e.target.value })} className={inputClass} placeholder="Comma-separated" />
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">Save Meta</Button>
            </motion.div>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Appearance
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className={labelClass}>Logo URL</Label>
                  <Input value={settings.logoUrl} onChange={e => setSettings({ ...settings, logoUrl: e.target.value })} placeholder="https://..." className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Favicon URL</Label>
                  <Input value={settings.favicon} onChange={e => setSettings({ ...settings, favicon: e.target.value })} placeholder="https://..." className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Primary Color</Label>
                  <Input value={settings.primaryColor} onChange={e => setSettings({ ...settings, primaryColor: e.target.value })} type="color" className={`${inputClass} h-10`} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Default Currency</Label>
                  <Input value={settings.defaultCurrency} onChange={e => setSettings({ ...settings, defaultCurrency: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className={labelClass}>Max Bots Per User</Label>
                  <Input value={settings.maxBotPerUser} onChange={e => setSettings({ ...settings, maxBotPerUser: parseInt(e.target.value) || 10 })} type="number" className={inputClass} />
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs sm:text-sm">Save Appearance</Button>
            </motion.div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4 sm:space-y-5">
              <h2 className="text-sm sm:text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> User Management
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Users authenticate via Deriv OAuth. They login through the landing page and are authenticated automatically. Accounts are managed by Deriv.
              </p>
              <div className="bg-secondary/50 border border-border rounded-lg p-3 sm:p-4 space-y-2">
                <p className="text-[10px] sm:text-xs text-muted-foreground">Admin Account:</p>
                <p className="text-xs sm:text-sm font-mono text-foreground">{user.email}</p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
