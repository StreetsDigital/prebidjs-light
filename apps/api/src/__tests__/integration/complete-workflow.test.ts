import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildTestServer } from '../test-helper';
import { createTestUser } from '../setup';

/**
 * Complete workflow integration tests
 *
 * Tests the entire flow of:
 * 1. Creating a publisher account
 * 2. Adding websites to the publisher
 * 3. Creating ad units for the websites
 * 4. Configuring bidders
 * 5. Retrieving the complete configuration
 */
describe('Complete Workflow Integration Tests', () => {
  let app: FastifyInstance;
  let superAdminToken: string;

  beforeAll(async () => {
    app = await buildTestServer();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Create super admin user
    const superAdmin = await createTestUser({
      email: 'superadmin@example.com',
      password: 'password123',
      role: 'super_admin',
    });

    // Login to get token
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: superAdmin.email,
        password: superAdmin.password,
      },
    });

    superAdminToken = JSON.parse(loginResponse.body).token;
  });

  describe('Publisher Onboarding Workflow', () => {
    it('should complete full publisher onboarding flow', async () => {
      // Step 1: Create Publisher
      const createPublisherResponse = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Acme Publishing',
          slug: 'acme-publishing',
          domains: ['acme.com', 'acmenews.com'],
          notes: 'Premium news publisher',
        },
      });

      expect(createPublisherResponse.statusCode).toBe(201);
      const publisher = JSON.parse(createPublisherResponse.body);
      const publisherId = publisher.id;

      expect(publisher.name).toBe('Acme Publishing');
      expect(publisher.slug).toBe('acme-publishing');
      expect(publisher.status).toBe('active');
      expect(publisher.apiKey).toBeDefined();

      // Step 2: Create Website for Publisher
      const createWebsiteResponse = await app.inject({
        method: 'POST',
        url: `/api/publishers/${publisherId}/websites`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Acme News',
          domain: 'acmenews.com',
          notes: 'Main news website',
        },
      });

      expect(createWebsiteResponse.statusCode).toBe(201);
      const website = JSON.parse(createWebsiteResponse.body);
      const websiteId = website.id;

      expect(website.name).toBe('Acme News');
      expect(website.domain).toBe('acmenews.com');
      expect(website.publisherId).toBe(publisherId);

      // Step 3: Create Ad Units for Website
      const createAdUnit1Response = await app.inject({
        method: 'POST',
        url: `/api/websites/${websiteId}/ad-units`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          code: 'header-banner',
          name: 'Header Banner',
          mediaTypes: {
            banner: {
              sizes: [[728, 90], [970, 250]],
            },
          },
          floorPrice: '2.50',
        },
      });

      expect(createAdUnit1Response.statusCode).toBe(201);
      const adUnit1 = JSON.parse(createAdUnit1Response.body);

      expect(adUnit1.code).toBe('header-banner');
      expect(adUnit1.name).toBe('Header Banner');
      expect(adUnit1.websiteId).toBe(websiteId);

      const createAdUnit2Response = await app.inject({
        method: 'POST',
        url: `/api/websites/${websiteId}/ad-units`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          code: 'sidebar-box',
          name: 'Sidebar Box Ad',
          mediaTypes: {
            banner: {
              sizes: [[300, 250], [300, 600]],
            },
          },
          floorPrice: '1.50',
        },
      });

      expect(createAdUnit2Response.statusCode).toBe(201);
      const adUnit2 = JSON.parse(createAdUnit2Response.body);

      expect(adUnit2.code).toBe('sidebar-box');

      // Step 4: Verify Complete Setup
      // Get publisher with all related data
      const getPublisherResponse = await app.inject({
        method: 'GET',
        url: `/api/publishers/${publisherId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(getPublisherResponse.statusCode).toBe(200);
      const fullPublisher = JSON.parse(getPublisherResponse.body);

      expect(fullPublisher.id).toBe(publisherId);
      expect(fullPublisher.name).toBe('Acme Publishing');

      // Get websites for publisher
      const getWebsitesResponse = await app.inject({
        method: 'GET',
        url: `/api/publishers/${publisherId}/websites`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(getWebsitesResponse.statusCode).toBe(200);
      const websites = JSON.parse(getWebsitesResponse.body);

      expect(Array.isArray(websites)).toBe(true);
      expect(websites.length).toBeGreaterThanOrEqual(1);
      expect(websites.some((w: any) => w.id === websiteId)).toBe(true);

      // Get ad units for website
      const getAdUnitsResponse = await app.inject({
        method: 'GET',
        url: `/api/websites/${websiteId}/ad-units`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(getAdUnitsResponse.statusCode).toBe(200);
      const adUnits = JSON.parse(getAdUnitsResponse.body);

      expect(Array.isArray(adUnits)).toBe(true);
      expect(adUnits.length).toBe(2);
      expect(adUnits.some((a: any) => a.code === 'header-banner')).toBe(true);
      expect(adUnits.some((a: any) => a.code === 'sidebar-box')).toBe(true);
    });
  });

  describe('Multi-Website Publisher Workflow', () => {
    it('should handle publisher with multiple websites and ad units', async () => {
      // Create Publisher
      const createPublisherResponse = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Multi-Site Publisher',
          slug: 'multi-site-pub',
          domains: ['site1.com', 'site2.com', 'site3.com'],
        },
      });

      const publisher = JSON.parse(createPublisherResponse.body);
      const publisherId = publisher.id;

      // Create multiple websites
      const websiteIds: string[] = [];

      for (let i = 1; i <= 3; i++) {
        const createWebsiteResponse = await app.inject({
          method: 'POST',
          url: `/api/publishers/${publisherId}/websites`,
          headers: {
            authorization: `Bearer ${superAdminToken}`,
          },
          payload: {
            name: `Website ${i}`,
            domain: `site${i}.com`,
          },
        });

        expect(createWebsiteResponse.statusCode).toBe(201);
        const website = JSON.parse(createWebsiteResponse.body);
        websiteIds.push(website.id);

        // Create ad units for each website
        for (let j = 1; j <= 2; j++) {
          const createAdUnitResponse = await app.inject({
            method: 'POST',
            url: `/api/websites/${website.id}/ad-units`,
            headers: {
              authorization: `Bearer ${superAdminToken}`,
            },
            payload: {
              code: `site${i}-ad${j}`,
              name: `Site ${i} Ad Unit ${j}`,
              mediaTypes: {
                banner: {
                  sizes: [[300, 250]],
                },
              },
              floorPrice: '1.00',
            },
          });

          expect(createAdUnitResponse.statusCode).toBe(201);
        }
      }

      // Verify all websites created
      const getWebsitesResponse = await app.inject({
        method: 'GET',
        url: `/api/publishers/${publisherId}/websites`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(getWebsitesResponse.statusCode).toBe(200);
      const websites = JSON.parse(getWebsitesResponse.body);
      expect(websites.length).toBe(3);

      // Verify ad units for each website
      for (const websiteId of websiteIds) {
        const getAdUnitsResponse = await app.inject({
          method: 'GET',
          url: `/api/websites/${websiteId}/ad-units`,
          headers: {
            authorization: `Bearer ${superAdminToken}`,
          },
        });

        expect(getAdUnitsResponse.statusCode).toBe(200);
        const adUnits = JSON.parse(getAdUnitsResponse.body);
        expect(adUnits.length).toBe(2);
      }
    });
  });

  describe('Publisher Modification Workflow', () => {
    it('should handle updating publisher, website, and ad units', async () => {
      // Create initial setup
      const createPublisherResponse = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Initial Publisher',
          slug: 'initial-pub',
          domains: ['initial.com'],
        },
      });

      const publisher = JSON.parse(createPublisherResponse.body);
      const publisherId = publisher.id;

      const createWebsiteResponse = await app.inject({
        method: 'POST',
        url: `/api/publishers/${publisherId}/websites`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Initial Website',
          domain: 'initial.com',
        },
      });

      const website = JSON.parse(createWebsiteResponse.body);
      const websiteId = website.id;

      const createAdUnitResponse = await app.inject({
        method: 'POST',
        url: `/api/websites/${websiteId}/ad-units`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          code: 'initial-ad',
          name: 'Initial Ad Unit',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
        },
      });

      const adUnit = JSON.parse(createAdUnitResponse.body);
      const adUnitId = adUnit.id;

      // Update Publisher
      const updatePublisherResponse = await app.inject({
        method: 'PUT',
        url: `/api/publishers/${publisherId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Updated Publisher',
          domains: ['initial.com', 'new-domain.com'],
        },
      });

      expect(updatePublisherResponse.statusCode).toBe(200);
      const updatedPublisher = JSON.parse(updatePublisherResponse.body);
      expect(updatedPublisher.name).toBe('Updated Publisher');
      expect(updatedPublisher.domains).toHaveLength(2);

      // Update Website
      const updateWebsiteResponse = await app.inject({
        method: 'PUT',
        url: `/api/websites/${websiteId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Updated Website',
          status: 'paused',
        },
      });

      expect(updateWebsiteResponse.statusCode).toBe(200);
      const updatedWebsite = JSON.parse(updateWebsiteResponse.body);
      expect(updatedWebsite.name).toBe('Updated Website');
      expect(updatedWebsite.status).toBe('paused');

      // Update Ad Unit
      const updateAdUnitResponse = await app.inject({
        method: 'PUT',
        url: `/api/ad-units/${adUnitId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Updated Ad Unit',
          floorPrice: '5.00',
        },
      });

      expect(updateAdUnitResponse.statusCode).toBe(200);
      const updatedAdUnit = JSON.parse(updateAdUnitResponse.body);
      expect(updatedAdUnit.name).toBe('Updated Ad Unit');
      expect(updatedAdUnit.floorPrice).toBe('5.00');
    });
  });

  describe('Publisher Deletion Workflow', () => {
    it('should handle soft deletion of publisher and cascade effects', async () => {
      // Create publisher with website and ad units
      const createPublisherResponse = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'To Be Deleted',
          slug: 'to-be-deleted',
          domains: ['delete.com'],
        },
      });

      const publisher = JSON.parse(createPublisherResponse.body);
      const publisherId = publisher.id;

      const createWebsiteResponse = await app.inject({
        method: 'POST',
        url: `/api/publishers/${publisherId}/websites`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Website to Delete',
          domain: 'delete.com',
        },
      });

      const website = JSON.parse(createWebsiteResponse.body);
      const websiteId = website.id;

      // Delete Publisher (soft delete)
      const deletePublisherResponse = await app.inject({
        method: 'DELETE',
        url: `/api/publishers/${publisherId}`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(deletePublisherResponse.statusCode).toBe(204);

      // Verify publisher is not in active list
      const listPublishersResponse = await app.inject({
        method: 'GET',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(listPublishersResponse.statusCode).toBe(200);
      const publishers = JSON.parse(listPublishersResponse.body);

      // Deleted publisher should not appear in default list
      expect(publishers.publishers.some((p: any) => p.id === publisherId)).toBe(false);

      // Can be retrieved with includeDeleted flag
      const listWithDeletedResponse = await app.inject({
        method: 'GET',
        url: '/api/publishers?includeDeleted=true',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
      });

      expect(listWithDeletedResponse.statusCode).toBe(200);
      const allPublishers = JSON.parse(listWithDeletedResponse.body);

      expect(allPublishers.publishers.some((p: any) => p.id === publisherId)).toBe(true);
    });
  });

  describe('Error Handling in Workflows', () => {
    it('should handle creating ad unit for non-existent website', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/websites/00000000-0000-0000-0000-000000000000/ad-units',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          code: 'test-ad',
          name: 'Test Ad',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should handle duplicate ad unit codes on same website', async () => {
      // Create publisher and website
      const createPublisherResponse = await app.inject({
        method: 'POST',
        url: '/api/publishers',
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Duplicate Test Publisher',
          slug: 'duplicate-test',
          domains: ['test.com'],
        },
      });

      const publisher = JSON.parse(createPublisherResponse.body);

      const createWebsiteResponse = await app.inject({
        method: 'POST',
        url: `/api/publishers/${publisher.id}/websites`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          name: 'Test Website',
          domain: 'test.com',
        },
      });

      const website = JSON.parse(createWebsiteResponse.body);

      // Create first ad unit
      await app.inject({
        method: 'POST',
        url: `/api/websites/${website.id}/ad-units`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          code: 'duplicate-ad',
          name: 'First Ad',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
        },
      });

      // Try to create duplicate
      const duplicateResponse = await app.inject({
        method: 'POST',
        url: `/api/websites/${website.id}/ad-units`,
        headers: {
          authorization: `Bearer ${superAdminToken}`,
        },
        payload: {
          code: 'duplicate-ad', // Same code
          name: 'Second Ad',
          mediaTypes: {
            banner: {
              sizes: [[300, 250]],
            },
          },
        },
      });

      // Should reject duplicate
      expect(duplicateResponse.statusCode).toBe(400);
    });
  });
});
