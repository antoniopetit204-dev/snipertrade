import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { FileText, Eye, Save, RotateCcw } from 'lucide-react';
import { fetchEmailTemplates, updateEmailTemplate } from '@/lib/auth-email';
import { useToast } from '@/hooks/use-toast';

export default function AdminEmailTemplatesTab() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const t = await fetchEmailTemplates();
    setTemplates(t);
    if (t.length && !active) setActive(t[0]);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!active) return;
    setSaving(true);
    await updateEmailTemplate(active.id, { subject: active.subject, html: active.html, text: active.text, enabled: active.enabled });
    toast({ title: 'Template saved' });
    setTemplates(templates.map(t => t.id === active.id ? active : t));
    setSaving(false);
  };

  const inputClass = "bg-secondary border-border text-xs sm:text-sm";

  return (
    <div className="bg-card border border-border rounded-lg p-4 sm:p-6 space-y-4">
      <h2 className="text-sm sm:text-base font-semibold flex items-center gap-2">
        <FileText className="h-4 w-4 text-primary" /> Email Templates
      </h2>
      <p className="text-[10px] sm:text-xs text-muted-foreground">
        Use variables like <code className="text-primary">{'{{name}}'}</code>, <code className="text-primary">{'{{site_name}}'}</code>, <code className="text-primary">{'{{reset_url}}'}</code>, <code className="text-primary">{'{{amount}}'}</code>, <code className="text-primary">{'{{site_url}}'}</code>.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-1 space-y-1">
          {templates.map(t => (
            <button key={t.id} onClick={() => { setActive(t); setPreview(false); }}
              className={`w-full text-left px-3 py-2 rounded text-xs ${active?.id === t.id ? 'bg-primary text-primary-foreground' : 'bg-secondary hover:bg-secondary/70'}`}>
              <div className="font-semibold">{t.name}</div>
              <div className="text-[10px] opacity-70 font-mono">{t.template_key}</div>
            </button>
          ))}
        </div>

        {active && (
          <div className="lg:col-span-3 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={active.enabled} onCheckedChange={v => setActive({ ...active, enabled: v })} />
                <Label className="text-xs">Enabled</Label>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
                  <Eye className="h-3 w-3 mr-1" /> {preview ? 'Edit' : 'Preview'}
                </Button>
                <Button size="sm" onClick={save} disabled={saving}>
                  <Save className="h-3 w-3 mr-1" /> {saving ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>

            {preview ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="bg-secondary p-3 border-b border-border text-xs">
                  <strong>Subject:</strong> {active.subject}
                </div>
                <iframe srcDoc={active.html} className="w-full h-[500px] bg-white" title="preview" />
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs">Subject line</Label>
                  <Input value={active.subject} onChange={e => setActive({ ...active, subject: e.target.value })} className={inputClass} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">HTML body</Label>
                  <Textarea value={active.html} onChange={e => setActive({ ...active, html: e.target.value })}
                    rows={16} className={`${inputClass} font-mono text-[11px]`} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Plain-text fallback</Label>
                  <Textarea value={active.text} onChange={e => setActive({ ...active, text: e.target.value })}
                    rows={4} className={`${inputClass} font-mono text-[11px]`} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
