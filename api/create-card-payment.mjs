import handler from '../netlify/functions/create-card-payment.mjs';
import { runWebHandler } from '../server/vercel-adapter.mjs';

export const config = { api: { bodyParser: false } };
export default async function apiRoute(req, res) { return runWebHandler(req, res, handler); }
