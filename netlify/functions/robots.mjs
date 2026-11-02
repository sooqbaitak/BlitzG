import { createRobotsResponse } from '../../api/robots.mjs';

export default async (request) => createRobotsResponse(request.url);
