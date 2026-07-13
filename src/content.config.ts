import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
	docs: defineCollection({
		loader: docsLoader(),
		schema: docsSchema({
			extend: z.object({
				date: z.coerce.date().optional(),
				updated: z.coerce.date().optional(),
				news: z
					.object({
						editorialVersion: z.literal(2).optional(),
						storyFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
						sourceSetFingerprint: z.string().regex(/^[a-f0-9]{64}$/).optional(),
						signal: z.enum(['high', 'medium', 'low']).optional(),
						sources: z.array(z.string().url()).optional(),
					})
					.optional(),
				heroImage: z
					.object({
						src: z.string().startsWith('/images/'),
						alt: z.string().min(1),
						caption: z.string().optional(),
					})
					.optional(),
			}),
		}),
	}),
};
