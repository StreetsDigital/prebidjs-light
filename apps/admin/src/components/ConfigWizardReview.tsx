import TargetingBuilder from './TargetingBuilder';

interface TargetingRules {
  conditions: any[];
  matchType: 'all' | 'any';
  priority: number;
}

interface ConfigWizardReviewProps {
  targetingRules: TargetingRules;
  onChange: (rules: TargetingRules) => void;
}

export default function ConfigWizardReview({ targetingRules, onChange }: ConfigWizardReviewProps) {
  return (
    <TargetingBuilder
      conditions={targetingRules.conditions}
      matchType={targetingRules.matchType}
      priority={targetingRules.priority}
      onChange={onChange}
    />
  );
}
