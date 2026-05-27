const API_BASE = 'https://awarts.club';

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'sync') {
    syncToAwarts().then(sendResponse);
    return true;
  }
});

chrome.alarms?.create?.('awarts-cursor-sync', { periodInMinutes: 60 });
chrome.alarms?.onAlarm?.addListener((alarm) => {
  if (alarm.name === 'awarts-cursor-sync') syncToAwarts();
});

async function syncToAwarts() {
  const { awartsApiKey, cursorUsageCache } = await chrome.storage.local.get([
    'awartsApiKey',
    'cursorUsageCache',
  ]);
  if (!awartsApiKey) return { ok: false, error: 'Set API key in extension popup' };

  const entries = cursorUsageCache?.entries ?? [];
  if (entries.length === 0) {
    return { ok: false, error: 'No usage cached yet — open cursor.com/settings' };
  }

  const res = await fetch(`${API_BASE}/api/v1/usage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${awartsApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ entries, source: 'api' }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? `HTTP ${res.status}` };
  return { ok: true, processed: json.data?.processed };
}
