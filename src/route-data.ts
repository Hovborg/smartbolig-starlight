// Starlight route middleware: runs for every page before it is rendered.
import { defineRouteMiddleware } from "@astrojs/starlight/route-data";
import { scopeSidebar } from "./lib/sidebar-scope.mjs";

export const onRequest = defineRouteMiddleware((context) => {
  const route = context.locals.starlightRoute;
  route.sidebar = scopeSidebar(route.sidebar, context.url.pathname);
});
