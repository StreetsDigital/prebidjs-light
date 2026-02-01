import { db } from '../db/index.js';
import { configurationTemplates } from '../db/schema.js';
import { v4 as uuidv4 } from 'uuid';
import { eq } from 'drizzle-orm';

/**
 * Preset Configuration Templates
 * Pre-built templates for common publisher use cases
 */

const PRESET_TEMPLATES = [
  {
    name: 'Video-Heavy Site',
    description: 'Optimized for video content with video-focused bidders and VAST support',
    configJson: {
      bidders: ['rubicon', 'appnexus', 'ix', 'openx', 'pubmatic'],
      modules: [
        { code: 'consentManagement', name: 'Consent Management', category: 'recommended' },
        { code: 'priceFloors', name: 'Price Floors', category: 'general' },
        { code: 'userId', name: 'User ID', category: 'userId' },
        { code: 'videoModule', name: 'Video Module', category: 'general' },
      ],
      analytics: [
        { code: 'ga', name: 'Google Analytics', params: { enableDistribution: true } },
      ],
    },
  },
  {
    name: 'News Publisher',
    description: 'Standard configuration for news and editorial content',
    configJson: {
      bidders: ['rubicon', 'appnexus', 'ix', 'pubmatic', 'criteo'],
      modules: [
        { code: 'consentManagement', name: 'Consent Management', category: 'recommended' },
        { code: 'priceFloors', name: 'Price Floors', category: 'general' },
        { code: 'userId', name: 'User ID', category: 'userId' },
        { code: 'schain', name: 'Supply Chain', category: 'general' },
      ],
      analytics: [
        { code: 'ga', name: 'Google Analytics' },
      ],
    },
  },
  {
    name: 'Mobile-First',
    description: 'Optimized for mobile traffic with mobile-friendly bidders',
    configJson: {
      bidders: ['rubicon', 'ix', 'pubmatic', 'sovrn', 'smartadserver'],
      modules: [
        { code: 'consentManagement', name: 'Consent Management', category: 'recommended' },
        { code: 'priceFloors', name: 'Price Floors', category: 'general' },
        { code: 'userId', name: 'User ID', category: 'userId' },
      ],
      analytics: [
        { code: 'ga', name: 'Google Analytics' },
      ],
    },
  },
  {
    name: 'Privacy-Focused',
    description: 'GDPR and CCPA compliant setup with privacy modules',
    configJson: {
      bidders: ['rubicon', 'appnexus', 'ix', 'pubmatic'],
      modules: [
        { code: 'consentManagement', name: 'Consent Management', category: 'recommended' },
        { code: 'userId', name: 'User ID', category: 'userId' },
        { code: 'schain', name: 'Supply Chain', category: 'general' },
      ],
      analytics: [],
    },
  },
  {
    name: 'High CPM',
    description: 'Premium bidders for maximum revenue',
    configJson: {
      bidders: ['rubicon', 'appnexus', 'ix', 'pubmatic', 'criteo', 'openx'],
      modules: [
        { code: 'priceFloors', name: 'Price Floors', category: 'general' },
        { code: 'consentManagement', name: 'Consent Management', category: 'recommended' },
        { code: 'userId', name: 'User ID', category: 'userId' },
      ],
      analytics: [
        { code: 'ga', name: 'Google Analytics' },
        { code: 'pubstack', name: 'PubStack' },
      ],
    },
  },
  {
    name: 'Starter Template',
    description: 'Basic setup for new publishers getting started',
    configJson: {
      bidders: ['rubicon', 'appnexus', 'ix'],
      modules: [
        { code: 'consentManagement', name: 'Consent Management', category: 'recommended' },
        { code: 'priceFloors', name: 'Price Floors', category: 'general' },
      ],
      analytics: [
        { code: 'ga', name: 'Google Analytics' },
      ],
    },
  },
];

/**
 * Seed preset templates into the database
 */
export async function seedPresetTemplates(): Promise<void> {
  const now = new Date().toISOString();

  for (const template of PRESET_TEMPLATES) {
    // Check if template already exists
    const existing = db
      .select()
      .from(configurationTemplates)
      .where(eq(configurationTemplates.name, template.name))
      .get();

    if (existing) {
      // Update existing template
      db.update(configurationTemplates)
        .set({
          description: template.description,
          configJson: JSON.stringify(template.configJson),
          updatedAt: now,
        })
        .where(eq(configurationTemplates.id, existing.id))
        .run();
    } else {
      // Insert new template
      db.insert(configurationTemplates)
        .values({
          id: uuidv4(),
          name: template.name,
          description: template.description,
          templateType: 'preset',
          creatorPublisherId: null,
          isPublic: 1,
          configJson: JSON.stringify(template.configJson),
          useCount: 0,
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }
  }

  console.log(`Seeded ${PRESET_TEMPLATES.length} preset templates`);
}
