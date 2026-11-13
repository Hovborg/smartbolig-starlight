// Head: Google Consent Mode v2 defaults and gtag bootstrap (must precede gtag.js and AdSense).
export default [
  // Google Consent Mode v2 + Google tags.
  // GDPR/ePrivacy: consent defaults to DENIED for every storage type, so
  // GA4 and AdSense run without cookies until the visitor consents.
  // Google's own certified CMP (AdSense -> Privacy & messaging) renders the
  // consent banner and calls gtag('consent','update',...) on acceptance.
  // This inline block MUST run before gtag.js / adsbygoogle.js below.
  {
    tag: "script",
    content: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            // Consent Mode v2 — deny all storage until the CMP updates it.
            gtag('consent', 'default', {
              ad_storage: 'denied',
              ad_user_data: 'denied',
              ad_personalization: 'denied',
              analytics_storage: 'denied',
              functionality_storage: 'denied',
              personalization_storage: 'denied',
              security_storage: 'granted',
              wait_for_update: 500
            });
            // Cookieless URL passthrough + ad data redaction while consent is denied.
            gtag('set', 'url_passthrough', true);
            gtag('set', 'ads_data_redaction', true);
            gtag('js', new Date());
            gtag('config', 'G-H52D2TJGV0');
          `,
  },
];
