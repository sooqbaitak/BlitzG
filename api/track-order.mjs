import handler from '../netlify/functions/track-order.mjs';
import { runWebHandler } from '../server/vercel-adapter.mjs';

export const config = { api: { bodyParser: false } };
export default async function apiRoute(req, res) { return runWebHandler(req, res, handler); }
