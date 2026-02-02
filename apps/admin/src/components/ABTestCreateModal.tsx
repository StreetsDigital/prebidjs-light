import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { ABTestBasicInfo } from './ABTestBasicInfo';
import { ABTestVariants, Variant } from './ABTestVariants';
import { ABTestReview } from './ABTestReview';

interface Props {
  publisherId: string;
  parentTestId?: string;
  parentVariantId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStep = 'basic' | 'variants' | 'review';

export function ABTestCreateModal({ publisherId, parentTestId, parentVariantId, onClose, onSuccess }: Props) {
  const { token } = useAuthStore();
  const [currentStep, setCurrentStep] = useState<WizardStep>('basic');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [variants, setVariants] = useState<Variant[]>([
    {
      name: 'Control',
      trafficPercent: 50,
      isControl: true,
      bidderTimeout: '',
      priceGranularity: '',
      enableSendAllBids: null,
      bidderSequence: '',
      additionalBidders: [],
    },
    {
      name: 'Variant A',
      trafficPercent: 50,
      isControl: false,
      bidderTimeout: '2000',
      priceGranularity: 'medium',
      enableSendAllBids: true,
      bidderSequence: 'random',
      additionalBidders: [],
    },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalTraffic = variants.reduce((sum, v) => sum + v.trafficPercent, 0);
  const isTrafficValid = totalTraffic === 100;

  const canProceedFromBasic = name.trim() !== '';
  const canProceedFromVariants = isTrafficValid && variants.filter(v => v.isControl).length === 1;

  const handleNext = () => {
    if (currentStep === 'basic' && canProceedFromBasic) {
      setCurrentStep('variants');
      setError(null);
    } else if (currentStep === 'variants' && canProceedFromVariants) {
      setCurrentStep('review');
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentStep === 'review') {
      setCurrentStep('variants');
    } else if (currentStep === 'variants') {
      setCurrentStep('basic');
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!name) {
      setError('Test name is required');
      return;
    }

    if (!isTrafficValid) {
      setError('Traffic percentages must sum to 100%');
      return;
    }

    const controlCount = variants.filter(v => v.isControl).length;
    if (controlCount !== 1) {
      setError('Exactly one control variant is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/publishers/${publisherId}/ab-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          description: description || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          parentTestId,
          parentVariantId,
          variants: variants.map(v => ({
            name: v.name,
            trafficPercent: v.trafficPercent,
            isControl: v.isControl,
            bidderTimeout: v.bidderTimeout ? parseInt(v.bidderTimeout) : undefined,
            priceGranularity: v.priceGranularity || undefined,
            enableSendAllBids: v.enableSendAllBids,
            bidderSequence: v.bidderSequence || undefined,
            additionalBidders: v.additionalBidders.length > 0
              ? v.additionalBidders.map(b => ({
                  bidderCode: b.bidderCode,
                  enabled: b.enabled,
                  params: JSON.parse(b.params),
                  timeoutOverride: b.timeoutOverride ? parseInt(b.timeoutOverride) : undefined,
                  priority: b.priority ? parseInt(b.priority) : 0,
                }))
              : undefined,
          })),
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create A/B test');
      }
    } catch (err) {
      setError('Failed to create A/B test');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'basic':
        return 'Basic Information';
      case 'variants':
        return 'Configure Variants';
      case 'review':
        return 'Review & Create';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">
              {parentTestId ? 'Create Nested A/B Test' : 'Create A/B Test'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`flex-1 h-2 rounded ${currentStep === 'basic' ? 'bg-blue-600' : 'bg-blue-200'}`} />
            <div className={`flex-1 h-2 rounded ${currentStep === 'variants' ? 'bg-blue-600' : currentStep === 'review' ? 'bg-blue-200' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded ${currentStep === 'review' ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>
          <p className="text-sm text-gray-600 mt-2">{getStepTitle()}</p>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 'basic' && (
            <ABTestBasicInfo
              name={name}
              description={description}
              startDate={startDate}
              endDate={endDate}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
            />
          )}

          {currentStep === 'variants' && (
            <ABTestVariants
              variants={variants}
              onVariantsChange={setVariants}
            />
          )}

          {currentStep === 'review' && (
            <ABTestReview
              name={name}
              description={description}
              startDate={startDate}
              endDate={endDate}
              variants={variants}
              parentTestId={parentTestId}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={currentStep === 'basic' ? onClose : handleBack}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {currentStep === 'basic' ? 'Cancel' : 'Back'}
          </button>

          {currentStep !== 'review' ? (
            <button
              onClick={handleNext}
              disabled={
                (currentStep === 'basic' && !canProceedFromBasic) ||
                (currentStep === 'variants' && !canProceedFromVariants)
              }
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create A/B Test'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
