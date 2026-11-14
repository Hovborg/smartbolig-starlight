// A built page fetches nothing from another host by itself (docs/samtykke.md).
import assert from "node:assert/strict";
import test from "node:test";
import { foreignHosts } from "./lib/seo-foreign-hosts.mjs";

test("a page that fetches only from the site passes", () => {
  const html = `
    <link rel="stylesheet" href="/_astro/page.css">
    <link rel="preload" as="image" href="/_astro/a.webp" imagesrcset="/_astro/a.webp 640w, /_astro/b.webp 1280w">
    <link rel="icon" href="https://smartbolig.net/favicon.svg">
    <script type="module" src="/_astro/page.js"></script>
    <script type="application/ld+json">{"url":"https://example.com/"}</script>
    <img src="/_astro/a.webp" srcset="/_astro/a.webp 640w, /_astro/b.webp 1280w" alt="">
    <img src="data:image/svg+xml,%3Csvg%3E%3C/svg%3E" alt="">
    <a href="https://www.home-assistant.io/">Home Assistant</a>`;
  assert.deepEqual(foreignHosts(html), []);
});

test("an address in the head that is not fetched passes", () => {
  const html = `
    <link rel="canonical" href="https://smartbolig.net/da/">
    <link rel="alternate" hreflang="en" href="https://smartbolig.net/en/">
    <link rel="alternate" type="application/rss+xml" href="https://feeds.example/rss.xml">
    <link rel="me" href="https://www.youtube.com/@SmartBoligNet">
    <meta property="og:image" content="https://cdn.example/og.png">`;
  assert.deepEqual(foreignHosts(html), []);
});

test("a script, a frame or a picture from another host fails", () => {
  for (const [html, host] of [
    ['<script async src="https://www.googletagmanager.com/gtag/js?id=G-1"></script>', "www.googletagmanager.com"],
    ["<script src='//pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'></script>", "pagead2.googlesyndication.com"],
    ["<SCRIPT SRC=https://giscus.app/client.js></SCRIPT>", "giscus.app"],
    ['<iframe src="https://www.youtube.com/embed/x"></iframe>', "www.youtube.com"],
    ['<img alt="" src="https://img.shields.io/badge/x.svg">', "img.shields.io"],
    ['<img alt="" src="/a.webp" srcset="/a.webp 640w, https://cdn.example/b.webp 1280w">', "cdn.example"],
    ['<video poster="https://cdn.example/p.jpg" src="/v.mp4"></video>', "cdn.example"],
    ['<object data="https://cdn.example/x.swf"></object>', "cdn.example"],
  ]) {
    assert.match(foreignHosts(html).join("\n"), new RegExp(`fetches from ${host.replaceAll(".", "\\.")};`), html);
  }
});

test("a resource hint or a style sheet from another host fails", () => {
  for (const rel of ["preconnect", "dns-prefetch", "preload", "modulepreload", "prefetch", "stylesheet", "icon", "manifest"]) {
    assert.match(foreignHosts(`<link rel="${rel}" href="https://fonts.googleapis.com/x">`).join("\n"), /<link> fetches from fonts\.googleapis\.com/, rel);
  }
  assert.match(foreignHosts('<link href="https://fonts.gstatic.com" crossorigin rel="preconnect dns-prefetch">').join("\n"), /fonts\.gstatic\.com/);
  assert.match(foreignHosts('<link rel="preload" as="image" href="/a.webp" imagesrcset="https://cdn.example/a.webp 640w">').join("\n"), /cdn\.example/);
});

test("a code sample in a copy button is text, not a tag", () => {
  const sample = `<button data-code="<script src='https://cdn.example/x.js'></script>">Copy</button>`;
  assert.deepEqual(foreignHosts(sample), []);
  assert.match(foreignHosts(`${sample}<script src="https://cdn.example/x.js"></script>`).join("\n"), /cdn\.example/, "the real tag beside it still counts");
});

test("only the attribute itself counts, and a subdomain is another host", () => {
  assert.deepEqual(foreignHosts('<script data-src="https://cdn.example/x.js" src="/x.js"></script>'), []);
  assert.deepEqual(foreignHosts('<img alt="" data-srcset="https://cdn.example/a.webp 1x" src="/a.webp">'), []);
  assert.match(foreignHosts('<script src="https://cdn.smartbolig.net/x.js"></script>').join("\n"), /cdn\.smartbolig\.net/);
  assert.equal(foreignHosts('<img alt="" src="https://cdn.example/a.png"><img alt="" src="https://cdn.example/b.png">').length, 1, "one message per element and host");
});
