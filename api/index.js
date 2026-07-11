// Vercel serverless entrypoint: every /api/* request is rewritten here
// (see vercel.json). The Express app is pre-bundled by esbuild during the
// Vercel build (buildCommand) because the runtime cannot import .ts files.
import app from "../dist-server/app.mjs";

export default app;
