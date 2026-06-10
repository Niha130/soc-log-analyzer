import type {
  LogEntry, Alert, ThreatIndicator, DataSource,
  Severity, LogCategory, AlertStatus, ThreatType, SourceType, SourceStatus
} from '../types';

const severities: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
const categories: LogCategory[] = ['AUTH', 'NETWORK', 'SYSTEM', 'MALWARE', 'INTRUSION', 'DATA_EXFIL', 'RECON', 'POLICY'];

const threatMessages: Record<LogCategory, string[]> = {
  AUTH: [
    'Multiple failed SSH login attempts from external IP',
    'Brute-force attack detected on /admin panel',
    'Privilege escalation attempt by user account',
    'Successful login after 47 failed attempts – possible credential stuffing',
    'Password spray attack detected across 23 accounts',
  ],
  NETWORK: [
    'Outbound connection to known C2 infrastructure',
    'Suspicious DNS query to newly registered domain',
    'Lateral movement detected on internal subnet',
    'Port scan sweep from internal host',
    'Unusual data transfer volume to external IP',
  ],
  SYSTEM: [
    'Unauthorized cron job added to root crontab',
    'Critical system file modification detected',
    'Kernel module loaded from non-standard path',
    'Suspicious child process spawned from web server',
    'Memory injection detected in running process',
  ],
  MALWARE: [
    'Ransomware encryption pattern detected',
    'Known malware hash matched in process list',
    'Trojan downloader behaviour observed',
    'Suspicious PowerShell execution with encoded payload',
    'Rootkit activity detected in kernel space',
  ],
  INTRUSION: [
    'SQL injection attempt on login endpoint',
    'Remote code execution attempt via CVE-2024-1234',
    'Directory traversal attack on web server',
    'XSS payload detected in form submission',
    'SSRF attempt targeting internal metadata service',
  ],
  DATA_EXFIL: [
    'Large file upload to unapproved cloud storage',
    'Database dump exported and compressed',
    'Sensitive data transmitted over unencrypted channel',
    'Clipboard data exfiltration by browser extension',
    'Email attachment contains encoded corporate data',
  ],
  RECON: [
    'Nmap scan detected from external IP',
    'OSINT tool fingerprint identified in user-agent',
    'Active directory enumeration by service account',
    'AWS metadata endpoint probed by EC2 instance',
    'SNMP community string brute-force attempt',
  ],
  POLICY: [
    'USB storage device connected on endpoint',
    'Unauthorized software installation attempt',
    'VPN split tunnelling policy violation',
    'Access to restricted resource outside business hours',
    'Data classification policy bypass attempted',
  ],
};

