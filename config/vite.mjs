// Vite settings for the build.
export const vite = {
  build: {
    // Astro puts small scripts straight into the page. Every such script
    // needs its own hash in the Content-Security-Policy, and the policy line
    // has a length limit at Cloudflare. As files they need no hash, and they
    // are cached for a year like everything else under /_astro/.
    // Other small files (images, fonts) keep Vite's own rule.
    assetsInlineLimit: (file) => (/\.m?js$/.test(file) ? false : undefined),
  },
};
