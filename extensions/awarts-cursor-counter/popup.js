const API_BASE = 'https://honorable-bee-242.convex.site';

document.getElementById('save').addEventListener('click', async () => {
  const key = document.getElementById('apiKey').value.trim();
  const status = document.getElementById('status');
  if (!key.startsWith('aw_live_')) {
    status.textContent = 'Invalid key format';
    return;
  }
  await chrome.storage.local.set({ awartsApiKey: key });
  status.textContent = 'Syncing…';
  chrome.runtime.sendMessage({ type: 'sync' }, (res) => {
    status.textContent = res?.ok ? `Synced ${res.processed ?? 0} entries` : (res?.error ?? 'Sync failed');
  });
});

chrome.storage.local.get(['awartsApiKey'], (data) => {
  if (data.awartsApiKey) document.getElementById('apiKey').value = data.awartsApiKey;
});
