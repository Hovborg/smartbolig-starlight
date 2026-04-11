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
						signal: z.enum(['high', 'medium', 'low']).optional(),
						sources: z.array(z.string().url()).optional(),
					})
					.optional(),
			}),
		}),
	}),
};
