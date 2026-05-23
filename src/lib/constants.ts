import { Provider, Achievement } from './types';

export interface ProviderConfig {
  id: Provider;
  name: string;
  color: string;
  hslVar: string;
  bgClass: string;
  textClass: string;
  dotClass: string;
}

export const PROVIDERS: Record<Provider, ProviderConfig> = {
  claude: {
    id: 'claude',
    name: 'Claude',
    color: '#E87A35',
    hslVar: 'var(--claude)',
    bgClass: 'bg-claude/10',
    textClass: 'text-claude',
    dotClass: 'bg-claude',
  },
  codex: {
    id: 'codex',
    name: 'Codex',
    color: '#22C55E',
    hslVar: 'var(--codex)',
    bgClass: 'bg-codex/10',
    textClass: 'text-codex',
    dotClass: 'bg-codex',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini',
    color: '#3B82F6',
    hslVar: 'var(--gemini)',
    bgClass: 'bg-gemini/10',
    textClass: 'text-gemini',
    dotClass: 'bg-gemini',
  },
  antigravity: {
    id: 'antigravity',
    name: 'Antigravity',
    color: '#A855F7',
    hslVar: 'var(--antigravity)',
    bgClass: 'bg-antigravity/10',
    textClass: 'text-antigravity',
    dotClass: 'bg-antigravity',
  },
  cursor: {
    id: 'cursor',
    name: 'Cursor',
    color: '#06B6D4',
    hslVar: 'var(--cursor)',
    bgClass: 'bg-cursor/10',
    textClass: 'text-cursor',
    dotClass: 'bg-cursor',
  },
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-submit', name: 'First Sync', emoji: '🚀', description: 'Push your first session', earned: false },
  { id: 'week-warrior', name: 'Week Warrior', emoji: '⚔️', description: '7-day streak', earned: false },
  { id: 'month-master', name: 'Power User', emoji: '💪', description: '30-day streak', earned: false },
  { id: 'hundred-days', name: '100 Days', emoji: '💯', description: '100-day streak', earned: false },
  { id: 'big-spender-10', name: 'Spender $10', emoji: '💵', description: 'Spend $10 total', earned: false },
  { id: 'big-spender-100', name: 'Big Spender', emoji: '💸', description: 'Spend $100 total', earned: false },
  { id: 'big-spender-1000', name: 'Whale', emoji: '🐳', description: 'Spend $1000 total', earned: false },
  { id: 'multi-provider', name: 'Polyglot Coder', emoji: '🌐', description: 'Use 2+ providers', earned: false },
  { id: 'all-providers', name: 'Full Stack AI', emoji: '🤖', description: 'Use all 5 providers', earned: false },
];

export const COUNTRIES = [
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'IL', name: 'Israel', flag: '🇮🇱' },
  { code: 'PL', name: 'Poland', flag: '🇵🇱' },
];
