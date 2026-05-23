export type Provider = 'claude' | 'codex' | 'gemini' | 'antigravity' | 'cursor';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio: string;
  location: string;
  country: string;
  countryCode: string;
  joinDate: string;
  followers: number;
  following: number;
  isVerified: boolean;
  isFollowing: boolean;
  providers: Provider[];
  streak: number;
  totalSpend: number;
  totalTokens: number;
}

export interface ProviderBreakdown {
  provider: Provider;
  cost: number;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

export interface PostStats {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
  isEstimated?: boolean;
}

export interface Post {
  id: string;
  user: User;
  title: string;
  description: string;
  providers: Provider[];
  providerBreakdown: ProviderBreakdown[];
  stats: PostStats;
  images: string[];
  kudosCount: number;
  commentCount: number;
  hasKudosed: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  user: User;
  content: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'kudos' | 'comment' | 'mention' | 'follow' | 'achievement';
  actor: User;
  post?: Post;
  read: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  emoji: string;
  description: string;
  earned: boolean;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  rank: number;
  user: User;
  spend: number;
  tokens: number;
  streak: number;
  providers: Provider[];
}

export interface HeatmapDay {
  date: string;
  spend: number;
  dominantProvider: Provider | null;
  intensity: 0 | 1 | 2 | 3 | 4;
}
