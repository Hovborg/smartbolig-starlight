// Head: inline script that makes dark the default theme for new visitors.
export default [
  // Force dark mode as default for new visitors
  {
    tag: "script",
    content: `
            (function() {
              try {
                if (localStorage.getItem('starlight-theme')) return;
                localStorage.setItem('starlight-theme', 'dark');
              } catch { /* Storage can be disabled in private or embedded contexts. */ }
              document.documentElement.dataset.theme = 'dark';
            })();
          `,
  },
];
