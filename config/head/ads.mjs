// Head: Google AdSense loader.
export default [
  // Google AdSense — loaded on every page so Google's certified CMP
  // (AdSense -> Privacy & messaging) can render the consent message.
  // Consent Mode (default DENIED above) keeps ads non-personalised and
  // cookieless until the visitor consents. The published GDPR message in
  // the AdSense dashboard is what triggers the banner.
  {
    tag: "script",
    attrs: {
      async: true,
      src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1259715054941263",
      crossorigin: "anonymous",
    },
  },
];
