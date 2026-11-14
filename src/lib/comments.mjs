// The comments under a guide (giscus, stored as GitHub Discussions). The
// widget is fetched from giscus.app, so it is loaded only when the visitor
// asks for it: until then nothing about the visit goes to giscus or GitHub.
const GISCUS_ORIGIN = "https://giscus.app";
// The widget announces itself within a second or two; after this it is not coming.
const GIVE_UP_MS = 15000;

const currentTheme = (doc) => (doc.documentElement.dataset.theme === "dark" ? "dark" : "light");

/**
 * Adds the widget to `wrapper` and keeps its theme in step with the site's.
 * onReady: the widget is on the page. onError: it could not be fetched; the
 * wrapper is left as it was, so the visitor can try again.
 */
export function loadComments(wrapper, { onReady, onError } = {}, win = window, doc = document) {
  // The widget starts with the theme it was loaded with; a message is only
  // needed when the site theme differs from what the widget last got. Nothing
  // is sent (or counted as sent) before the widget has announced itself.
  let widgetReady = false;
  let sentTheme = currentTheme(doc);
  const sendTheme = () => {
    const theme = currentTheme(doc);
    const frame = doc.querySelector("iframe.giscus-frame");
    if (!widgetReady || theme === sentTheme || !frame?.contentWindow) return;
    frame.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
    sentTheme = theme;
  };

  const client = doc.createElement("script");
  client.src = `${GISCUS_ORIGIN}/client.js`;
  client.async = true;
  client.crossOrigin = "anonymous";
  Object.assign(client.dataset, {
    repo: "Hovborg/smartbolig-starlight",
    repoId: "R_kgDOQuqhoQ",
    category: "Comments",
    categoryId: "DIC_kwDOQuqhoc4C0naS",
    mapping: "pathname",
    strict: "1",
    reactionsEnabled: "1",
    emitMetadata: "0",
    inputPosition: "bottom",
    theme: sentTheme,
    lang: wrapper.dataset.giscusLang ?? "da",
  });

  const themes = new MutationObserver(sendTheme);
  // The widget announces itself when ready; sync in case the theme changed while it loaded.
  const onMessage = (event) => {
    if (event.origin !== GISCUS_ORIGIN || !event.data || typeof event.data !== "object" || !("giscus" in event.data)) return;
    if (!widgetReady) {
      widgetReady = true;
      win.clearTimeout(givingUp);
      onReady?.();
    }
    sendTheme();
  };
  const fail = () => {
    if (widgetReady) return;
    win.clearTimeout(givingUp);
    win.removeEventListener("message", onMessage);
    themes.disconnect();
    client.remove();
    doc.querySelector("iframe.giscus-frame")?.remove();
    onError?.();
  };
  const givingUp = win.setTimeout(fail, GIVE_UP_MS);

  client.addEventListener("error", fail);
  win.addEventListener("message", onMessage);
  themes.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  wrapper.append(client);
}
