# @awarts/mcp

Model Context Protocol server for [AWARTS](https://awarts.club) — query leaderboards, read usage stats, and submit sessions from any MCP client (Cursor, Claude Desktop, Windsurf, etc.).

## Setup

1. Create an account at [awarts.club](https://awarts.club)
2. Go to **Settings → API Keys** and create a key
3. Configure your MCP client:

```json
{
  "mcpServers": {
    "awarts": {
      "command": "npx",
      "args": ["-y", "@awarts/mcp@latest"],
      "env": {
        "AWARTS_API_KEY": "aw_live_your_key_here"
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `awarts_get_my_stats` | Your profile + aggregate stats |
| `awarts_get_user` | Public profile by username |
| `awarts_get_user_usage` | Daily usage rows |
| `awarts_get_leaderboard` | Global leaderboard |
| `awarts_get_open_stats` | Platform-wide aggregates |
| `awarts_submit_usage` | Push usage entries |
| `awarts_get_mcp_logs` | MCP call audit log + token estimates |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `AWARTS_API_KEY` | Yes | API key (`aw_live_...`) |
| `AWARTS_API_URL` | No | Override HTTP base URL |

## REST API

The MCP server uses the AWARTS HTTP API (`/api/v1/*`). See [awarts.club/docs](https://awarts.club/docs) for full reference.
