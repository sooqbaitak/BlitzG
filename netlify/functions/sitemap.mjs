import { createSitemapResponse } from '../../api/sitemap.mjs';

export default async (request) => createSitemapResponse(request.url);