const ips = () => `${rnd(1, 254)}.${rnd(1, 254)}.${rnd(1, 254)}.${rnd(1, 254)}`;
const internalIps = ['10.0.1.5', '10.0.1.12', '192.168.0.44', '10.10.5.88', '172.16.0.3'];
const hostnames = ['web-prod-01', 'db-server-02', 'auth-svc-03', 'proxy-01', 'endpoint-win-07', 'linux-dev-04', 'dc-01', 'api-gateway-02'];
const users = ['admin', 'svc_account', 'jsmith', 'root', 'deploy_user', 'niha130', 'guest', 'backup_svc'];
const countries = ['RU', 'CN', 'KP', 'IR', 'BR', 'US', 'DE', 'IN', 'UA', 'NL'];
const protocols = ['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'RDP', 'SMB'];
const mitreIds: Record<string, string> = {
  AUTH: 'T1110',
  NETWORK: 'T1071',
  SYSTEM: 'T1053',
  MALWARE: 'T1055',
  INTRUSION: 'T1190',
  DATA_EXFIL: 'T1048',
  RECON: 'T1595',
  POLICY: 'T1091',
};

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function timeAgo(minutesBack: number): string {
  const d = new Date(Date.now() - minutesBack * 60000);
  return d.toISOString();
}

export function generateLogEntry(id: number): LogEntry {
  const category = pick(categories);
  const severity = pick(severities);
  const isThreat = severity === 'CRITICAL' || severity === 'HIGH' || (severity === 'MEDIUM' && Math.random() > 0.5);
  const messages = threatMessages[category];

  return {
    id: `LOG-${String(id).padStart(6, '0')}`,
    timestamp: timeAgo(rnd(0, 60)),
    severity,
    category,
    sourceIp: isThreat ? ips() : pick(internalIps),
    destIp: pick(internalIps),
    hostname: pick(hostnames),
    user: Math.random() > 0.4 ? pick(users) : undefined,
    message: pick(messages),
    rawLog: `[${new Date().toISOString()}] ${category} ${severity} src=${ips()} dst=${pick(internalIps)} proto=${pick(protocols)} msg="${pick(messages)}"`,
    protocol: pick(protocols),
    port: pick([22, 80, 443, 3389, 445, 53, 8080, 3306]),
    bytes: rnd(128, 50000),
    country: isThreat ? pick(countries) : 'US',
    isThreat,
    tags: [category.toLowerCase(), severity.toLowerCase(), isThreat ? 'threat' : 'normal'].filter(Boolean),
  };
}

export function generateInitialLogs(count: number): LogEntry[] {
  return Array.from({ length: count }, (_, i) => generateLogEntry(i + 1));
}

export function generateAlerts(): Alert[] {
  const statuses: AlertStatus[] = ['OPEN', 'INVESTIGATING', 'RESOLVED', 'FALSE_POSITIVE'];
  const alerts: Alert[] = [
    {
      id: 'ALT-001',
      title: 'Ransomware Activity on db-server-02',
      description: 'Encryption pattern consistent with LockBit 3.0 detected. Rapid file modification across shared drives.',
      severity: 'CRITICAL',
      category: 'MALWARE',
      status: 'INVESTIGATING',
      affectedHost: 'db-server-02',
      sourceIp: '185.220.101.47',
      timestamp: timeAgo(12),
      updatedAt: timeAgo(5),
      relatedLogs: ['LOG-000023', 'LOG-000024', 'LOG-000025'],
      analyst: 'niha130',
      mitreTactic: 'Impact',
      mitreId: 'T1486',
    },
    {
      id: 'ALT-002',
      title: 'Credential Stuffing on Auth Portal',
      description: '2,400 failed login attempts in 8 minutes across 150 unique usernames from a single IP.',
      severity: 'HIGH',
      category: 'AUTH',
      status: 'OPEN',
      affectedHost: 'auth-svc-03',
      sourceIp: '91.234.99.12',
      timestamp: timeAgo(30),
      updatedAt: timeAgo(30),
      relatedLogs: ['LOG-000012', 'LOG-000013'],
      mitreTactic: 'Credential Access',
      mitreId: 'T1110',
    },
    {
      id: 'ALT-003',
      title: 'C2 Beacon from web-prod-01',
      description: 'Outbound HTTPS to known Cobalt Strike C2 at 5-minute intervals. Possible implant active.',
      severity: 'CRITICAL',
      category: 'NETWORK',
      status: 'OPEN',
      affectedHost: 'web-prod-01',
      sourceIp: '10.0.1.5',
      timestamp: timeAgo(7),
      updatedAt: timeAgo(2),
      relatedLogs: ['LOG-000041', 'LOG-000042'],
      mitreTactic: 'Command and Control',
      mitreId: 'T1071',
    },
    {
      id: 'ALT-004',
      title: 'Suspicious Data Export by svc_account',
      description: '14 GB database dump compressed and staged in /tmp before external transfer attempt.',
      severity: 'HIGH',
      category: 'DATA_EXFIL',
      status: 'INVESTIGATING',
      affectedHost: 'db-server-02',
      sourceIp: '10.10.5.88',
      timestamp: timeAgo(45),
      updatedAt: timeAgo(20),
      relatedLogs: ['LOG-000055', 'LOG-000056'],
      analyst: 'niha130',
      mitreTactic: 'Exfiltration',
      mitreId: 'T1048',
    },
    {
      id: 'ALT-005',
      title: 'Port Scan from endpoint-win-07',
      description: 'Internal host scanning /24 subnet on ports 22, 445, 3389. Possible lateral movement prep.',
      severity: 'MEDIUM',
      category: 'RECON',
      status: 'OPEN',
      affectedHost: 'endpoint-win-07',
      sourceIp: '192.168.0.44',
      timestamp: timeAgo(55),
      updatedAt: timeAgo(55),
      relatedLogs: ['LOG-000070'],
      mitreTactic: 'Discovery',
      mitreId: 'T1046',
    },
    {
      id: 'ALT-006',
      title: 'Scheduled Task Persistence on dc-01',
      description: 'New scheduled task registered under SYSTEM account executing encoded PowerShell at logon.',
      severity: 'HIGH',
      category: 'SYSTEM',
      status: 'RESOLVED',
      affectedHost: 'dc-01',
      sourceIp: '172.16.0.3',
      timestamp: timeAgo(120),
      updatedAt: timeAgo(90),
      relatedLogs: ['LOG-000088'],
      analyst: 'niha130',
      mitreTactic: 'Persistence',
      mitreId: 'T1053',
    },
  ];

  return alerts.map(a => ({
    ...a,
    status: Math.random() > 0.7 ? pick(statuses) : a.status,
  }));
}

export function generateThreatIndicators(): ThreatIndicator[] {
  const types: ThreatType[] = ['IP', 'DOMAIN', 'HASH', 'URL', 'EMAIL'];
  const sources = ['VirusTotal', 'Shodan', 'AbuseIPDB', 'AlienVault OTX', 'MISP', 'Internal Intel'];

  return [
    { id: 'IOC-001', type: 'IP', value: '185.220.101.47', severity: 'CRITICAL', description: 'Known Tor exit node used in ransomware campaigns', source: 'AbuseIPDB', firstSeen: timeAgo(2880), lastSeen: timeAgo(12), hitCount: 14, tags: ['tor', 'ransomware', 'c2'], country: 'RU' },
    { id: 'IOC-002', type: 'DOMAIN', value: 'update-service-cdn[.]xyz', severity: 'HIGH', description: 'Cobalt Strike C2 domain registered 3 days ago', source: 'VirusTotal', firstSeen: timeAgo(4320), lastSeen: timeAgo(7), hitCount: 3, tags: ['c2', 'cobalt-strike'], country: 'KP' },
    { id: 'IOC-003', type: 'HASH', value: 'a3f5c8b2d1e9...4a7f', severity: 'CRITICAL', description: 'LockBit 3.0 ransomware payload SHA-256', source: 'VirusTotal', firstSeen: timeAgo(1440), lastSeen: timeAgo(12), hitCount: 1, tags: ['ransomware', 'lockbit'], country: 'RU' },
    { id: 'IOC-004', type: 'IP', value: '91.234.99.12', severity: 'HIGH', description: 'Credential stuffing botnet node', source: 'AlienVault OTX', firstSeen: timeAgo(720), lastSeen: timeAgo(30), hitCount: 7, tags: ['bruteforce', 'credential-stuffing'], country: 'UA' },
    { id: 'IOC-005', type: 'URL', value: 'hxxp://185.220.101.47/payload.bin', severity: 'CRITICAL', description: 'Malware dropper URL serving encrypted binary', source: 'Internal Intel', firstSeen: timeAgo(100), lastSeen: timeAgo(12), hitCount: 2, tags: ['dropper', 'malware'], country: 'RU' },
    { id: 'IOC-006', type: 'EMAIL', value: 'no-reply@update-service-cdn[.]xyz', severity: 'HIGH', description: 'Spear-phishing sender associated with APT group', source: 'MISP', firstSeen: timeAgo(2160), lastSeen: timeAgo(1440), hitCount: 5, tags: ['phishing', 'apt'], country: 'KP' },
    { id: 'IOC-007', type: 'IP', value: '198.51.100.23', severity: 'MEDIUM', description: 'Scanning activity from VPS; low confidence threat', source: 'Shodan', firstSeen: timeAgo(360), lastSeen: timeAgo(55), hitCount: 2, tags: ['scanner', 'recon'], country: 'NL' },
    { id: 'IOC-008', type: 'DOMAIN', value: 'telemetry-microsoft[.]cc', severity: 'HIGH', description: 'Typosquatting domain used to harvest credentials', source: 'VirusTotal', firstSeen: timeAgo(5040), lastSeen: timeAgo(2880), hitCount: 9, tags: ['phishing', 'typosquatting'], country: 'CN' },
  ];
}

export function generateDataSources(): DataSource[] {
  const sourceTypes: SourceType[] = ['SIEM', 'FIREWALL', 'IDS', 'EDR', 'PROXY', 'DNS', 'CLOUD'];
  const statuses: SourceStatus[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'WARNING', 'ERROR'];

  const templates: DataSource[] = [
    { id: 'SRC-001', name: 'Splunk SIEM', type: 'SIEM', status: 'ACTIVE', host: '10.0.0.10', port: 9997, protocol: 'TCP', logsPerMinute: 4200, lastEvent: timeAgo(0), totalEvents: 1847362, errorCount: 0, description: 'Primary SIEM receiving all log sources' },
    { id: 'SRC-002', name: 'Palo Alto NGFW', type: 'FIREWALL', status: 'ACTIVE', host: '10.0.0.1', port: 514, protocol: 'UDP/Syslog', logsPerMinute: 1850, lastEvent: timeAgo(0), totalEvents: 934521, errorCount: 2, description: 'North-south perimeter firewall' },
    { id: 'SRC-003', name: 'Suricata IDS', type: 'IDS', status: 'ACTIVE', host: '10.0.0.20', port: 514, protocol: 'UDP/Syslog', logsPerMinute: 320, lastEvent: timeAgo(1), totalEvents: 287493, errorCount: 0, description: 'Network intrusion detection on SPAN port' },
    { id: 'SRC-004', name: 'CrowdStrike Falcon', type: 'EDR', status: 'WARNING', host: 'api.crowdstrike.com', port: 443, protocol: 'HTTPS', logsPerMinute: 780, lastEvent: timeAgo(3), totalEvents: 512840, errorCount: 18, description: 'EDR telemetry from 340 endpoints; certificate expiry warning' },
    { id: 'SRC-005', name: 'Squid Proxy', type: 'PROXY', status: 'ACTIVE', host: '10.0.0.30', port: 514, protocol: 'UDP/Syslog', logsPerMinute: 960, lastEvent: timeAgo(0), totalEvents: 678234, errorCount: 1, description: 'Outbound web proxy logs' },
    { id: 'SRC-006', name: 'BIND DNS Server', type: 'DNS', status: 'ERROR', host: '10.0.0.5', port: 514, protocol: 'UDP/Syslog', logsPerMinute: 0, lastEvent: timeAgo(18), totalEvents: 345678, errorCount: 47, description: 'DNS query logs – connection lost 18 min ago' },
    { id: 'SRC-007', name: 'AWS CloudTrail', type: 'CLOUD', status: 'ACTIVE', host: 'us-east-1.amazonaws.com', port: 443, protocol: 'HTTPS', logsPerMinute: 210, lastEvent: timeAgo(1), totalEvents: 198540, errorCount: 0, description: 'AWS API activity and infrastructure events' },
  ];

  return templates;
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: '#ff4466',
  HIGH: '#ffaa00',
  MEDIUM: '#a855f7',
  LOW: '#00d4ff',
  INFO: '#4a5a7a',
};

export const SEVERITY_BG: Record<Severity, string> = {
  CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/40',
  HIGH: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  MEDIUM: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
  LOW: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
  INFO: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};

export const STATUS_BG: Record<string, string> = {
  OPEN: 'bg-red-500/20 text-red-400 border-red-500/40',
  INVESTIGATING: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
  RESOLVED: 'bg-green-500/20 text-green-400 border-green-500/40',
  FALSE_POSITIVE: 'bg-slate-500/20 text-slate-400 border-slate-500/40',
};
