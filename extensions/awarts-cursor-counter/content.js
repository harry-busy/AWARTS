/**
 * Parses visible usage hints on cursor.com and caches daily rows for background sync.
 */
(function () {
  const today = new Date().toISOString().slice(0, 10);
  const text = document.body?.innerText ?? '';

  const costMatch = text.match(/\$[\d,.]+/);
  const tokenMatch = text.match(/([\d,]+)\s*(?:tokens?|K tokens)/i);

  let inputTokens = 0;
  let outputTokens = 0;
  if (tokenMatch) {
    const n = parseInt(tokenMatch[1].replace(/,/g, ''), 10) || 0;
    outputTokens = n;
    inputTokens = Math.round(n * 0.4);
  }

  const costUsd = costMatch ? parseFloat(costMatch[0].replace(/[$,]/g, '')) || 0 : 0;

  const entry = {
    date: today,
    provider: 'cursor',
    cost_usd: costUsd,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    models: ['cursor-auto'],
    raw_data: JSON.stringify({
      agents: { web: 1 },
      subscription: 'unknown',
      source: 'extension',
    }),
  };

  chrome.storage.local.get(['cursorUsageCache'], (data) => {
    const prev = data.cursorUsageCache?.entries ?? [];
    const map = new Map(prev.map((e) => [`${e.date}:${e.provider}`, e]));
    map.set(`${entry.date}:${entry.provider}`, entry);
    chrome.storage.local.set({
      cursorUsageCache: { entries: [...map.values()], updated_at: new Date().toISOString() },
    });
  });
})();
