/**
 * Wrapper Script Routes
 * Serves the minified publisher wrapper script
 */

import { FastifyInstance } from 'fastify';
import * as fs from 'fs';
import * as path from 'path';

const WRAPPER_PATH = path.join(process.cwd(), '../wrapper/dist/pb.min.js');
const WRAPPER_SOURCE_MAP_PATH = path.join(process.cwd(), '../wrapper/dist/pb.min.js.map');

export default async function wrapperRoutes(fastify: FastifyInstance) {
  /**
   * Serve the minified wrapper script
   * GET /pb.min.js or /pb/{publisherApiKey}.js
   */
  fastify.get('/pb.min.js', async (request, reply) => {
    try {
      if (!fs.existsSync(WRAPPER_PATH)) {
        return reply.code(404).send({
          error: 'Wrapper not built',
          message: 'Run "npm run build" in apps/wrapper directory'
        });
      }

      const content = fs.readFileSync(WRAPPER_PATH, 'utf-8');

      reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=300, s-maxage=3600') // 5 min browser, 1 hour CDN
        .header('Access-Control-Allow-Origin', '*') // CORS for CDN usage
        .send(content);
    } catch (err) {
      fastify.log.error('Failed to serve wrapper:', err);
      return reply.code(500).send({ error: 'Failed to load wrapper' });
    }
  });

  /**
   * Serve source map for debugging
   * GET /pb.min.js.map
   */
  fastify.get('/pb.min.js.map', async (request, reply) => {
    try {
      if (!fs.existsSync(WRAPPER_SOURCE_MAP_PATH)) {
        return reply.code(404).send({ error: 'Source map not found' });
      }

      const content = fs.readFileSync(WRAPPER_SOURCE_MAP_PATH, 'utf-8');

      reply
        .header('Content-Type', 'application/json; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600')
        .header('Access-Control-Allow-Origin', '*')
        .send(content);
    } catch (err) {
      fastify.log.error('Failed to serve source map:', err);
      return reply.code(500).send({ error: 'Failed to load source map' });
    }
  });

  /**
   * Serve publisher-specific wrapper (with API key in filename)
   * GET /pb/{apiKey}.js
   *
   * This is the same wrapper, but allows for publisher-specific URLs
   * which can be useful for cache busting or per-publisher customization
   */
  fastify.get<{ Params: { apiKey: string } }>('/pb/:apiKey.js', async (request, reply) => {
    const { apiKey } = request.params;

    try {
      if (!fs.existsSync(WRAPPER_PATH)) {
        return reply.code(404).send({
          error: 'Wrapper not built',
          message: 'Run "npm run build" in apps/wrapper directory'
        });
      }

      const content = fs.readFileSync(WRAPPER_PATH, 'utf-8');

      // Optional: Could inject API key into wrapper here
      // const customized = content.replace('PUBLISHER_API_KEY', apiKey);

      reply
        .header('Content-Type', 'application/javascript; charset=utf-8')
        .header('Cache-Control', 'public, max-age=3600') // 1 hour cache
        .header('Access-Control-Allow-Origin', '*')
        .send(content);
    } catch (err) {
      fastify.log.error('Failed to serve publisher wrapper:', err);
      return reply.code(500).send({ error: 'Failed to load wrapper' });
    }
  });

  /**
   * Get wrapper build info
   * GET /pb/info
   */
  fastify.get('/pb/info', async (request, reply) => {
    try {
      if (!fs.existsSync(WRAPPER_PATH)) {
        return {
          built: false,
          message: 'Wrapper not built. Run "npm run build" in apps/wrapper directory',
        };
      }

      const stats = fs.statSync(WRAPPER_PATH);
      const content = fs.readFileSync(WRAPPER_PATH, 'utf-8');

      // Extract version from wrapper (if present in preamble)
      const versionMatch = content.match(/v(\d+\.\d+\.\d+)/);
      const version = versionMatch ? versionMatch[1] : 'unknown';

      return {
        built: true,
        version,
        fileSize: stats.size,
        fileSizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        lastModified: stats.mtime,
        hasSourceMap: fs.existsSync(WRAPPER_SOURCE_MAP_PATH),
        endpoints: {
          generic: '/pb.min.js',
          publisherSpecific: '/pb/{apiKey}.js',
          sourceMap: '/pb.min.js.map',
        },
      };
    } catch (err) {
      fastify.log.error('Failed to get wrapper info:', err);
      return reply.code(500).send({ error: 'Failed to get wrapper info' });
    }
  });
}
