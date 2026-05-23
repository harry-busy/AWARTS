import { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/context/AuthContext';
import { useUser } from '@clerk/clerk-react';
import { useCurrentUser, useUpdateProfile, useUploadAvatar, useImportUsage, useDeleteAccount, useCheckUsername, useDataExport } from '@/hooks/use-api';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// removed unused import
import { toast } from '@/hooks/use-toast';
import { SEO } from '@/components/SEO';
import { COUNTRIES } from '@/lib/constants';
import { useDebounce } from '@/hooks/use-debounce';
import { motion } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  FileUp, 
  X, 
  AlertCircle, 
  Target, 
  Check, 
  Copy,
  Key,
} from 'lucide-react';
import { ApiKeysPanel } from '@/components/ApiKeysPanel';

export default function Settings() {
  return (
    <AuthGate>
      <SettingsContent />
    </AuthGate>
  );
}

// ── CSV Parser ──────────────────────────────────────────────────────────
function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    return row;
  });
}

interface ImportEntry {
  date: string;
  provider: string;
  cost_usd: number;
  input_tokens: number;
  output_tokens: number;
  models: string[];
  cost_source?: string;
}

function parseImportFile(content: string, filename: string): { entries: ImportEntry[]; errors: string[] } {
  const errors: string[] = [];
  const entries: ImportEntry[] = [];
  const validProviders = ['claude', 'codex', 'gemini', 'antigravity', 'cursor'];
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

  try {
    let rawData: any[];

    if (filename.endsWith('.csv')) {
      const rows = parseCSV(content);
      rawData = rows.map((r) => ({
        date: r.date,
        provider: r.provider,
        cost_usd: Number(r.cost_usd || r.cost || 0),
        input_tokens: Number(r.input_tokens || 0),
        output_tokens: Number(r.output_tokens || 0),
        models: (r.models || r.model || '').split(';').filter(Boolean),
        cost_source: r.cost_source,
      }));
    } else {
      const parsed = JSON.parse(content);
      rawData = Array.isArray(parsed) ? parsed : parsed.entries ?? [parsed];
    }

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row.date || !dateRegex.test(row.date)) {
        errors.push(`Row ${i + 1}: Invalid date "${row.date}"`);
        continue;
      }
      if (!row.provider || !validProviders.includes(row.provider)) {
        errors.push(`Row ${i + 1}: Invalid provider "${row.provider}"`);
        continue;
      }
      entries.push({
        date: row.date,
        provider: row.provider,
        cost_usd: Number(row.cost_usd) || 0,
        input_tokens: Number(row.input_tokens) || 0,
        output_tokens: Number(row.output_tokens) || 0,
        models: Array.isArray(row.models) ? row.models : [],
        cost_source: row.cost_source || 'real',
      });
    }
  } catch (e) {
    errors.push(`Failed to parse file: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }

  return { entries, errors };
}

function SettingsContent() {
  const { user: authUser } = useAuth();
  const { user: clerkUser } = useUser();
  const { data: profile } = useCurrentUser();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const importUsage = useImportUsage();
  const deleteAccount = useDeleteAccount();
  const { data: exportData } = useDataExport();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [externalLink, setExternalLink] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [country, setCountry] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [notifKudos, setNotifKudos] = useState(true);
  const [notifComments, setNotifComments] = useState(true);
  const [notifMentions, setNotifMentions] = useState(true);
  const [notifFollows, setNotifFollows] = useState(true);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [copiedSync, setCopiedSync] = useState(false);
  const [copiedDaemon, setCopiedDaemon] = useState(false);

  // Username validation
  const debouncedUsername = useDebounce(username, 400);
  const { data: usernameCheck } = useCheckUsername(
    debouncedUsername !== (profile as any)?.username ? debouncedUsername : ''
  );
  const isUsernameValid = username.length >= 3 && username.length <= 20 && /^[a-z0-9_]+$/.test(username);
  const isUsernameChanged = username !== ((profile as any)?.username ?? '');
  const usernameAvailable = isUsernameChanged && isUsernameValid && usernameCheck?.available === true;
  const usernameTaken = isUsernameChanged && isUsernameValid && usernameCheck?.available === false;

  // Import state
  const [importEntries, setImportEntries] = useState<ImportEntry[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setUsername((profile as any).username ?? '');
      setDisplayName((profile as any).displayName ?? '');
      setBio((profile as any).bio ?? '');
      setExternalLink((profile as any).externalLink ?? '');
      setReferralSource((profile as any).referralSource ?? '');
      setCountry((profile as any).country ?? '');
      setIsPublic((profile as any).isPublic ?? true);
      setEmailNotifications((profile as any).emailNotificationsEnabled ?? true);
      setNotifKudos((profile as any).notifyKudos ?? true);
      setNotifComments((profile as any).notifyComments ?? true);
      setNotifMentions((profile as any).notifyMentions ?? true);
      setNotifFollows((profile as any).notifyFollows ?? true);
      setWebhookUrl((profile as any).webhookUrl ?? '');

      const saved = (profile as any).githubUsername ?? '';
      if (saved) {
        setGithubUsername(saved);
      } else {
        const ghAccount = clerkUser?.externalAccounts?.find(
          (a) => a.provider === 'github'
        );
        setGithubUsername(ghAccount?.username ?? '');
      }
    }
  }, [profile, clerkUser]);

  const handleSave = async () => {
    try {
      const updates: Record<string, any> = {
        displayName,
        bio,
        externalLink: externalLink || undefined,
        githubUsername: githubUsername || undefined,
        referralSource: referralSource || undefined,
        country: country || undefined,
      };
      if (isUsernameChanged && isUsernameValid && usernameAvailable) {
        updates.username = username;
      }
      await updateProfile.mutateAsync(updates);
      toast({ title: 'Profile updated!' });
    } catch {
      toast({ title: 'Failed to save', variant: 'destructive' });
    }
  };

  const handlePrivacyToggle = async (checked: boolean) => {
    setIsPublic(checked);
    try {
      await updateProfile.mutateAsync({ isPublic: checked });
    } catch {
      setIsPublic(!checked);
      toast({ title: 'Failed to update privacy', variant: 'destructive' });
    }
  };

  // ── Import handlers ───────────────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.json') && !file.name.endsWith('.csv')) {
      toast({ title: 'Unsupported file type', description: 'Please upload a .json or .csv file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 5MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const { entries, errors } = parseImportFile(content, file.name);
      setImportEntries(entries);
      setImportErrors(errors);
      setImportFileName(file.name);
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleImportSubmit = async () => {
    if (importEntries.length === 0) return;
    try {
      const result = await importUsage.mutateAsync({ entries: importEntries });
      toast({
        title: 'Import successful!',
        description: `Processed ${result.processed} entries, ${result.posts_created} posts created.`,
      });
      setImportEntries([]);
      setImportErrors([]);
      setImportFileName('');
    } catch (err) {
      toast({ title: 'Import failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const clearImport = () => {
    setImportEntries([]);
    setImportErrors([]);
    setImportFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const avatarUrl = authUser?.avatarUrl || '/placeholder.svg';

  return (
    <AppShell>
      <SEO title="Settings" description="Manage your AWARTS profile, privacy, notifications, and account settings." noindex />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl mx-auto space-y-6"
      >
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>

        <Tabs defaultValue="profile">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="api">API & MCP</TabsTrigger>
            <TabsTrigger value="extension">Extension</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 mt-6">
            {/* Profile header with avatar + user ID */}
            <div className="flex items-center gap-4">
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-lg">@{(profile as any)?.username ?? ''}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{authUser?.clerkId ?? ''}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/png,image/webp';
                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      toast({ title: 'File too large (max 2MB)', variant: 'destructive' });
                      return;
                    }
                    try {
                      await uploadAvatar.upload(file);
                      toast({ title: 'Avatar updated!' });
                    } catch {
                      toast({ title: 'Upload failed', variant: 'destructive' });
                    }
                  };
                  input.click();
                }}
                disabled={uploadAvatar.isPending}
              >
                {uploadAvatar.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Change Avatar
              </Button>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Username</Label>
              <div className="relative">
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  maxLength={20}
                  placeholder="your_username"
                />
                {isUsernameChanged && isUsernameValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameAvailable && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {usernameTaken && <XCircle className="h-4 w-4 text-destructive" />}
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">3-20 chars, alphanumeric + underscore</p>
              {usernameTaken && <p className="text-xs text-destructive">Username is already taken</p>}
            </div>

            {/* Display Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Display Name</Label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Bio</Label>
              <Textarea value={bio} onChange={(e) => setBio(e.target.value.slice(0, 160))} className="resize-none" />
              <p className="text-xs text-muted-foreground text-right">{bio.length}/160</p>
            </div>

            {/* How did you hear about us? */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">How did you hear about us?</Label>
              <Textarea
                value={referralSource}
                onChange={(e) => setReferralSource(e.target.value.slice(0, 500))}
                className="resize-none"
                placeholder="Friend, GitHub, X, newsletter, podcast..."
                rows={2}
              />
              <p className="text-xs text-muted-foreground text-right">{referralSource.length}/500</p>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">Country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger><SelectValue placeholder="Select your country" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* External Link */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">External Link</Label>
              <Input value={externalLink} onChange={(e) => setExternalLink(e.target.value)} placeholder="https://yoursite.com" />
            </div>

            {/* GitHub Username */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold tracking-wider uppercase text-muted-foreground">GitHub Username</Label>
              <Input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} placeholder="octocat" />
            </div>

            <Button onClick={handleSave} disabled={updateProfile.isPending}>
              {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </TabsContent>

          <TabsContent value="privacy" className="space-y-4 mt-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Public Profile</p>
                <p className="text-sm text-muted-foreground">Anyone can see your sessions and stats</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={handlePrivacyToggle} />
            </div>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-3 mt-6">
            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Receive email notifications for activity</p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={async (checked) => {
                  setEmailNotifications(checked);
                  try {
                    await updateProfile.mutateAsync({ emailNotificationsEnabled: checked });
                  } catch {
                    setEmailNotifications(!checked);
                    toast({ title: 'Failed to update', variant: 'destructive' });
                  }
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Toggle in-app notifications:</p>
            {[
              { label: 'Kudos', desc: 'When someone gives you kudos', checked: notifKudos, set: setNotifKudos, field: 'notifyKudos' as const },
              { label: 'Comments', desc: 'When someone comments on your post', checked: notifComments, set: setNotifComments, field: 'notifyComments' as const },
              { label: 'Mentions', desc: 'When someone mentions you', checked: notifMentions, set: setNotifMentions, field: 'notifyMentions' as const },
              { label: 'Follows', desc: 'When someone follows you', checked: notifFollows, set: setNotifFollows, field: 'notifyFollows' as const },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <p className="font-medium text-foreground">{n.label}</p>
                  <p className="text-sm text-muted-foreground">{n.desc}</p>
                </div>
                <Switch
                  checked={n.checked}
                  onCheckedChange={async (checked) => {
                    n.set(checked);
                    try {
                      await updateProfile.mutateAsync({ [n.field]: checked });
                    } catch {
                      n.set(!checked);
                      toast({ title: 'Failed to update', variant: 'destructive' });
                    }
                  }}
                />
              </div>
            ))}

            {/* Webhook Integration */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm font-medium text-foreground">Webhook Integration</p>
              <p className="text-xs text-muted-foreground">
                Send notifications to Discord, Slack, or any webhook URL when you sync sessions, earn achievements, or hit milestones.
              </p>
              <div className="flex gap-2">
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://discord.com/api/webhooks/... or https://hooks.slack.com/..."
                  className="flex-1 font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    try {
                      await updateProfile.mutateAsync({ webhookUrl: webhookUrl.trim() || '' });
                      toast({ title: webhookUrl.trim() ? 'Webhook saved' : 'Webhook removed' });
                    } catch {
                      toast({ title: 'Failed to save webhook', variant: 'destructive' });
                    }
                  }}
                >
                  Save
                </Button>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Supported platforms:</p>
                <ul className="list-disc list-inside ml-1 space-y-0.5">
                  <li>Discord webhooks — formatted embeds with color</li>
                  <li>Slack incoming webhooks — formatted blocks</li>
                  <li>Any URL — receives JSON payloads</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-6">
            {/* File Import */}
            {importEntries.length === 0 ? (
              <div
                className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/20'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
              >
                <FileUp className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-foreground">Import usage data</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Drag and drop a .json or .csv file, or click to browse
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse Files
                </Button>
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <p>JSON format: <code className="bg-muted px-1 rounded">[{`{"date":"2025-01-01","provider":"codex","cost_usd":1.5,...}`}]</code></p>
                  <p>CSV columns: <code className="bg-muted px-1 rounded">date,provider,cost_usd,input_tokens,output_tokens,models</code></p>
                </div>
              </div>
            ) : (
              /* Preview */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{importFileName}</p>
                    <p className="text-sm text-muted-foreground">{importEntries.length} entries ready to import</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={clearImport}>
                    <X className="h-4 w-4 mr-1" /> Clear
                  </Button>
                </div>

                {importErrors.length > 0 && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium text-destructive mb-1">
                      <AlertCircle className="h-4 w-4" />
                      {importErrors.length} validation error{importErrors.length > 1 ? 's' : ''}
                    </div>
                    <ul className="list-disc ml-6 text-muted-foreground space-y-0.5">
                      {importErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                      {importErrors.length > 5 && <li>...and {importErrors.length - 5} more</li>}
                    </ul>
                  </div>
                )}

                {/* Preview table */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground">Provider</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Cost</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Input</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground">Output</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importEntries.slice(0, 10).map((e, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-3 py-1.5 font-mono text-xs">{e.date}</td>
                            <td className="px-3 py-1.5 capitalize">{e.provider}</td>
                            <td className="px-3 py-1.5 text-right font-mono">${e.cost_usd.toFixed(2)}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{e.input_tokens.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right font-mono text-muted-foreground">{e.output_tokens.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importEntries.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        ...and {importEntries.length - 10} more entries
                      </p>
                    )}
                  </div>
                </div>

                <Button onClick={handleImportSubmit} disabled={importUsage.isPending || importEntries.length === 0}>
                  {importUsage.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</>
                  ) : (
                    <>Import {importEntries.length} Entries</>
                  )}
                </Button>
              </div>
            )}

            {/* CLI sync section */}
            <div className="pt-4 border-t border-border">
              <p className="text-sm font-medium text-foreground mb-2">Or use the CLI:</p>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-sm max-w-sm">
                <span className="text-muted-foreground select-none">$</span>
                <code className="flex-1 text-foreground text-left">npx awarts@latest sync</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('npx awarts@latest sync');
                    setCopiedSync(true);
                    toast({ title: 'Copied to clipboard!' });
                    setTimeout(() => setCopiedSync(false), 2000);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {copiedSync ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 font-mono text-sm max-w-sm mt-2">
                <span className="text-muted-foreground select-none">$</span>
                <code className="flex-1 text-foreground text-left">npx awarts@latest daemon start</code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('npx awarts@latest daemon start');
                    setCopiedDaemon(true);
                    toast({ title: 'Copied to clipboard!' });
                    setTimeout(() => setCopiedDaemon(false), 2000);
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  {copiedDaemon ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <ApiKeysPanel />
          </TabsContent>

          <TabsContent value="extension" className="space-y-6 mt-6">
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-foreground">AWARTS Claude Counter</h3>
              <p className="text-sm text-muted-foreground">
                Automatically track every Claude.ai session — now live on the Chrome Web Store.
              </p>
            </div>

            <div className="rounded-xl border-2 border-primary bg-primary/5 p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  <Target className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Chrome Extension</p>
                  <p className="text-xs text-muted-foreground">Official Chrome Web Store release</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Install directly from the Chrome Web Store — no developer mode, no zip files, no manual steps required.
              </p>

              <a
                href="https://chromewebstore.google.com/detail/ocfdlilejljfjcnpjkadccegnaloeolk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center w-full py-3 rounded-md bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-md"
              >
                Add to Chrome — Free
              </a>

              <div className="pt-4 border-t border-primary/10">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-widest">
                  <CheckCircle2 className="h-4 w-4" /> Ready to Track
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Once installed, refresh Claude.ai and the AWARTS counter will appear automatically.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-cursor/20 flex items-center justify-center text-cursor">
                  <Key className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Cursor usage sync</p>
                  <p className="text-xs text-muted-foreground">Extension + CLI + MCP</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                Load the AWARTS Cursor helper from{' '}
                <code className="text-xs bg-muted px-1 rounded">extensions/awarts-cursor-counter</code>, set your API key in the popup, and sync from cursor.com/settings. Or run{' '}
                <code className="text-xs bg-muted px-1 rounded">npx awarts sync</code> after placing usage at{' '}
                <code className="text-xs bg-muted px-1 rounded">~/.awarts/cursor-usage.json</code>.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="account" className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={authUser?.email ?? ''} disabled />
            </div>

            {/* Data Export */}
            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm font-medium text-foreground">Data Export</p>
              <p className="text-xs text-muted-foreground">Download all your AWARTS data — profile, usage history, posts, achievements, and social connections.</p>
              <Button
                variant="outline"
                size="sm"
                disabled={!exportData}
                onClick={() => {
                  if (!exportData) return;
                  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `awarts-export-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast({ title: 'Data exported successfully' });
                }}
              >
                Download My Data
              </Button>
            </div>

            <div className="pt-4 border-t border-border space-y-3">
              <p className="text-sm text-destructive font-medium">Danger Zone</p>
              {!showDeleteConfirm ? (
                <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                  Delete Account
                </Button>
              ) : (
                <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
                  <p className="text-sm text-foreground font-medium">Are you sure? This action cannot be undone.</p>
                  <p className="text-xs text-muted-foreground">All your sessions, posts, comments, follows, and achievements will be permanently deleted.</p>
                  <div className="space-y-2">
                    <Label className="text-xs">Type <strong>DELETE</strong> to confirm:</Label>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="DELETE"
                      className="max-w-xs"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteConfirmText !== 'DELETE' || deleteAccount.isPending}
                      onClick={async () => {
                        try {
                          await deleteAccount.mutateAsync({} as any);
                          toast({ title: 'Account deleted', description: 'Your account has been permanently deleted.' });
                          window.location.href = '/';
                        } catch {
                          toast({ title: 'Deletion failed', variant: 'destructive' });
                        }
                      }}
                    >
                      {deleteAccount.isPending ? 'Deleting...' : 'Permanently Delete'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppShell>
  );
}
