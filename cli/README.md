# awarts

> Track your AI coding spend across Claude, Codex, Gemini & Antigravity.

**AWARTS** (A Worldwide AI Rating & Tracking System) is the Strava for AI-assisted coding. This CLI automatically detects your AI tool usage and syncs it to [awarts.club](https://awarts.club) so you can track spend, compare with others, and climb the leaderboard.

## Install

```bash
npx awarts@latest
```

Or install globally:

```bash
npm i -g awarts
```

### Requirements

- **Node.js 18+** — [Download here](https://nodejs.org)
- **npm** (bundled with Node.js) or [Bun](https://bun.sh)

## Quick Start

```bash
# 1. Authenticate with your AWARTS account
awarts login

# 2. Auto-detect all providers and push usage data
awarts sync

# 3. Start background auto-sync (every 5 minutes)
awarts daemon start
```

## Commands

| Command | Description |
|---------|-------------|
| `awarts login` | Authenticate via device auth flow |
| `awarts sync` | Auto-detect all providers and push data |
| `awarts push` | Push data from specific provider |
| `awarts status` | Show auth status and detected providers |
| `awarts seed` | Generate sample data for testing |
| `awarts daemon start` | Start background auto-sync daemon |
| `awarts daemon stop` | Stop the daemon |
| `awarts daemon status` | Check if daemon is running |
| `awarts daemon logs` | View daemon output |
| `awarts keys set` | Store an API key for a provider |
| `awarts keys list` | List stored keys (masked) |
| `awarts keys remove` | Remove a stored key |
| `awarts logout` | Clear stored credentials |

## Supported Providers

| Provider | Detection | Path |
|----------|-----------|------|
| **Claude** | Auto-detected | `~/.claude/stats-cache.json` |
| **Codex** | Auto-detected | `~/.codex/usage/` |
| **Gemini** | Auto-detected | `~/.gemini/usage/` |
| **Antigravity** | Auto-detected | `~/.antigravity/usage/` |
| **Cursor** | Auto-detected | `~/.awarts/cursor-usage.json` or Cursor CSV export |

### Using Pro subscriptions (no API keys)?

No problem. The CLI reads local files created by your AI tools. No API keys required.

- **Claude Code** usage is auto-detected from `~/.claude/`
- For **Codex**, **Gemini**, and **Antigravity**, place usage files in their respective directories or import via the web at [Settings > Import](https://awarts.club/settings)

## Options

```bash
# Push data for a specific provider only
awarts push --provider claude

# Preview what would be pushed (dry run)
awarts push --dry-run

# Generate 14 days of sample data
awarts seed --days 14

# Set sync interval to 10 minutes
awarts daemon start --interval 10

# Force re-authentication
awarts login --force
```

## API Key Management

Store API keys locally for provider billing data. Keys are stored in `~/.awarts/keys.json` and **never leave your machine**.

```bash
awarts keys set openai sk-...
awarts keys set google AIza...
awarts keys list
awarts keys remove openai
```

## Data Storage

All credentials and keys are stored locally:

| File | Purpose |
|------|---------|
| `~/.awarts/auth.json` | Authentication token |
| `~/.awarts/keys.json` | API keys (local only) |
| `~/.awarts/daemon.pid` | Daemon process ID |
| `~/.awarts/daemon.log` | Daemon log output |

## Web App

View your stats, follow other developers, and climb the leaderboard at:

**[awarts.club](https://awarts.club)**

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) - Harshal Jain (harry.dev)
