import { Variant } from './ABTestVariants';

interface Props {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  variants: Variant[];
  parentTestId?: string;
}

export function ABTestReview({ name, description, startDate, endDate, variants, parentTestId }: Props) {
  const totalTraffic = variants.reduce((sum, v) => sum + v.trafficPercent, 0);
  const controlVariant = variants.find(v => v.isControl);

  return (
    <div className="space-y-6">
      {/* Test Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Test Details</h3>
        <dl className="space-y-2">
          <div className="flex">
            <dt className="text-sm font-medium text-gray-700 w-32">Name:</dt>
            <dd className="text-sm text-gray-900">{name}</dd>
          </div>
          {description && (
            <div className="flex">
              <dt className="text-sm font-medium text-gray-700 w-32">Description:</dt>
              <dd className="text-sm text-gray-900">{description}</dd>
            </div>
          )}
          {startDate && (
            <div className="flex">
              <dt className="text-sm font-medium text-gray-700 w-32">Start Date:</dt>
              <dd className="text-sm text-gray-900">{new Date(startDate).toLocaleString()}</dd>
            </div>
          )}
          {endDate && (
            <div className="flex">
              <dt className="text-sm font-medium text-gray-700 w-32">End Date:</dt>
              <dd className="text-sm text-gray-900">{new Date(endDate).toLocaleString()}</dd>
            </div>
          )}
          {parentTestId && (
            <div className="flex">
              <dt className="text-sm font-medium text-gray-700 w-32">Type:</dt>
              <dd className="text-sm text-gray-900">Nested A/B Test</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Traffic Distribution */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Traffic Distribution</h3>
        <div className="space-y-3">
          {variants.map((variant, index) => (
            <div key={index} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-gray-900">{variant.name}</span>
                  {variant.isControl && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Control</span>
                  )}
                </div>
                <span className="text-sm font-semibold text-blue-600">{variant.trafficPercent}%</span>
              </div>

              {/* Configuration Summary */}
              <div className="text-xs text-gray-600 space-y-1">
                {variant.bidderTimeout && (
                  <div>Timeout: {variant.bidderTimeout}ms</div>
                )}
                {variant.priceGranularity && (
                  <div>Price Granularity: {variant.priceGranularity}</div>
                )}
                {variant.bidderSequence && (
                  <div>Bidder Sequence: {variant.bidderSequence}</div>
                )}
                {variant.enableSendAllBids !== null && (
                  <div>Send All Bids: {variant.enableSendAllBids ? 'Enabled' : 'Disabled'}</div>
                )}
                {variant.additionalBidders.length > 0 && (
                  <div>
                    Additional Bidders: {variant.additionalBidders.map(b => b.bidderCode).join(', ')}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium text-gray-700">Total Traffic:</span>
          <span
            className={`text-sm font-semibold px-3 py-1 rounded ${
              totalTraffic === 100
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {totalTraffic}%
          </span>
        </div>
      </div>

      {/* Validation Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Ready to Create</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>✓ {variants.length} variants configured</li>
          <li>✓ Control variant: {controlVariant?.name}</li>
          <li>✓ Traffic distribution: {totalTraffic}%</li>
          {parentTestId && <li>✓ Nested test configuration</li>}
        </ul>
      </div>
    </div>
  );
}
