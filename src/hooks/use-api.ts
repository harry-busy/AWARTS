import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

// ── Helper: wrap a Convex mutation with isPending tracking ──────────
function useMutationWithPending<TArgs, TResult>(
  mutationFn: any
) {
  const mutation = useMutation(mutationFn);
  const [isPending, setIsPending] = useState(false);

  const mutateAsync = useCallback(
    async (args: TArgs): Promise<TResult> => {
      setIsPending(true);
      try {
        return await mutation(args as any);
      } finally {
        setIsPending(false);
      }
    },
    [mutation]
  );

  const mutate = useCallback(
    (args: TArgs) => {
      mutateAsync(args).catch(() => {});
    },
    [mutateAsync]
  );

  return { mutate, mutateAsync, isPending };
}

// ─── Feed ─────────────────────────────────────────────────────────────

export function useFeed(type: "global" | "following" = "global", provider?: string) {
  const [cursors, setCursors] = useState<string[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  // Track the active filter key so we can detect stale pages
  const [activeKey, setActiveKey] = useState(`${type}|${provider}`);
  const filterKey = `${type}|${provider}`;

  const currentCursor = cursors.length > 0 ? cursors[cursors.length - 1] : undefined;

  // Always subscribe to the first page for live updates (no cursor)
  const firstPage = useQuery(api.feed.getFeed, { type, provider, cursor: undefined });
  // Also subscribe to the current paginated page (if paginating beyond page 0)
  const paginatedResult = useQuery(
    api.feed.getFeed,
    currentCursor ? { type, provider, cursor: currentCursor } : "skip"
  );

  // Reset when filters change — do this synchronously before other effects
  if (filterKey !== activeKey) {
    setCursors([]);
    setPages([]);
    setIsFetchingNext(false);
    setActiveKey(filterKey);
  }

  // Keep first page always up to date (real-time feed)
  useEffect(() => {
    if (firstPage) {
      setPages((prev) => {
        const next = [...prev];
        next[0] = firstPage;
        return next;
      });
    }
  }, [firstPage]);

  // Sync paginated pages beyond page 0
  useEffect(() => {
    if (paginatedResult && cursors.length > 0) {
      setPages((prev) => {
        const pageIndex = cursors.length;
        const next = [...prev];
        next[pageIndex] = paginatedResult;
        return next;
      });
      setIsFetchingNext(false);
    }
  }, [paginatedResult, cursors.length]);

  const latestPage = pages[pages.length - 1];
  const hasNextPage = latestPage?.nextCursor != null;

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNext) return;
    setIsFetchingNext(true);
    setCursors((prev) => [...prev, latestPage.nextCursor]);
  }, [hasNextPage, isFetchingNext, latestPage]);

  return {
    data: pages.length > 0 ? { pages } : undefined,
    isLoading: firstPage === undefined || pages.length === 0,
    error: null,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage: isFetchingNext,
  };
}

// ─── Post Detail ──────────────────────────────────────────────────────

