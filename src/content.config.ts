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
						editorialVersion: z.union([z.literal(2), z.literal(3)]).optional(),
						copySource: z.enum(['llm', 'template', 'repeat']).optional(),
						repeatOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
