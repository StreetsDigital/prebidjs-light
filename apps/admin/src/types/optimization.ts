export interface Condition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
  value: number;
  timeWindow: string;
  target?: string;
}

export interface Action {
  type: string;
  target?: string;
  value?: any;
  notification?: {
    channels: ('email' | 'slack' | 'webhook')[];
    message: string;
  };
}

export interface Schedule {
  daysOfWeek?: number[];
  hoursOfDay?: number[];
  startDate?: string;
  endDate?: string;
}

export interface OptimizationRule {
  id: string;
  publisherId: string;
  name: string;
  description: string | null;
  ruleType: 'auto_disable_bidder' | 'auto_adjust_timeout' | 'auto_adjust_floor' | 'auto_enable_bidder' | 'alert_notification' | 'traffic_allocation';
  conditions: Condition[];
  actions: Action[];
  schedule: Schedule | null;
  enabled: boolean;
  priority: number;
  lastExecuted: string | null;
  executionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleType: string;
  conditionsMet: Condition[];
  actionsPerformed: Action[];
  result: 'success' | 'failure' | 'skipped';
  errorMessage: string | null;
  metricsSnapshot: any;
  executedAt: string;
}
