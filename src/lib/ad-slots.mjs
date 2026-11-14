// The fixed ad places (src/components/AdSlot.astro) stay hidden until the
// visitor has said yes to ads. Called from src/lib/consent/boot.mjs.
const PLACE = "[data-ad-slot-place]";

export function showAdSlots(win, doc) {
  for (const place of doc.querySelectorAll(PLACE)) {
    if (!place.hidden) continue;
    place.hidden = false;
    // AdSense fills one waiting <ins class="adsbygoogle"> for each push.
    (win.adsbygoogle = win.adsbygoogle || []).push({});
  }
}
