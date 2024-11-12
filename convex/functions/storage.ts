import { v } from 'convex/values';
import { authenticatedMutation } from './helpers';

export const generateUploadUrl = authenticatedMutation({
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const remove = authenticatedMutation({
  args: {
    storageId: v.id('_storage'),
  },
  handler: async (ctx, { storageId }) => {
    await ctx.storage.delete(storageId);
  },
});
