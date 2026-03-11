// Network Security Service for VPN/Proxy Detection

export interface NetworkCheckResult {
  ipAddress: string;
  isVPN: boolean;
  isProxy: boolean;
  isTor: boolean;
  isHosting: boolean;
  isRelay: boolean;
  country: string;
  region: string;
  city: string;
  isp: string;
  organization: string;
  asn: string;
  latency: number;
  jitter: number;
  riskScore: number;
  threatLevel: 'low' | 'medium' | 'high';
  detectionMethod: string;
  detectionConfidence: number;
}

export class NetworkSecurityService {
  /**
   * Check if IP is VPN/Proxy using multiple detection methods
   * This runs on the backend
   */
  static async checkNetwork(ipAddress: string, userAgent: string): Promise<NetworkCheckResult> {
    try {
      // Measure network latency
      const latencyData = await this.measureLatency();

      // Check IP intelligence
      const ipData = await this.checkIPIntelligence(ipAddress);

      // Analyze user agent
      const uaAnalysis = this.analyzeUserAgent(userAgent);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(ipData, latencyData, uaAnalysis);

      return {
        ipAddress,
        isVPN: ipData.isVPN,
        isProxy: ipData.isProxy,
        isTor: ipData.isTor,
        isHosting: ipData.isHosting,
        isRelay: ipData.isRelay,
        country: ipData.country,
        region: ipData.region,
        city: ipData.city,
        isp: ipData.isp,
        organization: ipData.organization,
        asn: ipData.asn,
        latency: latencyData.latency,
        jitter: latencyData.jitter,
        riskScore,
        threatLevel: this.getThreatLevel(riskScore),
        detectionMethod: 'multi-factor',
        detectionConfidence: this.calculateConfidence(ipData, latencyData),
      };
    } catch (error) {
      console.error('Network check error:', error);
      throw error;
    }
  }

  /**
   * Check IP intelligence using multiple APIs
   */
  private static async checkIPIntelligence(ipAddress: string): Promise<{
    isVPN: boolean;
    isProxy: boolean;
    isTor: boolean;
    isHosting: boolean;
    isRelay: boolean;
    country: string;
    region: string;
    city: string;
    isp: string;
    organization: string;
    asn: string;
  }> {
    try {
      // Try multiple IP intelligence APIs
      // 1. IPHub (free tier available)
      // 2. IPQualityScore (free tier available)
      // 3. ProxyCheck.io (free tier available)
      
      // For demo, using ipapi.co (free, no key required)
      const response = await fetch(`https://ipapi.co/${ipAddress}/json/`);
      
      if (!response.ok) {
        throw new Error('IP API request failed');
      }

      const data = await response.json();

      // Check if IP is from known VPN/Proxy providers
      const suspiciousProviders = [
        'nordvpn', 'expressvpn', 'surfshark', 'protonvpn', 'cyberghost',
        'privateinternetaccess', 'tunnelbear', 'windscribe', 'hotspot shield',
        'vpn', 'proxy', 'tor', 'relay', 'hosting', 'datacenter', 'cloud'
      ];

      const orgLower = (data.org || '').toLowerCase();
      const ispLower = (data.isp || '').toLowerCase();
      
      const isVPN = suspiciousProviders.some(provider => 
        orgLower.includes(provider) || ispLower.includes(provider)
      );

      const isProxy = orgLower.includes('proxy') || ispLower.includes('proxy');
      const isTor = orgLower.includes('tor') || ispLower.includes('tor');
      const isHosting = orgLower.includes('hosting') || orgLower.includes('datacenter') || 
                        orgLower.includes('cloud') || orgLower.includes('server');
      const isRelay = orgLower.includes('relay');

      return {
        isVPN,
        isProxy,
        isTor,
        isHosting,
        isRelay,
        country: data.country_name || 'Unknown',
        region: data.region || 'Unknown',
        city: data.city || 'Unknown',
        isp: data.org || 'Unknown',
        organization: data.org || 'Unknown',
        asn: data.asn || 'Unknown',
      };
    } catch (error) {
      console.error('IP intelligence check failed:', error);
      
      // Return default values if API fails
      return {
        isVPN: false,
        isProxy: false,
        isTor: false,
        isHosting: false,
        isRelay: false,
        country: 'Unknown',
        region: 'Unknown',
        city: 'Unknown',
        isp: 'Unknown',
        organization: 'Unknown',
        asn: 'Unknown',
      };
    }
  }

