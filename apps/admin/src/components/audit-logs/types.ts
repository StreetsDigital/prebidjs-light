export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userId: string | null;
  userName: string;
  userEmail: string;
  ipAddress: string;
  userAgent: string;
  details: {
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  };
}
