// A press on a shop link is counted in Google Analytics, so the owner can see
// which products readers go on to look at. Called only after a yes to
// statistics (src/lib/consent/boot.mjs). docs/indtjening.md.
const SHOP_LINK = "a[data-affiliate-product]";
export const CLICK_EVENT = "affiliate_click";

export function watchAffiliateClicks(win, doc) {
  const report = (event) => {
    // "auxclick" is every button but the left one; only the middle one opens the link.
    if (event.type === "auxclick" && event.button !== 1) return;
    const link = event.target?.closest?.(SHOP_LINK);
    if (!link) return;
    win.gtag("event", CLICK_EVENT, { product: link.dataset.affiliateProduct, store: link.dataset.affiliateStore });
  };
  doc.addEventListener("click", report);
  doc.addEventListener("auxclick", report);
}
