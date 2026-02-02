import fetch from 'node-fetch';
import { db, publishers } from '../db';
import { eq } from 'drizzle-orm';

const CURRENCY_FILE_URL = 'https://cdn.jsdelivr.net/gh/prebid/currency-file@1/latest.json';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

interface CurrencyData {
  generatedAt: string;
  dataAsOf: string;
  conversions: {
    [sourceCurrency: string]: {
      [targetCurrency: string]: number;
    };
  };
}

interface CurrencyCache {
  data: CurrencyData | null;
  lastFetched: number;
}

const cache: CurrencyCache = {
  data: null,
  lastFetched: 0,
};

export class CurrencyService {
  /**
   * Fetch latest currency rates from Prebid CDN
   */
  static async fetchCurrencyRates(): Promise<CurrencyData> {
    const now = Date.now();

    // Return cached data if still valid
    if (cache.data && (now - cache.lastFetched < CACHE_DURATION)) {
      return cache.data;
    }

    try {
      const response = await fetch(CURRENCY_FILE_URL);
      if (!response.ok) {
        throw new Error(`Failed to fetch currency rates: ${response.statusText}`);
      }

      const data = await response.json() as CurrencyData;

      // Update cache
      cache.data = data;
      cache.lastFetched = now;

      return data;
    } catch (error) {
      console.error('Error fetching currency rates:', error);

      // Return cached data if available, even if expired
      if (cache.data) {
        return cache.data;
      }

      throw new Error('Currency rates unavailable');
    }
  }

  /**
   * Get conversion rate from source to target currency
   */
  static async getConversionRate(
    sourceCurrency: string,
    targetCurrency: string
  ): Promise<number | null> {
    const rates = await this.fetchCurrencyRates();

    if (!rates.conversions[sourceCurrency]) {
      return null;
    }

    return rates.conversions[sourceCurrency][targetCurrency] || null;
  }

  /**
   * Get currency configuration for a publisher
   */
  static getPublisherCurrency(publisherId: string): string {
    const publisher = db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .get();

    // Default to USD if not configured
    return publisher?.currency || 'USD';
  }

  /**
   * Get currency config for Prebid.js
   */
  static async getPrebidCurrencyConfig(publisherId: string): Promise<object> {
    const adServerCurrency = this.getPublisherCurrency(publisherId);
    const rates = await this.fetchCurrencyRates();

    return {
      adServerCurrency,
      granularityMultiplier: 1,
      conversionRateFile: {
        url: CURRENCY_FILE_URL,
        defaultRates: rates.conversions,
      },
    };
  }

  /**
   * Get all supported currencies
   */
  static async getSupportedCurrencies(): Promise<string[]> {
    const rates = await this.fetchCurrencyRates();
    return Object.keys(rates.conversions);
  }

  /**
   * Clear the cache (useful for testing)
   */
  static clearCache(): void {
    cache.data = null;
    cache.lastFetched = 0;
  }
}
