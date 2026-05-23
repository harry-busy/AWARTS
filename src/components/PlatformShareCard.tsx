import { forwardRef, useEffect, useState } from 'react';

export type SharePlatform = 'x' | 'instagram' | 'linkedin' | 'whatsapp';

export interface PlatformCardData {
  type: 'session' | 'profile';
  username: string;
  avatarUrl?: string;
  // Session-specific
  cost?: number;
  tokens?: number;
  providers?: string[];
  streak?: number;
  date?: string;
  // Profile-specific
  totalCost?: number;
  totalDays?: number;
  followers?: number;
  // Optional enrichment
  topModel?: string;
  rank?: number;
}

// Platform dimensions
const PLATFORM_SIZE: Record<SharePlatform, { w: number; h: number }> = {
  x: { w: 1200, h: 675 },
  instagram: { w: 1080, h: 1080 },
  linkedin: { w: 1200, h: 627 },
  whatsapp: { w: 800, h: 800 },
};

const PROVIDER_COLORS: Record<string, string> = {
  claude: '#E87A35',
  codex: '#22C55E',
  gemini: '#3B82F6',
  antigravity: '#A855F7',
  cursor: '#06B6D4',
};

const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

function formatCost(n?: number): string {
  return `$${(n ?? 0).toFixed(2)}`;
}

function formatTokens(n?: number): string {
  if (!n) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

/** SVG dot grid as CSS background-image */
function dotGrid(opacity = 0.06, spacing = 32): string {
  return `url("data:image/svg+xml,%3Csvg width='${spacing}' height='${spacing}' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='${spacing / 2}' cy='${spacing / 2}' r='1' fill='rgba(255,255,255,${opacity})'/%3E%3C/svg%3E")`;
}

/** Convert external URL to base64 data URL to avoid CORS issues */
function useDataUrl(url?: string): string | undefined {
  const [dataUrl, setDataUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!url) { setDataUrl(undefined); return; }
    if (url.startsWith('data:')) { setDataUrl(url); return; }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        setDataUrl(canvas.toDataURL('image/png'));
      } catch { setDataUrl(undefined); }
    };
    img.onerror = () => { if (!cancelled) setDataUrl(undefined); };
    img.src = url;
    return () => { cancelled = true; };
  }, [url]);
  return dataUrl;
}

// ── Shared sub-components ────────────────────────────────────────────────

function CardAvatar({ url, username, size, border }: { url?: string; username: string; size: number; border: string }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', border, objectFit: 'cover' }} />;
  }
  const initial = (username[0] ?? '?').toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', border,
      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: size * 0.4, fontWeight: 800,
    }}>{initial}</div>
  );
}

function BrandMark({ color = '#fff', size = 20 }: { color?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: size, height: size * 1.4, background: color, clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }} />
      <span style={{ fontFamily: 'monospace', fontSize: size * 0.9, fontWeight: 700, letterSpacing: 3, color }}>AWARTS</span>
    </div>
  );
}

