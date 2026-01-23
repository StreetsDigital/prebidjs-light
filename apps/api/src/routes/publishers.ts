import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, publishers, publisherConfig } from '../db';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth, requireAdmin, requireRole, TokenPayload } from '../middleware/auth';

interface CreatePublisherBody {
  name: string;
  slug: string;
  domains?: string[];
  notes?: string;
}

interface UpdatePublisherBody {
  name?: string;
  slug?: string;
  domains?: string[];
  status?: 'active' | 'paused' | 'disabled';
  notes?: string;
}

export default async function publisherRoutes(fastify: FastifyInstance) {
  // List all publishers - admin only
  fastify.get('/', {
    preHandler: requireAdmin,
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as TokenPayload;

    // Super admin sees all publishers
    // Regular admin would see only assigned publishers (TODO: implement assignment)
    const allPublishers = db.select().from(publishers).all();

    return {
      publishers: allPublishers.map(p => ({
        ...p,
        domains: p.domains ? JSON.parse(p.domains) : [],
      })),
      total: allPublishers.length,
    };
  });

  // Get single publisher - admin or the publisher's own user
  fastify.get<{ Params: { id: string } }>('/:id', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization: admin/super_admin can see all, publisher can only see their own
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden', message: 'You can only access your own publisher data' });
    }

    return {
      ...publisher,
      domains: publisher.domains ? JSON.parse(publisher.domains) : [],
    };
  });

  // Create publisher - admin only
  fastify.post<{ Body: CreatePublisherBody }>('/', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { name, slug, domains, notes } = request.body;
    const user = request.user as TokenPayload;

    if (!name || !slug) {
      return reply.code(400).send({ error: 'Name and slug are required' });
    }

    // Check for duplicate slug
    const existing = db.select().from(publishers).where(eq(publishers.slug, slug)).get();
    if (existing) {
      return reply.code(409).send({ error: 'Publisher with this slug already exists' });
    }

    const now = new Date().toISOString();
    const id = uuidv4();
    const apiKey = `pb_${uuidv4().replace(/-/g, '')}`;

    db.insert(publishers).values({
      id,
      name,
      slug,
      apiKey,
      domains: domains ? JSON.stringify(domains) : null,
      status: 'active',
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId,
    }).run();

    // Create default config for the publisher
    db.insert(publisherConfig).values({
      id: uuidv4(),
      publisherId: id,
      bidderTimeout: 1500,
      priceGranularity: 'medium',
      enableSendAllBids: true,
      bidderSequence: 'random',
      debugMode: false,
      version: 1,
      createdAt: now,
      updatedAt: now,
    }).run();

    const newPublisher = db.select().from(publishers).where(eq(publishers.id, id)).get();

    return reply.code(201).send({
      ...newPublisher,
      domains: domains || [],
    });
  });

  // Update publisher - admin only
  fastify.put<{ Params: { id: string }; Body: UpdatePublisherBody }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;
    const { name, slug, domains, status, notes } = request.body;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // If slug is being changed, check for duplicates
    if (slug && slug !== publisher.slug) {
      const existing = db.select().from(publishers).where(eq(publishers.slug, slug)).get();
      if (existing) {
        return reply.code(409).send({ error: 'Publisher with this slug already exists' });
      }
    }

    const now = new Date().toISOString();

    db.update(publishers)
      .set({
        ...(name && { name }),
        ...(slug && { slug }),
        ...(domains !== undefined && { domains: JSON.stringify(domains) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
        updatedAt: now,
      })
      .where(eq(publishers.id, id))
      .run();

    const updated = db.select().from(publishers).where(eq(publishers.id, id)).get();

    return {
      ...updated,
      domains: updated?.domains ? JSON.parse(updated.domains) : [],
    };
  });

  // Delete publisher - admin only
  fastify.delete<{ Params: { id: string } }>('/:id', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Delete related config
    db.delete(publisherConfig).where(eq(publisherConfig.publisherId, id)).run();

    // Delete the publisher
    db.delete(publishers).where(eq(publishers.id, id)).run();

    return reply.code(204).send();
  });

  // Regenerate API key - admin only
  fastify.post<{ Params: { id: string } }>('/:id/regenerate-key', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { id } = request.params;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    const newApiKey = `pb_${uuidv4().replace(/-/g, '')}`;
    const now = new Date().toISOString();

    db.update(publishers)
      .set({ apiKey: newApiKey, updatedAt: now })
      .where(eq(publishers.id, id))
      .run();

    return { apiKey: newApiKey };
  });

  // Get embed code for publisher
  fastify.get<{ Params: { id: string } }>('/:id/embed-code', {
    preHandler: requireAuth,
  }, async (request, reply) => {
    const { id } = request.params;
    const user = request.user as TokenPayload;

    const publisher = db.select().from(publishers).where(eq(publishers.id, id)).get();
    if (!publisher) {
      return reply.code(404).send({ error: 'Publisher not found' });
    }

    // Check authorization
    if (user.role === 'publisher' && user.publisherId !== id) {
      return reply.code(403).send({ error: 'Forbidden' });
    }

    const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3001';

    const embedCode = `<!-- pbjs_engine Prebid Wrapper -->
<script src="${baseUrl}/pb.js?id=${publisher.apiKey}" async></script>`;

    return {
      embedCode,
      apiKey: publisher.apiKey,
    };
  });
}