  /**
   * Measure network latency and jitter (client-side)
   */
  static async measureLatency(): Promise<{ latency: number; jitter: number }> {
    const measurements: number[] = [];
    const pingCount = 5;

    for (let i = 0; i < pingCount; i++) {
      const start = performance.now();
      
      try {
        // Ping a small endpoint
        await fetch('/api/ping', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        const end = performance.now();
        measurements.push(end - start);
      } catch (error) {
        console.error('Ping failed:', error);
      }

      // Wait 100ms between pings
      if (i < pingCount - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    if (measurements.length === 0) {
      return { latency: 0, jitter: 0 };
    }

    // Calculate average latency
    const latency = measurements.reduce((a, b) => a + b, 0) / measurements.length;

    // Calculate jitter (variance in latency)
    const jitter = this.calculateJitter(measurements);

    return {
      latency: Math.round(latency),
      jitter: Math.round(jitter),
    };
  }

  /**
   * Calculate jitter from latency measurements
   */
  private static calculateJitter(measurements: number[]): number {
    if (measurements.length < 2) return 0;

    const differences: number[] = [];
    for (let i = 1; i < measurements.length; i++) {
      differences.push(Math.abs(measurements[i] - measurements[i - 1]));
    }

    return differences.reduce((a, b) => a + b, 0) / differences.length;
  }

  /**
   * Analyze user agent for suspicious patterns
   */
  private static analyzeUserAgent(userAgent: string): {
    suspicious: boolean;
    reasons: string[];
  } {
    const reasons: string[] = [];
    let suspicious = false;

    // Check for headless browsers
    if (userAgent.includes('HeadlessChrome') || userAgent.includes('PhantomJS')) {
      reasons.push('Headless browser detected');
      suspicious = true;
    }

    // Check for automation tools
    if (userAgent.includes('Selenium') || userAgent.includes('WebDriver')) {
      reasons.push('Automation tool detected');
      suspicious = true;
    }

    // Check for unusual user agents
    if (userAgent.length < 20 || userAgent.length > 500) {
      reasons.push('Unusual user agent length');
      suspicious = true;
    }

    return { suspicious, reasons };
  }

  /**
   * Calculate overall risk score (0-100)
   */
  private static calculateRiskScore(
    ipData: any,
    latencyData: { latency: number; jitter: number },
    uaAnalysis: { suspicious: boolean }
  ): number {
    let score = 0;

    // VPN/Proxy detection (40 points)
    if (ipData.isVPN) score += 40;
    if (ipData.isProxy) score += 40;
    if (ipData.isTor) score += 50;
    if (ipData.isHosting) score += 30;
    if (ipData.isRelay) score += 30;

    // Network latency (30 points)
    if (latencyData.latency > 500) score += 30;
    else if (latencyData.latency > 300) score += 20;
    else if (latencyData.latency > 150) score += 10;

    // Jitter (20 points)
    if (latencyData.jitter > 100) score += 20;
    else if (latencyData.jitter > 50) score += 10;

    // User agent (10 points)
    if (uaAnalysis.suspicious) score += 10;

    return Math.min(score, 100);
  }

  /**
   * Get threat level from risk score
   */
  private static getThreatLevel(riskScore: number): 'low' | 'medium' | 'high' {
    if (riskScore >= 70) return 'high';
    if (riskScore >= 40) return 'medium';
    return 'low';
  }

  /**
   * Calculate detection confidence
   */
  private static calculateConfidence(ipData: any, latencyData: any): number {
    let confidence = 0;

    // IP intelligence confidence
    if (ipData.isVPN || ipData.isProxy || ipData.isTor) {
      confidence += 0.6;
    }

    // Latency confidence
    if (latencyData.latency > 0) {
      confidence += 0.3;
    }

    // Base confidence
    confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Get client IP address (server-side)
   */
  static getClientIP(request: Request): string {
    // Check various headers for real IP
    const headers = request.headers;
    
    const forwardedFor = headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback
    return 'unknown';
  }

  /**
   * Check if network is suspicious
   */
  static isSuspiciousNetwork(checkResult: NetworkCheckResult): boolean {
    return (
      checkResult.isVPN ||
      checkResult.isProxy ||
      checkResult.isTor ||
      checkResult.riskScore >= 40
    );
  }

  /**
   * Get network status message
   */
  static getNetworkStatusMessage(checkResult: NetworkCheckResult): string {
    if (checkResult.isVPN) return 'VPN detected';
    if (checkResult.isProxy) return 'Proxy detected';
    if (checkResult.isTor) return 'Tor network detected';
    if (checkResult.isHosting) return 'Hosting/Datacenter IP detected';
    if (checkResult.riskScore >= 70) return 'High risk network detected';
    if (checkResult.riskScore >= 40) return 'Suspicious network activity';
    return 'Network verified';
  }
}
