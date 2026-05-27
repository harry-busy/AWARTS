# AWARTS Cursor Usage Sync

Chrome extension that caches Cursor usage from [cursor.com](https://cursor.com) and syncs to AWARTS.

## Install (development)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder
4. Create an API key at [awarts.club/settings](https://awarts.club/settings) → **API & MCP**
5. Open the extension popup, paste your `aw_live_…` key, click **Save & sync now**

## Requirements

- API key with **write** scope
- Visit cursor.com settings/usage pages so the content script can cache data

## CLI alternative

```bash
npx awarts@latest sync
```

Reads `~/.awarts/cursor-usage.json` or Cursor CSV exports from Downloads.
