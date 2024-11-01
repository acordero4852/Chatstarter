import { v } from 'convex/values';
import Groq from 'groq-sdk';
import { internal } from '../_generated/api';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from '../_generated/server';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export const run = internalAction({
  args: {
    id: v.id('messages'),
  },
  handler: async (ctx, { id }) => {
    const message = await ctx.runQuery(
      internal.functions.moderation.getMessages,
      {
        id,
      }
    );

    if (!message) {
      return;
    }

    const result = await groq.chat.completions.create({
      model: 'llama-guard-3-8b',
      messages: [
        {
          role: 'user',
          content: message.content,
        },
      ],
    });

    const value = result.choices[0].message.content;

    if (value?.startsWith('unsafe')) {
      await ctx.runMutation(internal.functions.moderation.deleteMessage, {
        id,
        reason: value.replace('unsafe', '').trim(),
      });
    }
  },
});

export const getMessages = internalQuery({
  args: {
    id: v.id('messages'),
  },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

const reasons = {
  S1: 'Violent Crimes',
  S2: 'Non-Violent Crimes',
  S3: 'Sex-Related Crimes',
  S4: 'Child Sexual Exploitation',
  S5: 'Defamation',
  S6: 'Sepcialized Advice',
  S7: 'Privacy Violation',
  S8: 'Intellectual Property',
  S9: 'Indiscriminate Weapons',
  S10: 'Hate Speech',
  S11: 'Suicide & Self-Harm',
  S12: 'Sexual Content',
  S13: 'Elections',
  S14: 'Code Interpreter Abuse',
};

type Reasons = keyof typeof reasons;

export const deleteMessage = internalMutation({
  args: {
    id: v.id('messages'),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, { id, reason }) => {
    await ctx.db.patch(id, {
      deleted: true,
      deletedReason: reason ? reasons[reason as Reasons] : undefined,
    });
  },
});
