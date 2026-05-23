import { useState, useEffect, useRef, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ActivityCard } from '@/components/ActivityCard';
import { SkeletonCard } from '@/components/SkeletonCard';
import { ErrorState } from '@/components/ErrorState';
import { useFeed, useUserPosts, useWeeklyStats } from '@/hooks/use-api';
import { transformFeedPost } from '@/lib/transformers';
import { useAuth } from '@/context/AuthContext';
import { Provider } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatCost } from '@/lib/format';
import { ArrowUp, Terminal, Upload, X, Rocket, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

const tabs = ['Following', 'Global', 'My Sessions'] as const;
const providers: (Provider | 'all')[] = ['all', 'claude', 'codex', 'gemini', 'antigravity', 'cursor'];

export default function Feed() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<typeof tabs[number]>('Global');
  const [providerFilter, setProviderFilter] = useState<Provider | 'all'>('all');
  const [showTop, setShowTop] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('awarts_getting_started_dismissed') === '1'
  );

  const isMySessionsTab = activeTab === 'My Sessions';
  const feedType = activeTab === 'Following' ? 'following' : 'global';
  const providerParam = providerFilter === 'all' ? undefined : providerFilter;

  const weeklyStats = useWeeklyStats(!user);

  const feedResult = useFeed(
    isMySessionsTab ? 'global' : feedType,
    providerParam
  );
  const myPostsResult = useUserPosts(isMySessionsTab && user ? user.username : '');

  // Use the right data source based on active tab
  const activeResult = isMySessionsTab ? myPostsResult : feedResult;
  const {
    data,
    isLoading,
    error,
    hasNextPage,
    isFetchingNextPage,
  } = activeResult;
  const fetchNextPage = activeResult.fetchNextPage;
  const isError = !!error;

  // Infinite scroll observer
  const sentinelRef = useRef<HTMLDivElement>(null);
  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleIntersect, { rootMargin: '200px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleIntersect]);

  // Back to top — listen on the scrollable main container, not window
  useEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    const handler = () => setShowTop(main.scrollTop > 400);
    main.addEventListener('scroll', handler, { passive: true });
    return () => main.removeEventListener('scroll', handler);
  }, []);

  const posts = data?.pages.flatMap((page) => page.posts.map(transformFeedPost)) ?? [];

  const dismissBanner = () => {
    localStorage.setItem('awarts_getting_started_dismissed', '1');
    setBannerDismissed(true);
  };

  // Show banner when signed in, not dismissed, on My Sessions with no posts, or globally new user
  const myPosts = myPostsResult.data?.pages.flatMap((p) => p.posts) ?? [];
  const showGettingStarted = user && !bannerDismissed && !isLoading && (
    (isMySessionsTab && myPosts.length === 0) ||
    (!isMySessionsTab && myPosts.length === 0 && !myPostsResult.isLoading)
  );

  return (
    <AppShell>
      <SEO title="Feed — AI Coding Activity" description="See the latest AI coding sessions from developers worldwide. Filter by Claude, Codex, Gemini, and Antigravity providers." canonical="/feed" keywords="AI coding feed, developer activity, Claude sessions, Codex sessions, AI coding community" jsonLd={{ "@context": "https://schema.org", "@type": "CollectionPage", "name": "AI Coding Activity Feed", "description": "Latest AI coding sessions from developers worldwide", "url": "https://awarts.club/feed" }} />
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Tabs */}
        <div className="flex gap-6 border-b border-border" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'pb-3 text-sm font-medium transition-colors relative',
                activeTab === tab ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab}
              {activeTab === tab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Provider filters */}
        <div className="flex gap-2 flex-wrap">
          {providers.map((p) => (
            <button
              key={p}
              onClick={() => setProviderFilter(p)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                providerFilter === p
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:border-muted-foreground'
              )}
            >
              {p === 'all' ? 'All' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Weekly stats banner */}
        {user && weeklyStats.data && !weeklyStats.isLoading && (
          <Link
            to="/recap"
            className="block rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 p-4 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <TrendingUp className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-semibold text-foreground">Your Week</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCost(weeklyStats.data.totalCost)} spent &middot; {weeklyStats.data.activeDays} active day{weeklyStats.data.activeDays !== 1 ? 's' : ''} &middot; {weeklyStats.data.streak} day streak
                  </p>
                </div>
              </div>
              <span className="text-xs text-primary font-medium">View Recap &rarr;</span>
            </div>
          </Link>
        )}

        {/* Getting Started banner for new users */}
        {showGettingStarted && (
          <div className="relative rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5 space-y-4">
            <button
              onClick={dismissBanner}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <Rocket className="h-5 w-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">Welcome to AWARTS!</h3>
            </div>
            <p className="text-sm text-muted-foreground">Get started tracking your AI coding sessions:</p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">1</div>
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Terminal className="h-3.5 w-3.5" /> Install the CLI
                  </p>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">npx awarts@latest</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">2</div>
                <div>
                  <p className="text-sm font-medium text-foreground">Sync your sessions</p>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono text-muted-foreground">npx awarts@latest sync</code>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">3</div>
                <div>
                  <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                    <Upload className="h-3.5 w-3.5" /> Or import manually
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Go to <Link to="/settings" className="text-primary hover:underline">Settings &rarr; Import</Link> to upload JSON/CSV files
                  </p>
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground border-t border-border/50 pt-3">
              <strong>Using Pro subscriptions without API keys?</strong> The CLI reads local files created by your tools — no API keys needed.
            </p>
          </div>
        )}

        {/* Auth prompt for auth-required tabs */}
        {(activeTab === 'Following' || activeTab === 'My Sessions') && !user && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg font-medium">Sign in to see {activeTab === 'My Sessions' ? 'your sessions' : 'your feed'}</p>
            <p className="text-sm mt-1">{activeTab === 'My Sessions' ? 'Track your AI coding sessions and view them here.' : 'Follow developers and see their sessions here.'}</p>
            <Link to="/login" className="inline-block mt-4 text-sm text-primary hover:underline">
              Sign in
            </Link>
          </div>
        )}

        {/* Feed */}
        {((activeTab !== 'Following' && activeTab !== 'My Sessions') || user) && (
          <div className="space-y-4">
            {isLoading
              ? [...Array(3)].map((_, i) => <SkeletonCard key={i} />)
              : isError
                ? <ErrorState message="Failed to load feed." onRetry={() => window.location.reload()} />
                : posts.length === 0
                  ? (
                    <div className="text-center py-16 text-muted-foreground space-y-3">
                      <div className="text-4xl">
                        {activeTab === 'Following' ? '👥' : activeTab === 'My Sessions' ? '🚀' : '📡'}
                      </div>
                      <p className="text-lg font-semibold text-foreground">
                        {activeTab === 'Following'
                          ? 'Your feed is empty'
                          : activeTab === 'My Sessions'
                            ? 'No sessions yet'
                            : 'No activity yet'}
                      </p>
                      <p className="text-sm max-w-xs mx-auto">
                        {activeTab === 'Following'
                          ? 'Follow developers from the Leaderboard or Search to see their sessions here.'
                          : activeTab === 'My Sessions'
                            ? 'Run npx awarts@latest sync to push your first AI coding session.'
                            : 'Be the first! Install the CLI and start tracking your AI coding sessions.'}
                      </p>
                    </div>
                  )
                  : posts.map((post, i) => <ActivityCard key={post.id} post={post} index={i} />)
            }

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} />
            {isFetchingNextPage && <SkeletonCard />}
            {!isLoading && !isFetchingNextPage && posts.length > 0 && !hasNextPage && (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm font-medium">You're all caught up!</p>
                <p className="text-xs mt-1">Check back later for new sessions.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Back to top */}
      <button
        onClick={() => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })}
        className={cn(
          "fixed bottom-20 right-6 z-40 rounded-full bg-primary p-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-all duration-200 lg:bottom-6",
          showTop ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90 pointer-events-none"
        )}
        aria-label="Back to top"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </AppShell>
  );
}
