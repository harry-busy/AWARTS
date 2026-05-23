import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";

// GET /posts/:id — single post with usage data, kudos, comments
export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const post = await ctx.db.get(postId);
    if (!post) return null;

    const me = await getCurrentUser(ctx);

    // Block access to unpublished posts unless the viewer is the author
    if (!post.isPublished && (!me || me._id !== post.userId)) {
      return null;
    }

    const author = await ctx.db.get(post.userId);

    // Block access to private profiles unless the viewer is the author
    if (author && !author.isPublic && (!me || me._id !== post.userId)) {
      return null;
    }

    // Get linked daily_usage entries
    const links = await ctx.db
      .query("post_daily_usage")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    const usageEntries = await Promise.all(
      links.map((l) => ctx.db.get(l.dailyUsageId))
    );

    // Count kudos
    const kudosRows = await ctx.db
      .query("kudos")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();

    // Check if current user gave kudos
    let hasGivenKudos = false;
    if (me) {
      const myKudo = await ctx.db
        .query("kudos")
        .withIndex("by_user_post", (q) =>
          q.eq("userId", me._id).eq("postId", postId)
        )
        .unique();
      hasGivenKudos = !!myKudo;
    }

    // Get comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();

    const commentsWithAuthors = await Promise.all(
      comments.map(async (c) => {
        const commenter = await ctx.db.get(c.userId);
        return {
          ...c,
          author: commenter
            ? { username: commenter.username, displayName: commenter.displayName, avatarUrl: commenter.avatarUrl }
            : null,
        };
      })
    );

    return {
      ...post,
      author: author
        ? { _id: author._id, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl }
        : null,
      usage: usageEntries.filter(Boolean),
      kudosCount: kudosRows.length,
      hasGivenKudos,
      comments: commentsWithAuthors,
    };
  },
});

// Create or update a post for a given date (called after usage submission)
export const createOrUpdatePost = mutation({
  args: {
    usageDate: v.string(),
  },
  handler: async (ctx, { usageDate }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    // Find existing post for this date
    const existing = await ctx.db
      .query("posts")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", me._id).eq("usageDate", usageDate)
      )
      .unique();

    // Get all usage entries for this date
    const usageEntries = (await ctx.db
      .query("daily_usage")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect()).filter((e) => e.date === usageDate);

    const providers = [...new Set(usageEntries.map((e) => e.provider))];

    if (existing) {
      // Update post providers
      await ctx.db.patch(existing._id, { providers });

      // Re-link usage entries
      const oldLinks = await ctx.db
        .query("post_daily_usage")
        .withIndex("by_post", (q) => q.eq("postId", existing._id))
        .collect();
      for (const link of oldLinks) {
        await ctx.db.delete(link._id);
      }
      for (const entry of usageEntries) {
        await ctx.db.insert("post_daily_usage", {
          postId: existing._id,
          dailyUsageId: entry._id,
        });
      }
      return existing._id;
    }

    // Create new post
    const postId = await ctx.db.insert("posts", {
      userId: me._id,
      usageDate,
      title: undefined,
      description: undefined,
      images: [],
      providers,
      isPublished: true,
      captionGeneratedBy: undefined,
    });

    for (const entry of usageEntries) {
      await ctx.db.insert("post_daily_usage", {
        postId,
        dailyUsageId: entry._id,
      });
    }

    return postId;
  },
});

// Delete a post and all associated data
export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const post = await ctx.db.get(postId);
    if (!post || post.userId !== me._id) throw new Error("Post not found");

    // Delete linked post_daily_usage rows
    const links = await ctx.db
      .query("post_daily_usage")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    // Delete kudos
    const kudos = await ctx.db
      .query("kudos")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const k of kudos) {
      await ctx.db.delete(k._id);
    }

    // Delete comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_post", (q) => q.eq("postId", postId))
      .collect();
    for (const c of comments) {
      await ctx.db.delete(c._id);
    }

    // Delete the post
    await ctx.db.delete(postId);
    return { success: true };
  },
});

// Update post details (title, description, images)
export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    isPublished: v.optional(v.boolean()),
    captionGeneratedBy: v.optional(v.string()),
  },
  handler: async (ctx, { postId, ...updates }) => {
    const me = await getCurrentUser(ctx);
    if (!me) throw new Error("Not authenticated");

    const post = await ctx.db.get(postId);
    if (!post || post.userId !== me._id) throw new Error("Post not found");

    const patch: Record<string, any> = {};
    if (updates.title !== undefined) patch.title = updates.title.slice(0, 200);
    if (updates.description !== undefined) patch.description = updates.description.slice(0, 2000);
    if (updates.images !== undefined) {
      patch.images = updates.images
        .slice(0, 10)
        .filter((url: string) => /^https?:\/\//i.test(url));
    }
    if (updates.isPublished !== undefined) patch.isPublished = updates.isPublished;
    if (updates.captionGeneratedBy !== undefined) patch.captionGeneratedBy = updates.captionGeneratedBy.slice(0, 50);
    await ctx.db.patch(postId, patch);
    return { success: true };
  },
});
