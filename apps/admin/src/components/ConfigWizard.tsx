import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import ConfigWizardBasic from './ConfigWizardBasic';
import ConfigWizardAdvanced from './ConfigWizardAdvanced';
import ConfigWizardBidders from './ConfigWizardBidders';
import ConfigWizardReview from './ConfigWizardReview';

interface ConfigWizardProps {
  publisherId: string;
  websiteId?: string | null;
  config?: any;
  onClose: () => void;
  onSave: () => void;
}

export default function ConfigWizard({ publisherId, websiteId, config, onClose, onSave }: ConfigWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    description: '',
    status: 'draft' as 'draft' | 'active' | 'paused',
    isDefault: false,
    blockWrapper: false,

    // Step 2: Wrapper Settings
    bidderTimeout: 1500,
    priceGranularity: 'medium',
    enableSendAllBids: true,
    bidderSequence: 'random',
    debugMode: false,

    // Step 3: Bidders
    bidders: [] as any[],

    // Step 4: Targeting Rules
    targetingRules: {
      conditions: [] as any[],
      matchType: 'all' as 'all' | 'any',
      priority: 0,
    },
  });

  useEffect(() => {
    if (config) {
      // Load existing config for editing
      setFormData({
        name: config.name || '',
        description: config.description || '',
        status: config.status || 'draft',
        isDefault: config.isDefault || false,
        blockWrapper: config.blockWrapper || false,
        bidderTimeout: config.bidderTimeout || 1500,
        priceGranularity: config.priceGranularity || 'medium',
        enableSendAllBids: config.enableSendAllBids !== false,
        bidderSequence: config.bidderSequence || 'random',
        debugMode: config.debugMode || false,
        bidders: config.bidders ? JSON.parse(config.bidders) : [],
        targetingRules: {
          conditions: config.rules?.[0]?.conditions ? JSON.parse(config.rules[0].conditions) : [],
          matchType: config.rules?.[0]?.matchType || 'all',
          priority: config.rules?.[0]?.priority || 0,
        },
      });
    }
  }, [config]);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        websiteId: websiteId || undefined,
        bidders: formData.bidders.length > 0 ? formData.bidders : undefined,
        targetingRules: formData.targetingRules.conditions.length > 0 ? formData.targetingRules : undefined,
      };

      const url = config
        ? `/api/publishers/${publisherId}/configs/${config.id}`
        : `/api/publishers/${publisherId}/configs`;

      const method = config ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Failed to save config');

      onSave();
    } catch (err) {
      console.error('Error saving config:', err);
      alert('Failed to save config. Please try again.');
    }
  };

  const updateFormData = (updates: Partial<typeof formData>) => {
    setFormData({ ...formData, ...updates });
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.name.trim().length > 0;
      case 2:
        return formData.bidderTimeout > 0;
      case 3:
        return true; // Bidders are optional
      case 4:
        return true; // Targeting is optional
      default:
        return false;
    }
  };

  const stepLabels = ['Basic Info', 'Settings', 'Bidders', 'Targeting'];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {config ? 'Edit Config' : 'New Wrapper Config'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Step {step} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="Close wizard"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-purple-600' : 'bg-gray-200'}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            {stepLabels.map((label, idx) => (
              <span key={idx}>{label}</span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 1 && (
            <ConfigWizardBasic
              formData={{
                name: formData.name,
                description: formData.description,
                status: formData.status,
                isDefault: formData.isDefault,
                blockWrapper: formData.blockWrapper,
              }}
              onChange={updateFormData}
            />
          )}

          {step === 2 && (
            <ConfigWizardAdvanced
              formData={{
                bidderTimeout: formData.bidderTimeout,
                priceGranularity: formData.priceGranularity,
                enableSendAllBids: formData.enableSendAllBids,
                bidderSequence: formData.bidderSequence,
                debugMode: formData.debugMode,
              }}
              onChange={updateFormData}
            />
          )}

          {step === 3 && (
            <ConfigWizardBidders
              publisherId={publisherId}
              bidders={formData.bidders}
              onChange={(bidders) => updateFormData({ bidders })}
            />
          )}

          {step === 4 && (
            <ConfigWizardReview
              targetingRules={formData.targetingRules}
              onChange={(targetingRules) => updateFormData({ targetingRules })}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>

          <div className="flex gap-2">
            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={!isStepValid()}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!formData.name.trim()}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Check className="w-5 h-5" />
                Save Config
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
