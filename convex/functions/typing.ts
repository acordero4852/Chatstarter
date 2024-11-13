import { v } from 'convex/values';
import { internal } from '../_generated/api';
import {
  authenticatedMutation,
  authenticatedQuery,
  assertChannelMember,
} from './helpers';
import { internalMutation } from '../_generated/server';

export const list = authenticatedQuery({
  args: {
    dmOrChannelId: v.union(v.id('directMessages'), v.id('channels')),
  },
  handler: async (ctx, { dmOrChannelId }) => {
    await assertChannelMember(ctx, dmOrChannelId);
    const typingIndicators = await ctx.db
      .query('typingIndicators')
      .withIndex('by_dmOrChannelId', (q) =>
        q.eq('dmOrChannelId', dmOrChannelId)
      )
      .filter((q) => q.neq(q.field('user'), ctx.user._id))
      .collect();
    return await Promise.all(
      typingIndicators.map(async (indicator) => {
        const user = await ctx.db.get(indicator.user);
        if (!user) {
          throw new Error('User does not exist');
        }
        return user.username;
      })
    );
  },
});

export const upsert = authenticatedMutation({
  args: {
    dmOrChannelId: v.union(v.id('directMessages'), v.id('channels')),
  },
  handler: async (ctx, { dmOrChannelId }) => {
    await assertChannelMember(ctx, dmOrChannelId);
    const existing = await ctx.db
      .query('typingIndicators')
      .withIndex('by_user_dmOrChannelId', (q) =>
        q.eq('user', ctx.user._id).eq('dmOrChannelId', dmOrChannelId)
      )
      .unique();
    const expireAt = Date.now() + 1000 * 5;
    if (existing) {
      await ctx.db.patch(existing._id, { expireAt });
      return existing._id;
    } else {
      const newIndicatorId = await ctx.db.insert('typingIndicators', {
        user: ctx.user._id,
        dmOrChannelId,
        expireAt,
      });
      await ctx.scheduler.runAt(expireAt, internal.functions.typing.remove, {
        dmOrChannelId,
        user: ctx.user._id,
        expireAt,
      });
      return newIndicatorId;
    }
  },
});

export const remove = internalMutation({
  args: {
    dmOrChannelId: v.union(v.id('directMessages'), v.id('channels')),
    user: v.id('users'),
    expireAt: v.optional(v.number()),
  },
  handler: async (ctx, { dmOrChannelId, user, expireAt }) => {
    const existing = await ctx.db
      .query('typingIndicators')
      .withIndex('by_user_dmOrChannelId', (q) =>
        q.eq('user', user).eq('dmOrChannelId', dmOrChannelId)
      )
      .unique();
    if (existing && (!expireAt || existing.expireAt === expireAt)) {
      await ctx.db.delete(existing._id);
    }
  },
});