export function usePost(id: string) {
  const result = useQuery(api.posts.getPost, id ? { postId: id as Id<"posts"> } : "skip");
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Comments ─────────────────────────────────────────────────────────

export function useComments(postId: string) {
  const result = useQuery(
    api.social.getComments,
    postId ? { postId: postId as Id<"posts"> } : "skip"
  );
  return {
    data: result
      ? { pages: [{ comments: result, nextCursor: null }] }
      : undefined,
    isLoading: result === undefined,
    error: null,
    hasNextPage: false,
    fetchNextPage: () => {},
    isFetchingNextPage: false,
  };
}

export function useCreateComment() {
  return useMutationWithPending<{ postId: string; content: string }, any>(
    api.social.addComment
  );
}

// ─── Kudos ────────────────────────────────────────────────────────────

export function useToggleKudos() {
  const give = useMutation(api.social.giveKudos);
  const remove = useMutation(api.social.removeKudos);
  const [isPending, setIsPending] = useState(false);

  return {
    mutate: (data: { postId: string; hasKudosed: boolean }) => {
      const postId = data.postId as Id<"posts">;
      setIsPending(true);
      const promise = data.hasKudosed ? remove({ postId }) : give({ postId });
      promise.finally(() => setIsPending(false));
    },
    isPending,
  };
}

// ─── Follow ───────────────────────────────────────────────────────────

export function useToggleFollow() {
  const follow = useMutation(api.social.follow);
  const unfollow = useMutation(api.social.unfollow);
  const [isPending, setIsPending] = useState(false);

  return {
    mutate: (data: { targetUserId: string; isFollowing: boolean }) => {
      const followingId = data.targetUserId as Id<"users">;
      setIsPending(true);
      const promise = data.isFollowing ? unfollow({ followingId }) : follow({ followingId });
      promise.finally(() => setIsPending(false));
    },
    isPending,
  };
}

// ─── Notifications ────────────────────────────────────────────────────

export function useNotifications(skip = false) {
  const result = useQuery(api.social.getNotifications, skip ? "skip" : {});
  const unreadCount = result?.filter((n) => !n.isRead).length ?? 0;
  return {
    data: result
      ? { notifications: result, nextCursor: null, unread_count: unreadCount }
      : undefined,
    isLoading: result === undefined,
    error: null,
  };
}

export function useMarkNotificationsRead() {
  const inner = useMutationWithPending<Record<string, never>, any>(api.social.markNotificationsRead);
  return {
    ...inner,
    mutate: () => inner.mutate({} as Record<string, never>),
    mutateAsync: () => inner.mutateAsync({} as Record<string, never>),
  };
}

// ─── Leaderboard ──────────────────────────────────────────────────────

export function useLeaderboard(period = "weekly", provider?: string, region?: string) {
  const result = useQuery(api.leaderboard.getLeaderboard, { period, provider, region });
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Search ───────────────────────────────────────────────────────────

export function useSearch(query: string, provider?: string, country?: string) {
  const result = useQuery(
    api.search.searchUsers,
    query.length >= 2 ? { q: query, provider: provider || undefined, country: country || undefined } : "skip"
  );
  return {
    data: result ? { users: result, query } : undefined,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── User Profile ─────────────────────────────────────────────────────

export function useProfile(username: string) {
  const result = useQuery(
    api.users.getByUsername,
    username ? { username } : "skip"
  );
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

export function useCurrentUser(skip = false) {
  const result = useQuery(api.users.getMe, skip ? "skip" : {});
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

export function useUpdateProfile() {
  return useMutationWithPending<Record<string, unknown>, any>(api.users.updateMe);
}

// ─── Weekly Stats ─────────────────────────────────────────────────────

export function useWeeklyStats(skip = false) {
  const result = useQuery(api.digest.getMyWeeklyStats, skip ? "skip" : {});
  return {
    data: result ?? null,
    isLoading: result === undefined && !skip,
  };
}

// ─── AI Caption ───────────────────────────────────────────────────────

export function useGenerateCaption() {
  const generate = useAction(api.ai.generateCaption);
  const [isPending, setIsPending] = useState(false);

  const run = async (data: {
    stats: Record<string, unknown>;
    preferredProvider?: string;
  }) => {
    setIsPending(true);
    try {
      const result = await generate({
        stats: {
          totalCost: Number(data.stats.totalCost ?? 0),
          totalTokens: Number(data.stats.totalTokens ?? 0),
          providers: (data.stats.providers as string[]) ?? [],
          models: (data.stats.models as string[]) ?? undefined,
          date: String(data.stats.date ?? new Date().toISOString().slice(0, 10)),
        },
        preferredProvider: data.preferredProvider,
      });
      return result;
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (data: any) => { run(data); },
    mutateAsync: run,
    isPending,
  };
}

// ─── Image Upload ─────────────────────────────────────────────────────

export function useUploadImage() {
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl);
  const saveFile = useMutation(api.upload.saveFile);
  const [isPending, setIsPending] = useState(false);

  const uploadFile = async (file: File): Promise<{ url: string }> => {
    setIsPending(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      const { url } = await saveFile({ storageId });
      return { url };
    } finally {
      setIsPending(false);
    }
  };

  return {
    mutate: (file: File) => { uploadFile(file); },
    mutateAsync: uploadFile,
    isPending,
  };
}

// ─── Avatar Upload (shortcut) ────────────────────────────────────────

export function useUploadAvatar() {
  const generateUploadUrl = useMutation(api.upload.generateUploadUrl);
  const saveAvatar = useMutation(api.upload.saveAvatar);
  const [isPending, setIsPending] = useState(false);

  const upload = async (file: File): Promise<{ url: string }> => {
    setIsPending(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      const { url } = await saveAvatar({ storageId });
      return { url };
    } finally {
      setIsPending(false);
    }
  };

  return { upload, isPending };
}

// ─── Update Post ──────────────────────────────────────────────────────

export function useUpdatePost() {
  const updatePost = useMutation(api.posts.updatePost);
  const [isPending, setIsPending] = useState(false);

  return {
    mutate: (data: { id: string; title?: string; description?: string; images?: string[]; is_published?: boolean }) => {
      const { id, is_published, ...rest } = data;
      setIsPending(true);
      updatePost({
        postId: id as Id<"posts">,
        ...rest,
        isPublished: is_published,
      }).finally(() => setIsPending(false));
    },
    mutateAsync: async (data: { id: string; title?: string; description?: string; images?: string[]; is_published?: boolean }) => {
      const { id, is_published, ...rest } = data;
      setIsPending(true);
      try {
        return await updatePost({
          postId: id as Id<"posts">,
          ...rest,
          isPublished: is_published,
        });
      } finally {
        setIsPending(false);
      }
    },
    isPending,
  };
}

// ─── Delete Post ──────────────────────────────────────────────────────

export function useDeletePost() {
  const inner = useMutationWithPending<{ postId: Id<"posts"> }, any>(api.posts.deletePost);
  return {
    ...inner,
    mutate: (id: string) => inner.mutate({ postId: id as Id<"posts"> }),
    mutateAsync: (id: string) => inner.mutateAsync({ postId: id as Id<"posts"> }),
  };
}

// ─── User Posts ───────────────────────────────────────────────────────

export function useUserPosts(username: string) {
  const [cursors, setCursors] = useState<string[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  const [activeUsername, setActiveUsername] = useState(username);

  const currentCursor = cursors.length > 0 ? cursors[cursors.length - 1] : undefined;

  // Always subscribe to first page for live updates
  const firstPage = useQuery(
    api.feed.getUserPosts,
    username ? { username, cursor: undefined } : "skip"
  );
  const paginatedResult = useQuery(
    api.feed.getUserPosts,
    username && currentCursor ? { username, cursor: currentCursor } : "skip"
  );

  // Reset when username changes — synchronous to avoid stale flash
  if (username !== activeUsername) {
    setCursors([]);
    setPages([]);
    setIsFetchingNext(false);
    setActiveUsername(username);
  }

  // Keep first page always up to date (real-time)
  useEffect(() => {
    if (firstPage) {
      setPages((prev) => {
        const next = [...prev];
        next[0] = firstPage;
        return next;
      });
    }
  }, [firstPage]);

  // Sync paginated pages beyond page 0
  useEffect(() => {
    if (paginatedResult && cursors.length > 0) {
      setPages((prev) => {
        const pageIndex = cursors.length;
        const next = [...prev];
        next[pageIndex] = paginatedResult;
        return next;
      });
      setIsFetchingNext(false);
    }
  }, [paginatedResult, cursors.length]);

  const latestPage = pages[pages.length - 1];
  const hasNextPage = latestPage?.nextCursor != null;

  const fetchNextPage = useCallback(() => {
    if (!hasNextPage || isFetchingNext) return;
    setIsFetchingNext(true);
    setCursors((prev) => [...prev, latestPage.nextCursor]);
  }, [hasNextPage, isFetchingNext, latestPage]);

  return {
    data: pages.length > 0 ? { pages } : undefined,
    isLoading: firstPage === undefined || pages.length === 0,
    error: null,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage: isFetchingNext,
  };
}

// ─── Followers / Following ────────────────────────────────────────────

export function useFollowers(username: string) {
  const result = useQuery(
    api.users.getFollowers,
    username ? { username } : "skip"
  );
  return {
    data: result ? { users: result } : undefined,
    isLoading: result === undefined,
    error: null,
  };
}

export function useFollowing(username: string) {
  const result = useQuery(
    api.users.getFollowing,
    username ? { username } : "skip"
  );
  return {
    data: result ? { users: result } : undefined,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Edit / Delete Comment ──────────────────────────────────────────

export function useEditComment() {
  return useMutationWithPending<{ commentId: string; content: string }, any>(
    api.social.editComment
  );
}

export function useDeleteComment() {
  const inner = useMutationWithPending<{ commentId: Id<"comments"> }, any>(api.social.deleteComment);
  return {
    ...inner,
    mutate: (id: string) => inner.mutate({ commentId: id as Id<"comments"> }),
    mutateAsync: (id: string) => inner.mutateAsync({ commentId: id as Id<"comments"> }),
  };
}

// ─── Prompts ──────────────────────────────────────────────────────

export function usePrompts() {
  const result = useQuery(api.prompts.getPrompts, {});
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

export function useSubmitPrompt() {
  return useMutationWithPending<{ content: string; isAnonymous: boolean }, any>(
    api.prompts.submitPrompt
  );
}

export function useTogglePromptVote() {
  return useMutationWithPending<{ promptId: string }, any>(
    api.prompts.toggleVote
  );
}

// ─── Import Usage (web) ──────────────────────────────────────────────

export function useImportUsage() {
  return useMutationWithPending<
    { entries: Array<{ date: string; provider: string; cost_usd: number; input_tokens: number; output_tokens: number; models: string[]; cost_source?: string }> },
    any
  >(api.usage.importUsage);
}

// ─── Username Availability ────────────────────────────────────────────

export function useCheckUsername(username: string) {
  const result = useQuery(
    api.users.checkUsername,
    username.length >= 3 ? { username } : "skip"
  );
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Account Deletion ────────────────────────────────────────────────

export function useDeleteAccount() {
  return useMutationWithPending<Record<string, never>, any>(api.users.deleteAccount);
}

// ─── Suggested Users ─────────────────────────────────────────────────

export function useSuggestedUsers() {
  const result = useQuery(api.users.getSuggested, { limit: 5 });
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Direct Messages ─────────────────────────────────────────────────

export function useConversations(skip = false) {
  const result = useQuery(api.messages.getConversations, skip ? "skip" : {});
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

export function useMessages(conversationId: string | null) {
  const result = useQuery(
    api.messages.getMessages,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
  );
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

export function useSendMessage() {
  return useMutationWithPending<{ conversationId: string; content: string }, any>(
    api.messages.sendMessage
  );
}

export function useStartConversation() {
  return useMutationWithPending<{ userId: string }, any>(
    api.messages.startConversation
  );
}

export function useMarkConversationRead() {
  return useMutationWithPending<{ conversationId: string }, any>(
    api.messages.markConversationRead
  );
}

export function useUnreadMessageCount(skip = false) {
  const result = useQuery(api.messages.getUnreadCount, skip ? "skip" : {});
  return result ?? 0;
}

// ─── Top Weekly (for right sidebar) ──────────────────────────────────

export function useTopWeekly() {
  const result = useQuery(api.leaderboard.getLeaderboard, {
    period: "weekly",
    limit: 5,
  });
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Data Export ───────────────────────────────────────────────────────

export function useDataExport() {
  const result = useQuery(api.export.getMyData);
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Counter Dashboard ────────────────────────────────────────────────

export function useCounterData(skip = false) {
  const result = useQuery(api.analytics.getCounterData, skip ? "skip" : {});
  return {
    data: result ?? null,
    isLoading: result === undefined && !skip,
  };
}

// ─── Analytics Charts ──────────────────────────────────────────────────

export function useChartData(username: string) {
  const result = useQuery(
    api.analytics.getChartData,
    username ? { username } : "skip"
  );
  return {
    data: result,
    isLoading: result === undefined,
    error: null,
  };
}

// ─── Velocity / Pace Metrics ──────────────────────────────────────────

export function useVelocityMetrics(skip = false) {
  const result = useQuery(api.analytics.getVelocityMetrics, skip ? "skip" : {});
  return {
    data: result ?? null,
    isLoading: result === undefined && !skip,
  };
}

// ─── API Keys ─────────────────────────────────────────────────────────

export function useApiKeys() {
  const result = useQuery(api.apiKeys.listMyKeys);
  return {
    data: result ?? [],
    isLoading: result === undefined,
  };
}

export function useCreateApiKey() {
  return useMutationWithPending<{ name: string; scopes?: string[] }, { key: string; keyPrefix: string; name: string }>(
    api.apiKeys.createKey
  );
}

export function useRevokeApiKey() {
  return useMutationWithPending<{ keyId: Id<"api_keys"> }, { success: boolean }>(
    api.apiKeys.revokeKey
  );
}

// ─── Cursor analytics ─────────────────────────────────────────────────

export function useCursorDetails(skip = false) {
  const result = useQuery(api.analyticsCursor.getCursorDetails, skip ? "skip" : {});
  return {
    data: result ?? null,
    isLoading: result === undefined && !skip,
  };
}
