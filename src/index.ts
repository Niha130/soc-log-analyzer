// ─── Log Entry ───────────────────────────────────────────────────────────────
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type LogCategory =
  | 'AUTH'
  | 'NETWORK'
  | 'SYSTEM'
  | 'MALWARE'
  | 'INTRUSION'
  | 'DATA_EXFIL'
  | 'RECON'
  | 'POLICY';

export interface LogEntry {
  id: string;
  timestamp: string;
  severity: Severity;
  category: LogCategory;
  sourceIp: string;
  destIp?: string;
  hostname: string;
  user?: string;
  message: string;
  rawLog: string;
  protocol?: string;
  port?: number;
  bytes?: number;
  country?: string;
  isThreat: boolean;
  tags: string[];
}

// ─── Alert ───────────────────────────────────────────────────────────────────
export type AlertStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export interface Alert {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: LogCategory;
  status: AlertStatus;
  affectedHost: string;
  sourceIp: string;
  timestamp: string;
  updatedAt: string;
  relatedLogs: string[];
  analyst?: string;
  mitreTactic?: string;
  mitreId?: string;
}

// ─── Threat Intel ─────────────────────────────────────────────────────────────
export type ThreatType = 'IP' | 'DOMAIN' | 'HASH' | 'URL' | 'EMAIL';

export interface ThreatIndicator {
  id: string;
  type: ThreatType;
  value: string;
  severity: Severity;
  description: string;
  source: string;
  firstSeen: string;
  lastSeen: string;
  hitCount: number;
  tags: string[];
  country?: string;
}

// ─── Data Source ──────────────────────────────────────────────────────────────
export type SourceStatus = 'ACTIVE' | 'INACTIVE' | 'ERROR' | 'WARNING';
export type SourceType = 'SIEM' | 'FIREWALL' | 'IDS' | 'EDR' | 'PROXY' | 'DNS' | 'CLOUD';

export interface DataSource {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  host: string;
  port: number;
  protocol: string;
  logsPerMinute: number;
  lastEvent: string;
  totalEvents: number;
  errorCount: number;
  description: string;
}

// ─── Stats ────────────────────────────────────────────────────────────────────
export interface ThreatStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  openAlerts: number;
  resolvedToday: number;
  falsePositives: number;
}

export interface TimeSeriesPoint {
  time: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}
