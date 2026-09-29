/** Partner-Ads programs verified as approved on 2026-09-29. */
export const affiliateMerchants = {
  proshop: { name: 'Proshop', domain: 'proshop.dk', bannerId: '67785', icon: '🛒' },
  specialkamera: { name: 'Specialkamera', domain: 'specialkamera.dk', bannerId: '65506', icon: '📷' },
  robotteronline: { name: 'RobotterOnline', domain: 'robotteronline.dk', bannerId: '99869', icon: '🤖' },
  wattoo: { name: 'WATTOO', domain: 'wattoo.dk', bannerId: '51434', icon: '💡' },
  batteribyen: { name: 'Batteribyen', domain: 'batteribyen.dk', bannerId: '3252', icon: '🔋' },
} as const;

export type AffiliateStore = keyof typeof affiliateMerchants;

export function buildAffiliateUrl(store: AffiliateStore, productUrl: string): string {
  if (!Object.hasOwn(affiliateMerchants, store)) {
    throw new Error(`Unapproved affiliate merchant: ${store}`);
  }
  const merchant = affiliateMerchants[store];
  const destination = new URL(productUrl);
  if (
    destination.protocol !== 'https:' || destination.username || destination.password ||
    ![merchant.domain, `www.${merchant.domain}`].includes(destination.hostname)
  ) {
    throw new Error(`Invalid destination for affiliate merchant: ${store}`);
  }
  return `https://www.partner-ads.com/dk/klikbanner.php?partnerid=55881&bannerid=${merchant.bannerId}&htmlurl=${encodeURIComponent(productUrl)}`;
}
