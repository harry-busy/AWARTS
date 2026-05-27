import { useState } from 'react';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Key, Copy, Check, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { AWARTS_API_V1 } from '@/lib/api-url';

export function ApiKeysPanel() {
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const revokeKey = useRevokeApiKey();
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    if (!name.trim()) {
      toast({ title: 'Enter a key name', variant: 'destructive' });
      return;
    }
    try {
      const result = await createKey.mutateAsync({ name: name.trim() });
      setNewKey(result.key);
      setName('');
      toast({ title: 'API key created', description: 'Copy it now — it won’t be shown again.' });
    } catch (e) {
      toast({
        title: 'Failed to create key',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  }

  async function handleRevoke(id: string) {
    try {
      await revokeKey.mutateAsync({ keyId: id });
      toast({ title: 'API key revoked' });
    } catch {
      toast({ title: 'Failed to revoke', variant: 'destructive' });
    }
  }

  async function copyKey() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Production base: <code className="text-xs bg-muted px-1 rounded">{AWARTS_API_V1}</code>. Scopes:{' '}
          <code className="text-xs">read</code>, <code className="text-xs">write</code>, <code className="text-xs">mcp</code>.
          Keys are shown once at creation.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4 space-y-3">
        <Label htmlFor="key-name">New key name</Label>
        <div className="flex gap-2">
          <Input
            id="key-name"
            placeholder="e.g. MCP / CI / Mobile app"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
          />
          <Button onClick={handleCreate} disabled={createKey.isPending}>
            {createKey.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
          </Button>
        </div>
      </div>

      {newKey && (
        <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Your new API key</p>
          <code className="block text-xs font-mono break-all bg-background border border-border rounded p-2">
            {newKey}
          </code>
          <Button variant="outline" size="sm" onClick={copyKey} className="gap-2">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy key
          </Button>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Active keys</p>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : !keys?.length ? (
          <p className="text-sm text-muted-foreground">No API keys yet.</p>
        ) : (
          <ul className="space-y-2">
            {keys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">{k.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{k.keyPrefix}…</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleRevoke(k.id)}
                  disabled={revokeKey.isPending}
                  aria-label="Revoke key"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground">MCP config (Cursor / Claude Desktop)</p>
        <pre className="font-mono overflow-x-auto whitespace-pre-wrap">{`{
  "mcpServers": {
    "awarts": {
      "command": "npx",
      "args": ["-y", "@awarts/mcp@latest"],
      "env": { "AWARTS_API_KEY": "aw_live_..." }
    }
  }
}`}</pre>
      </div>
    </div>
  );
}
