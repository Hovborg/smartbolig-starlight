/** Site-wide constants shared by the SEO modules. */
export const siteUrl = "https://smartbolig.net";
export const defaultSocialImageUrl = `${siteUrl}/images/og-image.png`;
export const organizationLogoUrl = `${siteUrl}/brand/logo/logo-dark-1200x270.png`;

export type Lang = "da" | "en";

/** The page's content entry, as far as the SEO modules read it. */
export type PageEntry = { data?: Record<string, any> } | undefined | null;

export const defaultSchemaImage = {
  "@type": "ImageObject",
  url: defaultSocialImageUrl,
  width: 1200,
  height: 630,
};