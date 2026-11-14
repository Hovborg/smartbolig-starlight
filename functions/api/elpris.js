// Cloudflare Pages Function for /api/elpris. The logic lives in functions/lib/elpris/.
import { createElprisHandler } from "../lib/elpris/handler.js";

export { createElprisHandler } from "../lib/elpris/handler.js";

export const onRequest = createElprisHandler();
