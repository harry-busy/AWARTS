import { useState, useRef, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ACHIEVEMENTS, PROVIDERS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import {
  BookOpen, Download, Cpu, Layers, LayoutDashboard, Award,
  TerminalSquare, Code2, Shield, HelpCircle, Keyboard, Bug,
  Search, ChevronUp, Copy, Check
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  keywords: string;
  content: React.ReactNode;
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Code copied to clipboard.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Failed to copy', variant: 'destructive' });
    }
  }

  return (
    <div className="rounded-md border border-border bg-muted/50 overflow-hidden my-3 group relative">
      {title && <div className="border-b border-border px-3 py-1.5 text-xs font-mono text-muted-foreground bg-muted/80">{title}</div>}
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 p-1.5 rounded-md bg-background/80 border border-border text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
      <pre className="p-3 text-sm font-mono text-foreground overflow-x-auto whitespace-pre">{children}</pre>
    </div>
  );
}

function Heading3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">{children}</h3>;
}

function Para({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground leading-relaxed mb-3">{children}</p>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-sm text-foreground my-3">
      {children}
    </div>
  );
}

function TableWrapper({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto my-3">
      <table className="w-full text-sm border border-border rounded-md">
        <thead>
          <tr className="bg-muted/50">
            {headers.map((h) => <th key={h} className="text-left px-3 py-2 font-medium text-foreground border-b border-border">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {row.map((cell, j) => <td key={j} className="px-3 py-2 text-muted-foreground font-mono text-xs">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const sections: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    keywords: 'awarts quick start setup requirements node username country cli install',
    content: (
      <>
        <Heading3>What is AWARTS?</Heading3>
        <Para>
          AWARTS (AI Workflow Activity & Runtime Tracking System) is the social fitness tracker for AI-assisted coding. Think Strava, but for your Claude, Codex, Gemini, and Antigravity sessions. Track tokens, costs, streaks, and compete with developers worldwide.
        </Para>

        <Heading3>Quick Start (4 Steps)</Heading3>
        <div className="space-y-3 my-3">
          <div className="flex gap-3 items-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
            <div><p className="text-sm font-medium text-foreground">Sign up & create your username</p><p className="text-xs text-muted-foreground">Pick a unique handle — this is your public identity on AWARTS.</p></div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
            <div><p className="text-sm font-medium text-foreground">Run the CLI</p><p className="text-xs text-muted-foreground">Run <code className="font-mono bg-muted px-1 rounded text-foreground">npx awarts@latest login</code> — opens your browser, click Authorize, done. <strong>No API keys needed.</strong></p></div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
            <div><p className="text-sm font-medium text-foreground">Sync your sessions</p><p className="text-xs text-muted-foreground">Run <code className="font-mono bg-muted px-1 rounded text-foreground">npx awarts@latest sync</code> to auto-detect and upload your Claude, Codex, Gemini, or Antigravity usage from local files.</p></div>
          </div>
          <div className="flex gap-3 items-start">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
            <div><p className="text-sm font-medium text-foreground">Start auto-sync (recommended)</p><p className="text-xs text-muted-foreground">Run <code className="font-mono bg-muted px-1 rounded text-foreground">npx awarts@latest daemon start</code> to sync automatically every 1 hour in the background. Never miss a streak!</p></div>
          </div>
        </div>

        <div className="rounded-md border-2 border-primary/30 bg-primary/5 p-4 my-4 flex items-start gap-3">
          <TerminalSquare className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-foreground">Pro tip: Always run the background daemon</p>
            <p className="text-xs text-muted-foreground mt-1">
              The daemon auto-syncs every 1 hour so your sessions appear in real-time and your streak never gets missed. It runs silently in the background.
            </p>
            <CodeBlock title="Terminal">{`npx awarts@latest daemon start`}</CodeBlock>
          </div>
        </div>

        <Heading3>System Requirements</Heading3>
        <Para>
          Before using AWARTS, you need to have a few basic tools installed on your computer. If you don't have them, please download and install them from the links below:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-3 mb-4 ml-2">
          <li className="leading-relaxed">
            <strong>Node.js (version 18 or higher)</strong> — This is the core engine required to run the AWARTS CLI. Installing Node.js automatically includes <strong>npm</strong> and <strong>npx</strong>, which are the tools you use to run the commands.<br/>
            👉 <a href="https://nodejs.org/en/download/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Download Node.js here</a> (Choose the "LTS" version for your operating system).
          </li>
          <li className="leading-relaxed">
            <strong>Windows Users</strong> — You need a terminal to run commands. You can use <strong>PowerShell</strong> (which comes built-in with Windows) or download Windows Terminal.<br/>
            👉 <a href="https://apps.microsoft.com/detail/9n0dx20hk701" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Download Windows Terminal here</a> (Recommended for the best experience).
          </li>
          <li className="leading-relaxed">
            <strong>macOS / Linux Users</strong> — You can use your built-in <strong>Terminal</strong> app. No extra downloads needed.
          </li>
        </ul>
        <InfoBox>
          ✅ <strong>How to check if it's installed:</strong> Open your terminal and type <code className="font-mono bg-muted/50 px-1 rounded text-foreground">node -v</code> and press Enter. If it prints a version number (like <code className="font-mono text-xs">v18.17.0</code> or higher), you are ready to go!
        </InfoBox>
      </>
    ),
  },
  {
    id: 'installation',
    title: 'Installation',
    icon: Download,
    keywords: 'install npm npx bun pnpm global awartsrc config update cli terminal',
    content: (
      <>
        <Heading3>Install the CLI</Heading3>
        <Para>The fastest way to get started is with npx (no install needed):</Para>
        <CodeBlock title="Terminal">{`npx awarts@latest`}</CodeBlock>
        <Para>Or install globally:</Para>
        <CodeBlock title="Terminal">{`npm install -g awarts\n# or\nbun add -g awarts`}</CodeBlock>

        <Heading3>First Run & Authentication</Heading3>
        <Para>On first run, the CLI opens your browser for a quick login — no API keys needed:</Para>
        <CodeBlock title="Terminal">{`npx awarts@latest login\n# Opens browser → click Authorize → done!`}</CodeBlock>
        <Para>Your credentials are stored securely at <code className="font-mono bg-muted px-1 rounded text-foreground">~/.awarts/auth.json</code> (file permissions 0600, owner-only).</Para>

        <Heading3>How It Works (No API Keys!)</Heading3>
        <Para>
          AWARTS reads usage data directly from local files that your AI tools already create. <strong>You never need to share your provider API keys.</strong> The CLI scans these local directories:
        </Para>
        <CodeBlock title="Where your data lives">{`Claude:      ~/.claude/stats-cache.json
Codex:       ~/.codex/usage/ or ~/.openai-codex/usage/
Gemini:      ~/.gemini/usage/ or ~/.config/gemini/usage/
Antigravity: ~/.antigravity/usage/`}</CodeBlock>
        <InfoBox>
          🔐 <strong>Your API keys stay on your machine.</strong> AWARTS only reads token counts, costs, and model names from local cache files — it never accesses your provider APIs or sends your keys anywhere.
        </InfoBox>

        <Heading3>Updating the CLI</Heading3>
        <CodeBlock title="Terminal">{`npm update -g awarts\n# or just use npx — it always fetches the latest`}</CodeBlock>

        <InfoBox>
          💡 <strong>Tip:</strong> If you use <code className="font-mono">npx</code>, you're always on the latest version automatically.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'providers',
    title: 'Providers',
    icon: Cpu,
    keywords: 'claude codex gemini antigravity session multi provider polyglot local files no api key',
    content: (
      <>
        <Para>AWARTS supports four AI coding providers. Each is auto-detected from local files — <strong>no API keys required.</strong></Para>

        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('h-3 w-3 rounded-full', PROVIDERS.claude.dotClass)} />
            <h3 className="text-lg font-semibold text-foreground">Claude</h3>
          </div>
          <Para>Reads from <code className="font-mono bg-muted px-1 rounded text-foreground">~/.claude/stats-cache.json</code> — a file Claude Code maintains automatically. Includes per-day output tokens by model, aggregate input/cache/cost totals, and session activity counts.</Para>
          <CodeBlock title="Auto-detected data">{`# No setup needed! Just use Claude Code normally.
# AWARTS reads: tokens, costs, models, daily activity
awarts sync  # detects Claude automatically`}</CodeBlock>
        </div>

        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('h-3 w-3 rounded-full', PROVIDERS.codex.dotClass)} />
            <h3 className="text-lg font-semibold text-foreground">Codex (OpenAI)</h3>
          </div>
          <Para>Reads daily usage files from <code className="font-mono bg-muted px-1 rounded text-foreground">~/.codex/usage/</code>. If you use the OpenAI Codex CLI, it creates these files automatically. Costs are estimated from token counts using published pricing.</Para>
          <InfoBox>
            <strong>No sessions showing for Codex?</strong> Try one of these options:
          </InfoBox>
          <div className="ml-2 space-y-3 my-3">
            <div>
              <p className="text-sm font-medium text-foreground">Option 1: Use the OpenAI Codex CLI</p>
              <Para>Install the <a href="https://github.com/openai/codex" className="text-primary underline" target="_blank" rel="noopener noreferrer">OpenAI Codex CLI</a> and complete a coding session. It auto-creates usage files at <code className="font-mono bg-muted px-1 rounded text-foreground">~/.codex/usage/</code>.</Para>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Option 2: Create usage files manually</p>
              <CodeBlock title="macOS / Linux">{`mkdir -p ~/.codex/usage
cat > ~/.codex/usage/$(date +%Y-%m-%d).json << 'EOF'
{
  "date": "2026-03-10",
  "input_tokens": 15000,
  "output_tokens": 32000,
  "models": ["codex-1"],
  "cost_usd": 0.42
}
EOF`}</CodeBlock>
              <CodeBlock title="Windows (PowerShell)">{`New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.codex\\usage"

@'
{
  "date": "2026-03-10",
  "input_tokens": 15000,
  "output_tokens": 32000,
  "models": ["codex-1"],
  "cost_usd": 0.42
}
'@ | Set-Content "$env:USERPROFILE\\.codex\\usage\\2026-03-10.json"`}</CodeBlock>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Option 3: Web import</p>
              <Para>Go to <strong>Settings → Import</strong> and upload a JSON or CSV file with your Codex usage data.</Para>
            </div>
          </div>
        </div>

        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('h-3 w-3 rounded-full', PROVIDERS.gemini.dotClass)} />
            <h3 className="text-lg font-semibold text-foreground">Gemini</h3>
          </div>
          <Para>Reads from <code className="font-mono bg-muted px-1 rounded text-foreground">~/.gemini/usage/</code> or <code className="font-mono bg-muted px-1 rounded text-foreground">~/.config/gemini/usage/</code>. Costs are estimated from token counts using published pricing.</Para>
          <InfoBox>
            <strong>No sessions showing for Gemini?</strong> Try one of these options:
          </InfoBox>
          <div className="ml-2 space-y-3 my-3">
            <div>
              <p className="text-sm font-medium text-foreground">Option 1: Use a local Gemini CLI tool</p>
              <Para>If your Gemini CLI writes to <code className="font-mono bg-muted px-1 rounded text-foreground">~/.gemini/usage/</code>, data is detected automatically.</Para>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Option 2: Create usage files manually</p>
              <CodeBlock title="macOS / Linux">{`mkdir -p ~/.gemini/usage
cat > ~/.gemini/usage/$(date +%Y-%m-%d).json << 'EOF'
{
  "date": "2026-03-10",
  "input_tokens": 20000,
  "output_tokens": 30000,
  "models": ["gemini-2.5-pro"],
  "cost_usd": 0.35
}
EOF`}</CodeBlock>
              <CodeBlock title="Windows (PowerShell)">{`New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.gemini\\usage"

@'
{
  "date": "2026-03-10",
  "input_tokens": 20000,
  "output_tokens": 30000,
  "models": ["gemini-2.5-pro"],
  "cost_usd": 0.35
}
'@ | Set-Content "$env:USERPROFILE\\.gemini\\usage\\2026-03-10.json"`}</CodeBlock>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Option 3: Web import</p>
              <Para>Go to <strong>Settings → Import</strong> and upload a JSON or CSV file with your Gemini usage data.</Para>
            </div>
          </div>
        </div>

        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('h-3 w-3 rounded-full', PROVIDERS.antigravity.dotClass)} />
            <h3 className="text-lg font-semibold text-foreground">Antigravity</h3>
          </div>
          <Para>Reads from <code className="font-mono bg-muted px-1 rounded text-foreground">~/.antigravity/usage/</code>. Costs are estimated from token counts when not provided in usage files.</Para>
          <InfoBox>
            <strong>No sessions showing for Antigravity?</strong> Try one of these options:
          </InfoBox>
          <div className="ml-2 space-y-3 my-3">
            <div>
              <p className="text-sm font-medium text-foreground">Option 1: Use the Antigravity CLI</p>
              <Para>Complete a session with the Antigravity CLI. It stores usage data at <code className="font-mono bg-muted px-1 rounded text-foreground">~/.antigravity/usage/</code>.</Para>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Option 2: Create usage files manually</p>
              <CodeBlock title="macOS / Linux">{`mkdir -p ~/.antigravity/usage
cat > ~/.antigravity/usage/$(date +%Y-%m-%d).json << 'EOF'
{
  "date": "2026-03-10",
  "input_tokens": 15000,
  "output_tokens": 25000,
  "models": ["antigravity-1"],
  "cost_usd": 0.40
}
EOF`}</CodeBlock>
              <CodeBlock title="Windows (PowerShell)">{`New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.antigravity\\usage"

@'
{
  "date": "2026-03-10",
  "input_tokens": 15000,
  "output_tokens": 25000,
  "models": ["antigravity-1"],
  "cost_usd": 0.40
}
'@ | Set-Content "$env:USERPROFILE\\.antigravity\\usage\\2026-03-10.json"`}</CodeBlock>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Option 3: Web import</p>
              <Para>Go to <strong>Settings → Import</strong> and upload a JSON or CSV file with your Antigravity usage data.</Para>
            </div>
          </div>
        </div>

        <div className="my-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={cn('h-3 w-3 rounded-full', PROVIDERS.cursor.dotClass)} />
            <h3 className="text-lg font-semibold text-foreground">Cursor</h3>
          </div>
          <Para>
            Reads from <code className="font-mono bg-muted px-1 rounded text-foreground">~/.awarts/cursor-usage.json</code>, Cursor usage CSV exports, or the AWARTS Cursor extension. Agent/model metadata is stored in <code className="font-mono bg-muted px-1 rounded text-foreground">raw_data</code> for the Counter dashboard.
          </Para>
          <CodeBlock title="cursor-usage.json">{`{
  "daily": [{
    "date": "2026-05-23",
    "input_tokens": 12000,
    "output_tokens": 8000,
    "cost_usd": 2.40,
    "models": ["claude-sonnet-4", "cursor-small"],
    "agents": { "composer": 5, "chat": 12 },
    "subscription": "pro"
  }]
}`}</CodeBlock>
        </div>

        <Heading3>Can't find local files? Use Settings → Import</Heading3>
        <Para>
          If your provider doesn't create local usage files (e.g., you only use it via web), you can always import sessions manually from the <strong>Settings → Import</strong> tab. Supported formats:
        </Para>
        <CodeBlock title="JSON import format">{`[
  {
    "date": "2026-03-10",
    "provider": "codex",
    "cost_usd": 0.42,
    "input_tokens": 15000,
    "output_tokens": 32000,
    "models": ["codex-1"]
  },
  {
    "date": "2026-03-09",
    "provider": "gemini",
    "cost_usd": 0.35,
    "input_tokens": 20000,
    "output_tokens": 30000,
    "models": ["gemini-2.5-pro"]
  }
]`}</CodeBlock>
        <CodeBlock title="CSV import format">{`date,provider,cost_usd,input_tokens,output_tokens,models
2026-03-10,codex,0.42,15000,32000,codex-1
2026-03-09,gemini,0.35,20000,30000,gemini-2.5-pro`}</CodeBlock>

        <Heading3>Multi-Provider Sessions</Heading3>
        <Para>
          If you switch between providers during a single work period, AWARTS tracks each provider segment separately but groups them under one "work session" on your profile. Your contribution graph shows the dominant provider per day by color.
        </Para>
        <InfoBox>
          🌐 <strong>Polyglot Coder:</strong> Use 2+ providers to unlock the Polyglot achievement. Use all 4 for Full Stack AI!
        </InfoBox>
      </>
    ),
  },
  {
    id: 'core-concepts',
    title: 'Core Concepts',
    icon: Layers,
    keywords: 'sessions tokens cost pricing streak input output model heatmap contribution',
    content: (
      <>
        <Heading3>Sessions</Heading3>
        <Para>
          A session is a single continuous interaction with an AI provider. It starts when you send your first message and ends after 1 hour of inactivity or when you explicitly close the conversation. Each session records:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li>Provider (Claude, Codex, Gemini, or Antigravity)</li>
          <li>Start and end timestamps</li>
          <li>Input and output token counts</li>
          <li>Estimated cost based on the model's pricing</li>
          <li>Model identifier (e.g., claude-4-sonnet, codex-1, gemini-2.5-pro)</li>
        </ul>

        <Heading3>Tokens</Heading3>
        <Para>
          Tokens are the fundamental unit of AI usage. <strong>Input tokens</strong> are what you send to the model (your prompts, code context, file contents). <strong>Output tokens</strong> are what the model generates (responses, code, explanations).
        </Para>
        <Para>
          AWARTS displays output tokens prominently since they represent the AI's actual work. The leaderboard ranks by total output tokens by default.
        </Para>

        <Heading3>Cost Tracking</Heading3>
        <Para>
          Cost is calculated using each provider's published pricing at the time of the session. AWARTS stores the per-token rate alongside each session so historical costs remain accurate even after pricing changes.
        </Para>
        <TableWrapper
          headers={['Provider', 'Input (per 1M)', 'Output (per 1M)', 'Example Session']}
          rows={[
            ['Claude Sonnet 4.5', '$3.00', '$15.00', '~$0.41 for 10K in / 25K out'],
            ['GPT-4.1', '$2.00', '$8.00', '~$0.27 for 15K in / 30K out'],
            ['Gemini 2.5 Pro', '$1.25', '$10.00', '~$0.33 for 20K in / 30K out'],
            ['Antigravity', '$2.50', '$12.00', '~$0.34 for 15K in / 25K out'],
          ]}
        />

        <Heading3>Streaks</Heading3>
        <Para>
          A streak counts consecutive days with at least one synced session. Streaks reset at midnight in your local timezone. Missing a single day resets your streak to 0.
        </Para>
        <InfoBox>
          🔥 <strong>Streak milestones:</strong> 7 days → Week Warrior badge. 30 days → Power User badge. Your current streak is shown on your profile card.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'dashboard',
    title: 'Dashboard Guide',
    icon: LayoutDashboard,
    keywords: 'feed leaderboard profile recap counter search following global kudos comment activity token cache usage',
    content: (
      <>
        <Heading3>Feed</Heading3>
        <Para>
          The Feed shows recent sessions from developers you follow, or globally. Each activity card shows the provider, token counts, cost, and a relative timestamp. You can:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li>Toggle between <strong>Following</strong> and <strong>Global</strong> views</li>
          <li>Give kudos (👏) to impressive sessions</li>
          <li>Comment on activity cards</li>
          <li>Click through to see full session details</li>
        </ul>

        <Heading3>Leaderboard</Heading3>
        <Para>
          The leaderboard ranks developers by total output tokens. Filter by:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li><strong>Time period:</strong> Today, This Week, This Month, All Time</li>
          <li><strong>Region:</strong> Global or by country</li>
          <li><strong>Provider:</strong> All, Claude, Codex, Gemini, or Antigravity</li>
        </ul>

        <Heading3>Profile</Heading3>
        <Para>
          Your profile page displays: stats grid (total spend, output tokens, sessions, streak), a contribution graph (GitHub-style heatmap showing daily activity), provider breakdown, and earned achievements.
        </Para>

        <Heading3>Recap</Heading3>
        <Para>
          Generate a shareable recap card summarizing your AWARTS stats. Choose a time period, customize the theme, and export as an image to share on social media. The recap includes top stats, provider split, and your best streak.
        </Para>

        <Heading3>Counter</Heading3>
        <Para>
          The Counter dashboard shows real-time token consumption metrics:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li><strong>Today:</strong> Token count, input/output breakdown, cost, and models used</li>
          <li><strong>This Week:</strong> Active days, today vs peak comparison, 7-day trend sparkline</li>
          <li><strong>Cache Efficiency:</strong> Cache hit rate (reads vs writes) for prompt caching savings</li>
          <li><strong>Provider Breakdown:</strong> Per-provider token usage with color-coded progress bars</li>
          <li><strong>All Time:</strong> Lifetime totals for tokens, cost, and cache savings</li>
        </ul>

        <Heading3>Search</Heading3>
        <Para>
          Find other developers by username. Search results show user cards with their stats, provider badges, and verification status. Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">/</kbd> anywhere to jump to search.
        </Para>
      </>
    ),
  },
  {
    id: 'achievements',
    title: 'Achievements',
    icon: Award,
    keywords: 'badge milestone unlock earned trophy permanent streak week warrior power user',
    content: (
      <>
        <Para>
          Achievements are badges earned by hitting specific milestones. There are {ACHIEVEMENTS.length} achievements in total. They appear on your profile once unlocked.
        </Para>
        <div className="grid sm:grid-cols-2 gap-2 my-4">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-md border border-border bg-card p-3">
              <span className="text-2xl">{a.emoji}</span>
              <div>
                <p className="text-sm font-medium text-foreground">{a.name}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
            </div>
          ))}
        </div>
        <InfoBox>
          🏆 Achievements are checked on every sync. Once earned, they're permanent and can't be lost — even if your stats later decrease.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'streak-levels',
    title: 'Streak Levels',
    icon: Award,
    keywords: 'streak level L1 L2 L3 L4 L5 L6 L7 L8 rookie starter regular dedicated committed veteran elite legend tier badge',
    content: (
      <>
        <Para>
          Streak Levels are a tiered badge system based on your total active days on AWARTS. They appear next to your username on your profile, leaderboard, and feed cards.
        </Para>
        <TableWrapper
          headers={['Level', 'Active Days', 'Label', 'Badge Color']}
          rows={[
            ['L1', '1+', 'Rookie', 'Gray'],
            ['L2', '7+', 'Starter', 'Gray'],
            ['L3', '14+', 'Regular', 'Blue'],
            ['L4', '30+', 'Dedicated', 'Blue'],
            ['L5', '60+', 'Committed', 'Purple'],
            ['L6', '100+', 'Veteran', 'Purple'],
            ['L7', '200+', 'Elite', 'Gold'],
            ['L8', '365+', 'Legend', 'Gold'],
          ]}
        />
        <InfoBox>
          🎯 <strong>Levels never decrease.</strong> Once you reach a level, it's permanent — even if you take a break. Keep pushing to unlock higher tiers!
        </InfoBox>
      </>
    ),
  },
  {
    id: 'rest-api',
    title: 'REST API & MCP',
    icon: Code2,
    keywords: 'api rest mcp model context protocol api key bearer usage leaderboard open stats v1',
    content: (
      <>
        <Heading3>REST API (v1)</Heading3>
        <Para>
          Public HTTP endpoints on the AWARTS backend. Authenticated routes accept{' '}
          <code className="font-mono bg-muted px-1 rounded text-foreground">Authorization: Bearer aw_live_…</code>{' '}
          (API keys from Settings) or your CLI JWT from <code className="font-mono bg-muted px-1 rounded text-foreground">awarts login</code>.
        </Para>
        <TableWrapper
          headers={['Method', 'Path', 'Auth', 'Description']}
          rows={[
            ['GET', '/api/v1/open-stats', 'No', 'Global platform aggregates'],
            ['GET', '/api/v1/users/:username', 'Optional', 'Public profile + stats'],
            ['GET', '/api/v1/users/:username/usage', 'Optional', 'Daily usage rows'],
            ['GET', '/api/v1/me', 'Yes', 'Your profile + stats'],
            ['GET', '/api/v1/leaderboard', 'No', 'Leaderboard (?period=&provider=)'],
            ['POST', '/api/v1/usage', 'Yes', 'Submit usage entries'],
            ['GET', '/api/v1/mcp/logs', 'Yes', 'MCP tool call audit log'],
            ['POST', '/api/v1/mcp/log', 'Yes', 'Log an MCP tool invocation'],
          ]}
        />
        <CodeBlock title="Health check">{`curl https://awarts.club/api/v1/health`}</CodeBlock>
        <CodeBlock title="Submit usage">{`curl -X POST https://awarts.club/api/v1/usage \\
  -H "Authorization: Bearer aw_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"source":"api","entries":[{"date":"2026-05-23","provider":"cursor","cost_usd":1.2,"input_tokens":5000,"output_tokens":3000,"models":["claude-sonnet-4"]}]}'`}</CodeBlock>
        <Para>
          OpenAPI spec: <a href="/openapi.json" className="text-primary hover:underline">/openapi.json</a>
        </Para>

        <Heading3>MCP Server (@awarts/mcp)</Heading3>
        <Para>
          Install the official Model Context Protocol server in Cursor, Claude Desktop, or any MCP client:
        </Para>
        <CodeBlock title="MCP client config">{`{
  "mcpServers": {
    "awarts": {
      "command": "npx",
      "args": ["-y", "@awarts/mcp@latest"],
      "env": { "AWARTS_API_KEY": "aw_live_YOUR_KEY" }
    }
  }
}`}</CodeBlock>
        <Para>Tools: <code className="font-mono text-xs">awarts_get_my_stats</code>, <code className="font-mono text-xs">awarts_get_user</code>, <code className="font-mono text-xs">awarts_submit_usage</code>, <code className="font-mono text-xs">awarts_get_leaderboard</code>, <code className="font-mono text-xs">awarts_get_mcp_logs</code>, and more.</Para>
      </>
    ),
  },
  {
    id: 'scorecard-embed',
    title: 'Scorecard Embed',
    icon: Code2,
    keywords: 'embed badge svg scorecard github readme profile card image API endpoint dark light compact',
    content: (
      <>
        <Heading3>Embeddable SVG Scorecard</Heading3>
        <Para>
          Add your AWARTS stats to your GitHub README, portfolio, or blog with an embeddable SVG badge. The badge updates automatically every hour.
        </Para>

        <Heading3>Usage</Heading3>
        <Para>Add this to your GitHub README (replace <code className="font-mono bg-muted px-1 rounded text-foreground">USERNAME</code> with your AWARTS username):</Para>
        <CodeBlock title="Markdown">{`![AWARTS Stats](https://awarts.club/api/embed?username=USERNAME&theme=dark)`}</CodeBlock>

        <Heading3>Parameters</Heading3>
        <TableWrapper
          headers={['Parameter', 'Values', 'Default']}
          rows={[
            ['username', 'Your AWARTS username', '(required)'],
            ['theme', 'dark, light', 'light'],
            ['compact', '1 (compact badge)', '0 (full card)'],
          ]}
        />

        <Heading3>Examples</Heading3>
        <CodeBlock title="Full card (dark)">{`![AWARTS](https://awarts.club/api/embed?username=USERNAME&theme=dark)`}</CodeBlock>
        <CodeBlock title="Compact badge">{`![AWARTS](https://awarts.club/api/embed?username=USERNAME&compact=1)`}</CodeBlock>

        <InfoBox>
          💡 <strong>Tip:</strong> You can also find your personalized embed code in <strong>Settings → Scorecard Embed</strong>.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'cli-reference',
    title: 'CLI Reference',
    icon: TerminalSquare,
    keywords: 'sync status export config whoami logout daemon start stop logs flags verbose provider format since dry-run interval environment variables debug',
    content: (
      <>
        <Para>The AWARTS CLI is your primary interface for syncing session data. Here are all available commands:</Para>

        <TableWrapper
          headers={['Command', 'Description', 'Example']}
          rows={[
            ['awarts sync', 'Sync all new sessions to AWARTS', 'awarts sync'],
            ['awarts sync --provider claude', 'Sync only a specific provider', 'awarts sync -p claude'],
            ['awarts status', 'Show current streak, last sync, pending sessions', 'awarts status'],
            ['awarts export', 'Export all session data as JSON or CSV', 'awarts export --format csv'],
            ['awarts config', 'View or edit configuration', 'awarts config set autoSync true'],
            ['awarts whoami', 'Show current logged-in user', 'awarts whoami'],
            ['awarts logout', 'Clear stored credentials', 'awarts logout'],
            ['awarts daemon start', 'Start background auto-sync daemon', 'awarts daemon start --interval 10'],
            ['awarts daemon stop', 'Stop the background daemon', 'awarts daemon stop'],
            ['awarts daemon status', 'Check if daemon is running', 'awarts daemon status'],
            ['awarts daemon logs', 'View recent daemon log output', 'awarts daemon logs -n 100'],
          ]}
        />

        <Heading3>Flags & Options</Heading3>
        <TableWrapper
          headers={['Flag', 'Description', 'Default']}
          rows={[
            ['--provider, -p', 'Filter by provider (claude, codex, gemini, antigravity, cursor)', 'all'],
            ['--format, -f', 'Output format for export (json, csv)', 'json'],
            ['--since', 'Only sync sessions after this date', '(last sync)'],
            ['--dry-run', 'Preview what would be synced without posting', 'false'],
            ['--verbose, -v', 'Show detailed output', 'false'],
            ['--quiet, -q', 'Suppress all output', 'false'],
            ['--interval', 'Sync interval in minutes (daemon start)', '5'],
          ]}
        />

        <Heading3>Environment Variables</Heading3>
        <CodeBlock title="Shell">{`# Override config directory
export AWARTS_HOME="~/custom/.awarts"

# Enable debug logging
export AWARTS_DEBUG=1

# Set custom API endpoint (self-hosted)
export AWARTS_API_URL="https://api.your-server.com"`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'sync-daemon',
    title: 'Sync Daemon',
    icon: TerminalSquare,
    keywords: 'daemon background auto sync automatic interval start stop status logs systemd launchd cron persistent',
    content: (
      <>
        <Para>
          The sync daemon runs in the background and automatically syncs your sessions at a configurable interval. This means you never have to manually run <code className="font-mono bg-muted px-1 rounded text-foreground">awarts sync</code> — your sessions appear on the dashboard in near real-time.
        </Para>

        <Heading3>Starting the Daemon</Heading3>
        <CodeBlock title="Terminal">{`# Start with default interval (1 hour)
awarts daemon start

# Start with custom interval (every 10 minutes)
awarts daemon start --interval 10

# Start with specific provider only
awarts daemon start --provider claude`}</CodeBlock>

        <InfoBox>
          💡 <strong>Recommended:</strong> Run <code className="font-mono">awarts daemon start</code> once after installing the CLI. It persists across terminal sessions and restarts automatically if it crashes.
        </InfoBox>

        <Heading3>Managing the Daemon</Heading3>
        <TableWrapper
          headers={['Command', 'Description']}
          rows={[
            ['awarts daemon start', 'Start the background sync daemon'],
            ['awarts daemon stop', 'Stop the running daemon'],
            ['awarts daemon status', 'Check if the daemon is running and show last sync time'],
            ['awarts daemon logs', 'View recent sync logs (last 50 entries)'],
            ['awarts daemon logs -n 100', 'View more log entries'],
          ]}
        />

        <Heading3>How It Works</Heading3>
        <Para>
          When started, the daemon forks a background process that:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li>Scans all enabled provider session directories for new/updated sessions</li>
          <li>Deduplicates sessions by their provider-assigned IDs</li>
          <li>Batches and uploads new sessions to the AWARTS API</li>
          <li>Writes a PID file to <code className="font-mono bg-muted px-1 rounded text-foreground">~/.awarts/daemon.pid</code></li>
          <li>Logs all activity to <code className="font-mono bg-muted px-1 rounded text-foreground">~/.awarts/daemon.log</code></li>
        </ul>

        <Heading3>Keeping the Daemon Running</Heading3>
        <Para>
          The daemon runs as long as your system is on. If your machine reboots, you'll need to restart it. To auto-start the daemon on boot:
        </Para>
        <CodeBlock title="macOS (launchd)">{`# Create a launch agent
awarts daemon install

# This creates ~/Library/LaunchAgents/com.awarts.daemon.plist
# The daemon will start automatically on login`}</CodeBlock>
        <CodeBlock title="Linux (systemd)">{`# Create a systemd user service
awarts daemon install

# This creates ~/.config/systemd/user/awarts.service
# Enable with: systemctl --user enable awarts`}</CodeBlock>
        <CodeBlock title="Windows (Task Scheduler)">{`# Register a scheduled task
awarts daemon install

# This creates a Task Scheduler entry that runs on login`}</CodeBlock>

        <InfoBox>
          🔄 <strong>Without the daemon:</strong> You can still sync manually anytime with <code className="font-mono">awarts sync</code>. The daemon is optional but recommended for the best experience — your feed updates automatically and your streak never gets missed.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'api-reference',
    title: 'API Reference',
    icon: Code2,
    keywords: 'rest api authentication bearer endpoint sessions leaderboard kudos rate limit curl post get',
    content: (
      <>
        <Para>The AWARTS REST API lets you programmatically access your data. Authentication uses JWT tokens issued via the CLI login flow.</Para>

        <Heading3>Authentication</Heading3>
        <Para>The CLI automatically handles auth via device code flow. For direct API access, use the JWT token from <code className="font-mono bg-muted px-1 rounded text-foreground">~/.awarts/auth.json</code>:</Para>
        <CodeBlock title="HTTP Header">{`Authorization: Bearer <your-jwt-token>`}</CodeBlock>

        <Heading3>Base URL</Heading3>
        <CodeBlock>{`https://api.awarts.com/v1`}</CodeBlock>

        <Heading3>Endpoints</Heading3>
        <TableWrapper
          headers={['Method', 'Endpoint', 'Description']}
          rows={[
            ['GET', '/me', 'Get current user profile'],
            ['GET', '/users/:username', 'Get a user\'s public profile'],
            ['GET', '/users/:username/sessions', 'List user sessions (paginated)'],
            ['POST', '/sessions', 'Create a new session (used by CLI)'],
            ['GET', '/leaderboard', 'Get leaderboard (supports ?period, ?region, ?provider)'],
            ['GET', '/feed', 'Get global or following feed'],
            ['POST', '/sessions/:id/kudos', 'Give kudos to a session'],
            ['DELETE', '/sessions/:id/kudos', 'Remove kudos'],
          ]}
        />

        <Heading3>Example: Get Your Profile</Heading3>
        <CodeBlock title="curl">{`curl -H "Authorization: Bearer aw_xxx" \\
  https://api.awarts.com/v1/me

# Response
{
  "username": "alexdev",
  "totalSpend": 1284.50,
  "totalOutputTokens": 48230000,
  "totalSessions": 342,
  "currentStreak": 23,
  "providers": ["claude", "codex"],
  "verified": true
}`}</CodeBlock>

        <Heading3>Example: Submit a Session</Heading3>
        <CodeBlock title="curl">{`curl -X POST -H "Authorization: Bearer aw_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "provider": "claude",
    "model": "claude-4-sonnet",
    "inputTokens": 12400,
    "outputTokens": 34200,
    "cost": 0.62,
    "startedAt": "2026-02-23T10:00:00Z",
    "endedAt": "2026-02-23T10:45:00Z"
  }' \\
  https://api.awarts.com/v1/sessions`}</CodeBlock>

        <Heading3>Rate Limits</Heading3>
        <Para>
          API requests are limited to <strong>100 requests per minute</strong> per API key. The CLI's sync command batches sessions efficiently and should never hit this limit under normal usage. Rate limit headers:
        </Para>
        <CodeBlock>{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
X-RateLimit-Reset: 1708700000`}</CodeBlock>
      </>
    ),
  },
  {
    id: 'privacy',
    title: 'Privacy & Data',
    icon: Shield,
    keywords: 'data collected public private profile export delete account code prompts safety security',
    content: (
      <>
        <Heading3>What Data is Collected</Heading3>
        <Para>AWARTS collects only session metadata — never your actual code or conversation content. Specifically:</Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li>Session start/end timestamps</li>
          <li>Provider and model identifier</li>
          <li>Input and output token counts</li>
          <li>Estimated cost</li>
          <li>Your username and country (set during onboarding)</li>
        </ul>
        <InfoBox>
          🔒 <strong>No code, prompts, or API keys are ever sent.</strong> AWARTS reads only token counts and costs from local cache files — it never accesses your provider APIs, prompts, or generated code. Your API keys stay on your machine.
        </InfoBox>

        <Heading3>Public vs Private Profiles</Heading3>
        <Para>
          By default, your profile is public — anyone can see your stats, contribution graph, and achievements. You can make your profile private in Settings → Privacy. Private profiles:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li>Don't appear in search results</li>
          <li>Don't appear on the leaderboard</li>
          <li>Activity cards are only visible to followers</li>
          <li>Your profile URL returns a "Private Profile" message to non-followers</li>
        </ul>

        <Heading3>Data Export & Deletion</Heading3>
        <Para>
          You can export all your data at any time via the CLI or Settings page:
        </Para>
        <CodeBlock title="Terminal">{`# Export all data as JSON
awarts export --format json --output my-data.json

# Export as CSV
awarts export --format csv --output my-data.csv`}</CodeBlock>
        <Para>
          To delete your account and all associated data, go to Settings → Danger Zone → Delete Account. This action is irreversible and removes all sessions, achievements, and profile data within 30 days.
        </Para>
      </>
    ),
  },
  {
    id: 'faq',
    title: 'FAQ',
    icon: HelpCircle,
    keywords: 'free cost accurate self-hosted streak reset backfill multiple machines hide sessions team org bug feature request',
    content: (
      <>
        <Para>Common questions from the AWARTS community.</Para>
        <Accordion type="multiple" className="w-full">
          {[
            { q: 'Is AWARTS free?', a: 'Yes! AWARTS is free for individual developers. We may introduce premium features in the future (custom themes, team leaderboards), but core tracking and social features will always be free.' },
            { q: 'Does AWARTS read my code, prompts, or API keys?', a: 'No. AWARTS only reads session metadata (token counts, costs, model names) from local cache files on your machine. Your code, conversations, and provider API keys are never accessed, transmitted, or stored by AWARTS.' },
            { q: 'How accurate are the cost estimates?', a: 'Costs are calculated using each provider\'s published per-token pricing at the time of the session. They should be within 5% of your actual bill. If a provider changes pricing, new sessions reflect the new rates.' },
            { q: 'Can I use AWARTS with a self-hosted LLM?', a: 'Not yet, but it\'s on our roadmap. We plan to support OpenAI-compatible endpoints so you can track usage from local models like Llama or Mistral.' },
            { q: 'What happens if I miss a day — does my streak reset?', a: 'Yes. Streaks count consecutive calendar days (in your local timezone) with at least one synced session. Missing a single day resets it to 0.' },
            { q: 'Can I backfill old sessions?', a: 'Yes! Use `awarts sync --since 2025-01-01` to sync sessions from a specific date. The CLI will scan provider logs for any sessions it hasn\'t already uploaded.' },
            { q: 'How do I connect multiple machines?', a: 'Install the CLI on each machine and run `awarts login`. All machines sync to the same account via browser-based auth. Sessions are deduplicated automatically.' },
            { q: 'Can I hide specific sessions?', a: 'Yes. Go to your Profile, click on any session card, and select "Make Private". Private sessions still count toward your stats but aren\'t visible to others.' },
            { q: 'Is there a team/org version?', a: 'Coming soon! Team leaderboards and organization dashboards are in development. Join the waitlist in Settings → Teams.' },
            { q: 'How do I report a bug or request a feature?', a: 'Open an issue on our GitHub repository or email support@awarts.com. We respond to all reports within 48 hours.' },
          ].map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`}>
              <AccordionTrigger className="text-sm text-left">{item.q}</AccordionTrigger>
              <AccordionContent><p className="text-sm text-muted-foreground">{item.a}</p></AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </>
    ),
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    keywords: 'shortcut hotkey keybind slash search go navigate kudos enter escape modal',
    content: (
      <>
        <Para>Navigate AWARTS faster with these keyboard shortcuts. Available on all pages within the dashboard.</Para>
        <TableWrapper
          headers={['Shortcut', 'Action', 'Scope']}
          rows={[
            ['/', 'Focus search bar', 'Global'],
            ['G then F', 'Go to Feed', 'Global'],
            ['G then L', 'Go to Leaderboard', 'Global'],
            ['G then P', 'Go to Profile', 'Global'],
            ['G then S', 'Go to Settings', 'Global'],
            ['G then D', 'Go to Docs', 'Global'],
            ['G then R', 'Go to Recap', 'Global'],
            ['G then C', 'Go to Counter', 'Global'],
            ['K', 'Give kudos to focused card', 'Feed'],
            ['J / K', 'Navigate between cards', 'Feed'],
            ['Enter', 'Open focused card', 'Feed'],
            ['Esc', 'Close modal / clear search', 'Global'],
            ['? ', 'Show keyboard shortcuts help', 'Global'],
          ]}
        />
        <InfoBox>
          ⌨️ <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 rounded border border-border bg-muted text-xs font-mono">?</kbd> at any time to see an overlay of all available shortcuts.
        </InfoBox>
      </>
    ),
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: Bug,
    keywords: 'no sessions found authentication failed rate limit wrong cost debug verbose support email github issue',
    content: (
      <>
        <Para>Common issues and how to fix them.</Para>

        <Heading3>"No sessions found" after sync</Heading3>
        <Para>
          This usually means the CLI can't find your provider's local usage files. Check that:
        </Para>
        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 mb-3 ml-2">
          <li>You've had at least one coding session with the provider</li>
          <li>The provider stores usage data locally (e.g., <code className="font-mono bg-muted px-1 rounded text-foreground">~/.claude/stats-cache.json</code> for Claude)</li>
          <li>The usage files aren't corrupted — run <code className="font-mono bg-muted px-1 rounded text-foreground">awarts sync --verbose</code> for details</li>
        </ul>
        <CodeBlock title="Debug">{`# Run with verbose output to see what's happening
awarts sync --verbose

# Check your config
awarts config list`}</CodeBlock>

        <Heading3>"Authentication failed"</Heading3>
        <Para>Your auth token may have expired (tokens last 90 days). Re-authenticate:</Para>
        <CodeBlock title="Terminal">{`awarts logout
awarts login`}</CodeBlock>

        <Heading3>"Rate limit exceeded"</Heading3>
        <Para>
          You've sent too many API requests in a short time. Wait 60 seconds and try again. If you're running automated scripts, add delays between requests.
        </Para>

        <Heading3>Sessions showing wrong cost</Heading3>
        <Para>
          Cost is calculated at sync time using the provider's current pricing. If pricing changed between when you had the session and when you synced, costs may differ from your actual bill. Sync promptly for the most accurate costs.
        </Para>

        <Heading3>CLI debug mode</Heading3>
        <CodeBlock title="Terminal">{`# Enable debug logging for maximum detail
export AWARTS_DEBUG=1
awarts sync --verbose

# This will show:
# - Config file location and contents
# - Provider session directories scanned
# - Each session found with full metadata
# - API requests and responses
# - Any errors with stack traces`}</CodeBlock>

        <Heading3>Still stuck?</Heading3>
        <Para>
          Reach out to us at <strong>support@awarts.com</strong> or open an issue on GitHub. Include the output of <code className="font-mono bg-muted px-1 rounded text-foreground">awarts status --verbose</code> for faster debugging.
        </Para>
      </>
    ),
  },
];

export default function Docs() {
  const [search, setSearch] = useState('');
  const [activeSectionId, setActiveSectionId] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return sections.find((s) => s.id === hash)?.id ?? sections[0].id;
  });
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = search.trim()
    ? sections.filter((s) => {
        const q = search.toLowerCase();
        return s.title.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q);
      })
    : sections;

  const scrollToSection = (id: string) => {
    setActiveSectionId(id);
    window.history.replaceState(null, '', `#${id}`);
    const el = document.getElementById(`docs-${id}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Scroll to hash section on mount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      const el = document.getElementById(`docs-${hash}`);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    }
  }, []);

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    sections.forEach((s) => {
      const el = document.getElementById(`docs-${s.id}`);
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSectionId(s.id);
            window.history.replaceState(null, '', `#${s.id}`);
          }
        },
        { root: contentRef.current, rootMargin: '-80px 0px -60% 0px', threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <AppShell>
      <SEO title="Documentation — Getting Started, CLI, API" description="Complete AWARTS documentation: installation, CLI reference, API docs, provider setup, achievements, keyboard shortcuts, and troubleshooting." canonical="/docs" keywords="AWARTS docs, CLI reference, API documentation, AI coding tracker setup" />
      <div className="max-w-5xl mx-auto flex gap-8 flex-1 h-full min-h-0 max-lg:h-auto max-lg:block px-4">
        {/* Desktop TOC */}
        <aside className="hidden lg:flex lg:flex-col w-[200px] shrink-0 h-full border-r border-border pr-4 pt-6 overflow-hidden">
          <div className="space-y-1 h-full overflow-y-auto overscroll-contain sidebar-scroll pb-20">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 sticky top-0 bg-background/95 backdrop-blur py-2 z-10">Documentation</p>
            {sections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollToSection(s.id)}
                className={cn(
                  'flex items-center gap-2 w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors',
                  activeSectionId === s.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <s.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{s.title}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 min-h-0 space-y-6 h-full overflow-y-auto overscroll-contain sidebar-scroll lg:px-6 pt-6 pb-20" ref={contentRef}>
          <div className="space-y-4">
            <h1 className="text-2xl font-bold text-foreground">Documentation</h1>

            {/* Mobile TOC */}
            <div className="lg:hidden">
              <Select value={activeSectionId} onValueChange={scrollToSection}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Jump to section..." />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documentation..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Sections */}
          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">No sections match "{search}"</p>
          )}

          {filtered.map((section) => (
            <section
              key={section.id}
              id={`docs-${section.id}`}
              className="scroll-mt-20 rounded-lg border border-border bg-card p-6"
            >
              <div className="flex items-center gap-2 mb-4">
                <section.icon className="h-5 w-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">{section.title}</h2>
              </div>
              {section.content}
            </section>
          ))}

          {/* Back to top */}
          <div className="text-center pb-6">
            <button
              onClick={() => {
                if (contentRef.current) {
                  contentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                  document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="h-4 w-4" /> Back to top
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