function ProviderDot({ name }: { name: string }) {
  const color = PROVIDER_COLORS[name.toLowerCase()] ?? '#888';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 20, padding: '5px 14px' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}80` }} />
      <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: 600, textTransform: 'capitalize' as const }}>{name}</span>
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const bg = rank <= 10 ? 'linear-gradient(135deg, #f59e0b, #d97706)' : rank <= 50 ? 'linear-gradient(135deg, #94a3b8, #64748b)' : 'rgba(255,255,255,0.1)';
  const textColor = rank <= 50 ? '#fff' : 'rgba(255,255,255,0.7)';
  return (
    <div style={{
      background: bg, borderRadius: 12, padding: '6px 16px',
      color: textColor, fontSize: 16, fontWeight: 800, fontFamily: 'monospace',
      boxShadow: rank <= 10 ? '0 2px 12px rgba(245,158,11,0.3)' : 'none',
    }}>#{rank}</div>
  );
}

function GlowDivider() {
  return (
    <div style={{
      height: 1, width: '100%',
      background: 'linear-gradient(to right, transparent, rgba(99,102,241,0.5), rgba(168,85,247,0.5), transparent)',
      boxShadow: '0 0 8px rgba(99,102,241,0.2)',
    }} />
  );
}

// ── X Card: Vibrant cinematic landscape ──────────────────────────────────

function XCard({ data }: { data: PlatformCardData & { resolvedAvatar?: string } }) {
  const isSession = data.type === 'session';
  return (
    <div style={{
      width: 1200, height: 675,
      background: 'linear-gradient(135deg, #0f0524 0%, #1a0a3e 30%, #2d1b69 55%, #1e3a5f 80%, #0a2540 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 56, fontFamily: FONT, position: 'relative', overflow: 'hidden', color: '#fff',
    }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: dotGrid(0.04, 28), zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -120, right: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 65%)' }} />
      <div style={{ position: 'absolute', bottom: -100, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 65%)' }} />

      {/* Top: Branding + Rank */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <BrandMark />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {data.topModel && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'monospace' }}>{data.topModel}</span>}
          {data.rank && <RankBadge rank={data.rank} />}
        </div>
      </div>

      {/* Center: Hero Stats */}
      <div style={{ display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
        {isSession ? (
          <>
            <HeroStat label="COST" value={formatCost(data.cost)} accent="#6366f1" />
            <HeroStat label="TOKENS" value={formatTokens(data.tokens)} accent="#8b5cf6" />
            {data.streak ? <HeroStat label="STREAK" value={`${data.streak}d`} accent="#a855f7" /> : null}
          </>
        ) : (
          <>
            <HeroStat label="TOTAL SPENT" value={formatCost(data.totalCost)} accent="#6366f1" />
            <HeroStat label="DAYS ACTIVE" value={String(data.totalDays ?? 0)} accent="#8b5cf6" />
            <HeroStat label="STREAK" value={`${data.streak ?? 0}d`} accent="#a855f7" />
            {data.followers != null && <HeroStat label="FOLLOWERS" value={String(data.followers)} accent="#c084fc" />}
          </>
        )}
      </div>

      {/* Divider */}
      <GlowDivider />

      {/* Bottom: User + Providers + CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <CardAvatar url={data.resolvedAvatar} username={data.username} size={48} border="2px solid rgba(255,255,255,0.2)" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>@{data.username}</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
              {isSession ? (data.date ? `Session · ${data.date}` : 'AI Coding Session') : 'AI Coding Profile'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {(data.providers ?? []).map((p) => <ProviderDot key={p} name={p} />)}
        </div>
        <div style={{
          background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: 20, padding: '8px 20px', color: 'rgba(255,255,255,0.7)', fontSize: 13, fontFamily: 'monospace',
        }}>
          Track yours at awarts.com
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16, padding: '20px 24px', borderTop: `4px solid ${accent}`,
      boxShadow: `0 4px 24px ${accent}20`,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, letterSpacing: 2.5, marginBottom: 8 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 48, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── Instagram Card: Bold centered square ─────────────────────────────────

function InstagramCard({ data }: { data: PlatformCardData & { resolvedAvatar?: string } }) {
  const isSession = data.type === 'session';
  return (
    <div style={{
      width: 1080, height: 1080,
      background: 'radial-gradient(ellipse at 30% 20%, #2d1b69 0%, #1a0a3e 40%, #0f0524 70%, #0a0a18 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 72, fontFamily: FONT, position: 'relative', overflow: 'hidden', color: '#fff',
    }}>
      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: dotGrid(0.03, 24), zIndex: 0 }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 900, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)' }} />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 650, height: 650, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)' }} />
      <div style={{ position: 'absolute', top: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.2) 0%, transparent 70%)' }} />

      {/* Branding */}
      <div style={{ marginBottom: 36, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
        <BrandMark size={22} />
        {data.rank && <RankBadge rank={data.rank} />}
      </div>

      {/* Avatar */}
      <div style={{ marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <div style={{
          width: 148, height: 148, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #6366f1, #a855f7, #ec4899)',
          padding: 4,
        }}>
          <div style={{ borderRadius: '50%', overflow: 'hidden', width: 140, height: 140 }}>
            <CardAvatar url={data.resolvedAvatar} username={data.username} size={140} border="none" />
          </div>
        </div>
      </div>

      {/* Username */}
      <div style={{ fontSize: 44, fontWeight: 800, textAlign: 'center', marginBottom: 6, position: 'relative', zIndex: 1 }}>
        @{data.username}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 17, marginBottom: 40, position: 'relative', zIndex: 1 }}>
        {isSession ? (data.date ? `AI Session · ${data.date}` : 'AI Coding Session') : 'AI Coding Stats'}
      </div>

      {/* Stats grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', maxWidth: 680, position: 'relative', zIndex: 1 }}>
        {isSession ? (
          <>
            <IGStat label="Cost" value={formatCost(data.cost)} accent="#6366f1" />
            <IGStat label="Tokens" value={formatTokens(data.tokens)} accent="#8b5cf6" />
            {data.streak ? <IGStat label="Streak" value={`${data.streak}d`} accent="#a855f7" /> : null}
          </>
        ) : (
          <>
            <IGStat label="Total Spent" value={formatCost(data.totalCost)} accent="#6366f1" />
            <IGStat label="Days Active" value={String(data.totalDays ?? 0)} accent="#8b5cf6" />
            <IGStat label="Streak" value={`${data.streak ?? 0}d`} accent="#a855f7" />
            {data.followers != null && <IGStat label="Followers" value={String(data.followers)} accent="#c084fc" />}
          </>
        )}
      </div>

      {/* Providers */}
      {(data.providers ?? []).length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginTop: 32, flexWrap: 'wrap', justifyContent: 'center', position: 'relative', zIndex: 1 }}>
          {(data.providers ?? []).map((p) => <ProviderDot key={p} name={p} />)}
        </div>
      )}

      {/* Footer CTA */}
      <div style={{
        position: 'absolute', bottom: 36, zIndex: 1,
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 24, padding: '10px 28px',
        color: 'rgba(255,255,255,0.5)', fontSize: 15, fontFamily: 'monospace',
      }}>
        Track yours at awarts.com
      </div>
    </div>
  );
}

function IGStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      width: 200, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 20, padding: '18px 24px', textAlign: 'center',
      borderTop: `3px solid ${accent}`, boxShadow: `0 4px 20px ${accent}15`,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 8 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 40, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── LinkedIn Card: Professional landscape ────────────────────────────────

function LinkedInCard({ data }: { data: PlatformCardData & { resolvedAvatar?: string } }) {
  const isSession = data.type === 'session';
  return (
    <div style={{
      width: 1200, height: 627,
      background: 'linear-gradient(160deg, #0a1628 0%, #131c33 35%, #1a2744 65%, #0f172a 100%)',
      display: 'flex', fontFamily: FONT, position: 'relative', overflow: 'hidden', color: '#fff',
    }}>
      {/* Left accent bar */}
      <div style={{ width: 8, background: 'linear-gradient(to bottom, #3b82f6, #6366f1, #8b5cf6, #a855f7)', flexShrink: 0 }} />

      {/* Background pattern */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: dotGrid(0.03, 36), zIndex: 0 }} />
      <div style={{ position: 'absolute', top: -60, right: -60, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />

      <div style={{ flex: 1, padding: '48px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
        {/* Top: Branding */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <BrandMark size={16} />
            <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginLeft: 4 }}>The Strava for AI Coding</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {data.topModel && <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontFamily: 'monospace' }}>{data.topModel}</span>}
            {data.rank && <RankBadge rank={data.rank} />}
          </div>
        </div>

        {/* Middle: User + Stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, minWidth: 280 }}>
            <CardAvatar url={data.resolvedAvatar} username={data.username} size={76} border="3px solid rgba(255,255,255,0.15)" />
            <div>
              <div style={{ fontSize: 26, fontWeight: 700 }}>@{data.username}</div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 4 }}>
                {isSession ? 'Session Report' : 'Developer Profile'}
              </div>
            </div>
          </div>

          <div style={{ height: 60, width: 1, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />

          <div style={{ display: 'flex', gap: 16, flex: 1 }}>
            {isSession ? (
              <>
                <LIStat label="Cost" value={formatCost(data.cost)} accent="#3b82f6" />
                <LIStat label="Tokens" value={formatTokens(data.tokens)} accent="#6366f1" />
                {data.streak ? <LIStat label="Streak" value={`${data.streak}d`} accent="#8b5cf6" /> : null}
              </>
            ) : (
              <>
                <LIStat label="Total Spent" value={formatCost(data.totalCost)} accent="#3b82f6" />
                <LIStat label="Days Active" value={String(data.totalDays ?? 0)} accent="#6366f1" />
                <LIStat label="Streak" value={`${data.streak ?? 0}d`} accent="#8b5cf6" />
              </>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(to right, rgba(59,130,246,0.3), rgba(99,102,241,0.2), transparent)' }} />

        {/* Bottom: Providers + CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {(data.providers ?? []).map((p) => <ProviderDot key={p} name={p} />)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'monospace' }}>
            Track your AI coding at awarts.com
          </div>
        </div>
      </div>
    </div>
  );
}

function LIStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div style={{
      flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 12, padding: '14px 18px', borderLeft: `3px solid ${accent}`,
    }}>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 34, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── WhatsApp Card: Friendly square with green glow ───────────────────────

function WhatsAppCard({ data }: { data: PlatformCardData & { resolvedAvatar?: string } }) {
  const isSession = data.type === 'session';
  return (
    <div style={{
      width: 800, height: 800,
      background: 'linear-gradient(160deg, #0a1a0a 0%, #0f2b1a 35%, #132e1f 60%, #0a1a12 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      padding: 48, fontFamily: FONT, position: 'relative', overflow: 'hidden', color: '#fff',
    }}>
      {/* Green accent stripe */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: 'linear-gradient(to right, #22c55e, #10b981, #059669)', boxShadow: '0 2px 16px rgba(34,197,94,0.3)' }} />

      {/* Background effects */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: dotGrid(0.03, 28), zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)' }} />

      {/* Top: Branding + Rank */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        <BrandMark color="#22c55e" size={16} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {data.rank && <RankBadge rank={data.rank} />}
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{isSession ? 'Session' : 'Profile'}</span>
        </div>
      </div>

      {/* Center: Avatar + User + Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
        <CardAvatar url={data.resolvedAvatar} username={data.username} size={88} border="3px solid rgba(34,197,94,0.35)" />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 28, fontWeight: 700 }}>@{data.username}</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, marginTop: 4 }}>
            {isSession ? (data.date ? `AI Session · ${data.date}` : 'Coded with AI') : 'AI Coding Journey'}
          </div>
          {data.topModel && <div style={{ color: 'rgba(34,197,94,0.6)', fontSize: 12, fontFamily: 'monospace', marginTop: 4 }}>{data.topModel}</div>}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
          {isSession ? (
            <>
              <WAStat label="Cost" value={formatCost(data.cost)} />
              <WAStat label="Tokens" value={formatTokens(data.tokens)} />
              {data.streak ? <WAStat label="Streak" value={`${data.streak}d`} /> : null}
            </>
          ) : (
            <>
              <WAStat label="Spent" value={formatCost(data.totalCost)} />
              <WAStat label="Days" value={String(data.totalDays ?? 0)} />
              <WAStat label="Streak" value={`${data.streak ?? 0}d`} />
            </>
          )}
        </div>
      </div>

      {/* Bottom: Providers + CTA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(data.providers ?? []).map((p) => <ProviderDot key={p} name={p} />)}
        </div>
        <div style={{
          background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 16, padding: '6px 16px',
          color: 'rgba(255,255,255,0.5)', fontSize: 12, fontFamily: 'monospace',
        }}>
          awarts.com
        </div>
      </div>
    </div>
  );
}

function WAStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      minWidth: 170, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.18)',
      borderRadius: 16, padding: '14px 22px', textAlign: 'center',
      boxShadow: '0 2px 12px rgba(34,197,94,0.08)',
    }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 2, marginBottom: 6 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 34, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

// ── Main exported component ──────────────────────────────────────────────

interface PlatformShareCardProps {
  platform: SharePlatform;
  data: PlatformCardData;
}

export const PlatformShareCard = forwardRef<HTMLDivElement, PlatformShareCardProps>(
  ({ platform, data }, ref) => {
    const size = PLATFORM_SIZE[platform];
    const resolvedAvatar = useDataUrl(data.avatarUrl);
    const enrichedData = { ...data, resolvedAvatar };

    return (
      <div ref={ref} style={{ width: size.w, height: size.h, overflow: 'hidden', flexShrink: 0 }}>
        {platform === 'x' && <XCard data={enrichedData} />}
        {platform === 'instagram' && <InstagramCard data={enrichedData} />}
        {platform === 'linkedin' && <LinkedInCard data={enrichedData} />}
        {platform === 'whatsapp' && <WhatsAppCard data={enrichedData} />}
      </div>
    );
  }
);

PlatformShareCard.displayName = 'PlatformShareCard';
