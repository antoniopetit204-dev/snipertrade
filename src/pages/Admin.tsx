import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUser, getSettings, saveSettings, getBots, saveBots, type AdminSettings, type Bot } from '@/lib/store';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Settings, Bot as BotIcon, Globe, Shield, LogOut, Activity, Plus, Trash2, Key, AppWindow, Users, Palette } from 'lucide-react';
import { setUser } from '@/lib/store';
import { motion } from 'framer-motion';

const Admin = () => {
  const navigate = useNavigate();
  const user = getUser();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AdminSettings>(getSettings());
  const [bots, setBots] = useState<Bot[]>(getBots());
  const [newBot, setNewBot] = useState({ name: '', description: '', strategy: '', category: 'free' as 'free' | 'premium' });

  useEffect(() => {
    if (!user || user.role !== 'admin') { navigate('/'); return; }
  }, [user, navigate]);

  const handleSaveSettings = () => {
    saveSettings(settings);
    toast({ title: 'Settings saved', description: 'Configuration updated successfully' });
  };

  const toggleBot = (id: string) => {
    const updated = bots.map((b) => b.id === id ? { ...b, enabled: !b.enabled } : b);
    setBots(updated);
    saveBots(updated);
  };

  const deleteBot = (id: string) => {
    const updated = bots.filter((b) => b.id !== id);
    setBots(updated);
    saveBots(updated);
    toast({ title: 'Bot deleted' });
  };

  const addBot = () => {
    if (!newBot.name) return;
    const bot: Bot = {
      id: Date.now().toString(),
      name: newBot.name,
      description: newBot.description,
      strategy: newBot.strategy || 'Custom',
      enabled: false,
      createdAt: new Date().toISOString().split('T')[0],
      profitLoss: 0,
      trades: 0,
      winRate: 0,
      category: newBot.category,
    };
    const updated = [...bots, bot];
    setBots(updated);
    saveBots(updated);
    setNewBot({ name: '', description: '', strategy: '', category: 'free' });
    toast({ title: 'Bot created', description: `${bot.name} added successfully` });
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/');
  };

  if (!user || user.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between bg-card">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="text-muted-foreground border-border hover:text-foreground">
            View Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout} className="text-loss border-border hover:bg-loss/10">
            <LogOut className="h-3 w-3 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="bg-card border border-border flex-wrap">
            <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Globe className="h-3 w-3 mr-1" /> General
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Key className="h-3 w-3 mr-1" /> API Config
            </TabsTrigger>
            <TabsTrigger value="bots" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BotIcon className="h-3 w-3 mr-1" /> Bot Manager
            </TabsTrigger>
            <TabsTrigger value="seo" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <AppWindow className="h-3 w-3 mr-1" /> SEO & Meta
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="h-3 w-3 mr-1" /> Appearance
            </TabsTrigger>
            <TabsTrigger value="users" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="h-3 w-3 mr-1" /> Users
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" /> Site Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Site Name</Label>
                  <Input value={settings.siteName} onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Site Title</Label>
                  <Input value={settings.siteTitle} onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact Email</Label>
                  <Input value={settings.contactEmail} onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Contact Phone</Label>
                  <Input value={settings.contactPhone} onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Telegram Link</Label>
                  <Input value={settings.telegramLink} onChange={(e) => setSettings({ ...settings, telegramLink: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Support URL</Label>
                  <Input value={settings.supportUrl} onChange={(e) => setSettings({ ...settings, supportUrl: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Footer Text</Label>
                  <Input value={settings.footerText} onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Announcement Bar</Label>
                  <Input value={settings.announcementBar} onChange={(e) => setSettings({ ...settings, announcementBar: e.target.value })}
                    placeholder="Leave empty to hide" className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Terms URL</Label>
                  <Input value={settings.termsUrl} onChange={(e) => setSettings({ ...settings, termsUrl: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Privacy URL</Label>
                  <Input value={settings.privacyUrl} onChange={(e) => setSettings({ ...settings, privacyUrl: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <Switch checked={settings.maintenanceMode} onCheckedChange={v => setSettings({ ...settings, maintenanceMode: v })} />
                  <Label className="text-sm text-foreground">Maintenance Mode</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={settings.allowSignups} onCheckedChange={v => setSettings({ ...settings, allowSignups: v })} />
                  <Label className="text-sm text-foreground">Allow Signups</Label>
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Settings
              </Button>
            </motion.div>
          </TabsContent>

          {/* API Config */}
          <TabsContent value="api">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" /> Deriv API Configuration
              </h2>
              <p className="text-xs text-muted-foreground">
                Configure your Deriv third-party app credentials. Get these from{' '}
                <a href="https://api.deriv.com" target="_blank" rel="noopener" className="text-primary hover:underline">api.deriv.com</a>.
                Set the redirect URL in your Deriv app to: <span className="text-primary font-mono">{window.location.origin}/callback</span>
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">App ID</Label>
                  <Input value={settings.appId} onChange={(e) => setSettings({ ...settings, appId: e.target.value })}
                    placeholder="e.g. 97552" className="bg-secondary border-border text-foreground font-mono" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">API Token (Optional - for admin functions)</Label>
                  <Input value={settings.apiKey} onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                    placeholder="Your Deriv API token" type="password" className="bg-secondary border-border text-foreground font-mono" />
                </div>
              </div>
              <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-foreground">OAuth URL Preview:</p>
                <p className="text-xs font-mono text-primary break-all">
                  {settings.appId
                    ? `https://oauth.deriv.com/oauth2/authorize?app_id=${settings.appId}&l=EN&brand=deriv`
                    : 'Enter App ID to generate OAuth URL'}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Redirect URL:</strong> Set this in your Deriv app settings:
                </p>
                <p className="text-xs font-mono text-primary">{window.location.origin}/callback</p>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save API Config
              </Button>
            </motion.div>
          </TabsContent>

          {/* Bot Manager */}
          <TabsContent value="bots">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <div className="bg-card border border-border rounded-lg p-6 space-y-4">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Create / Upload Bot
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input value={newBot.name} onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                    placeholder="Bot name" className="bg-secondary border-border text-foreground" />
                  <Input value={newBot.strategy} onChange={(e) => setNewBot({ ...newBot, strategy: e.target.value })}
                    placeholder="Strategy type" className="bg-secondary border-border text-foreground" />
                  <Input value={newBot.description} onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                    placeholder="Description" className="bg-secondary border-border text-foreground" />
                  <select
                    value={newBot.category}
                    onChange={(e) => setNewBot({ ...newBot, category: e.target.value as 'free' | 'premium' })}
                    className="bg-secondary border border-border text-foreground rounded-md px-3 py-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
                <Button onClick={addBot} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-3 w-3 mr-1" /> Add Bot
                </Button>
              </div>

              <div className="bg-card border border-border rounded-lg">
                <div className="px-4 py-3 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground">Manage Bots ({bots.length})</h2>
                </div>
                <div className="divide-y divide-border">
                  {bots.map((bot) => (
                    <div key={bot.id} className="px-4 py-3 flex items-center justify-between hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <Switch checked={bot.enabled} onCheckedChange={() => toggleBot(bot.id)} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{bot.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {bot.strategy} • {bot.trades} trades • <span className={bot.category === 'free' ? 'text-profit' : 'text-primary'}>{bot.category}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-mono ${bot.profitLoss >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {bot.profitLoss >= 0 ? '+' : ''}${bot.profitLoss.toFixed(2)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => deleteBot(bot.id)} className="text-loss hover:text-loss hover:bg-loss/10">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </TabsContent>

          {/* SEO & Meta */}
          <TabsContent value="seo">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <AppWindow className="h-4 w-4 text-primary" /> SEO & Meta Data
              </h2>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Meta Description</Label>
                  <Textarea value={settings.metaDescription} onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
                    className="bg-secondary border-border text-foreground" rows={3} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Meta Keywords</Label>
                  <Input value={settings.metaKeywords} onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })}
                    className="bg-secondary border-border text-foreground" placeholder="Comma-separated keywords" />
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Meta Data
              </Button>
            </motion.div>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" /> Appearance Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Logo URL</Label>
                  <Input value={settings.logoUrl} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    placeholder="https://..." className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Favicon URL</Label>
                  <Input value={settings.favicon} onChange={(e) => setSettings({ ...settings, favicon: e.target.value })}
                    placeholder="https://..." className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Primary Color</Label>
                  <Input value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                    type="color" className="bg-secondary border-border text-foreground h-10" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Default Currency</Label>
                  <Input value={settings.defaultCurrency} onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                    className="bg-secondary border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Max Bots Per User</Label>
                  <Input value={settings.maxBotPerUser} onChange={(e) => setSettings({ ...settings, maxBotPerUser: parseInt(e.target.value) || 10 })}
                    type="number" className="bg-secondary border-border text-foreground" />
                </div>
              </div>
              <Button onClick={handleSaveSettings} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save Appearance
              </Button>
            </motion.div>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card border border-border rounded-lg p-6 space-y-5">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> User Management
              </h2>
              <p className="text-sm text-muted-foreground">
                Users authenticate via Deriv OAuth. When they login through the landing page, they are redirected to Deriv and
                authenticated automatically. User accounts are managed by Deriv.
              </p>
              <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
                <p className="text-xs text-muted-foreground">Admin Account:</p>
                <p className="text-sm font-mono text-foreground">{user.email}</p>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
