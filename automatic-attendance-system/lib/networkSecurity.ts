/**
 * Network Security Utilities
 * VPN/Proxy detection and network quality monitoring
 */

export interface NetworkInfo {
  ipAddress: string;
  latency: number;
  jitter: number;
  connectionType?: string;
}

export interface VPNDetectionResult {
  vpnDetected: boolean;
  proxyDetected: boolean;
  torDetected: boolean;
  provider?: string;
  riskScore: number;
  details: any;
}

/**
 * Get client IP address
 */
export async function getClientIP(): Promise<string> {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.error('Error getting IP:', error);
    throw error;
  }
}

/**
 * Detect VPN/Proxy using IP-API service
 */
export async function detectVPN(ipAddress: string): Promise<VPNDetectionResult> {
  try {
    // Using IPHub API (requires API key)
    const IPHUB_API_KEY = process.env.IPHUB_API_KEY || '';
    
    if (!IPHUB_API_KEY) {
      console.warn('IPHub API key not configured');
      return {
        vpnDetected: false,
        proxyDetected: false,
        torDetected: false,
        riskScore: 0,
        details: {}
      };
    }

    const response = await fetch(`https://v2.api.iphub.info/ip/${ipAddress}`, {
      headers: {
        'X-Key': IPHUB_API_KEY
      }
    });

    const data = await response.json();

    // IPHub block values:
    // 0 = Residential/Unclassified IP
    // 1 = Non-residential IP (VPN/Proxy/Hosting)
    // 2 = Non-residential & residential IP (warning)
    
    const vpnDetected = data.block === 1 || data.block === 2;
    const riskScore = data.block === 1 ? 100 : data.block === 2 ? 50 : 0;

    return {
      vpnDetected,
      proxyDetected: vpnDetected,
      torDetected: false,
      provider: data.isp || undefined,
      riskScore,
      details: {
        country: data.countryCode,
        isp: data.isp,
        asn: data.asn,
        block: data.block
      }
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    return {
      vpnDetected: false,
      proxyDetected: false,
      torDetected: false,
      riskScore: 0,
      details: { error: 'Detection failed' }
    };
  }
}

/**
 * Alternative VPN detection using IP-API (free, no key required)
 */
export async function detectVPNFree(ipAddress: string): Promise<VPNDetectionResult> {
  try {
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting`);
    const data = await response.json();

    if (data.status === 'fail') {
      throw new Error(data.message);
    }

    // Check if IP is from hosting provider or proxy
    const vpnDetected = data.proxy === true || data.hosting === true;
    const riskScore = vpnDetected ? 75 : 0;

    return {
      vpnDetected,
      proxyDetected: data.proxy === true,
      torDetected: false,
      provider: data.isp,
      riskScore,
      details: {
        country: data.country,
        countryCode: data.countryCode,
        region: data.regionName,
        city: data.city,
        isp: data.isp,
        org: data.org,
        proxy: data.proxy,
        hosting: data.hosting
      }
    };
  } catch (error) {
    console.error('VPN detection error:', error);
    return {
      vpnDetected: false,
      proxyDetected: false,
      torDetected: false,
      riskScore: 0,
      details: { error: 'Detection failed' }
    };
  }
}

/**
 * Measure network latency
 */
export async function measureLatency(url: string = '/api/ping'): Promise<number> {
  const startTime = performance.now();
  
  try {
    await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    const endTime = performance.now();
    return Math.round(endTime - startTime);
  } catch (error) {
    console.error('Latency measurement error:', error);
    return -1;
  }
}

/**
 * Measure network jitter (variation in latency)
 */
export async function measureJitter(samples: number = 5): Promise<number> {
  const latencies: number[] = [];

  for (let i = 0; i < samples; i++) {
    const latency = await measureLatency();
    if (latency > 0) {
      latencies.push(latency);
    }
    // Wait 100ms between samples
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  if (latencies.length < 2) {
    return 0;
  }

  // Calculate jitter as standard deviation
  const mean = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const variance = latencies.reduce((sum, latency) => {
    return sum + Math.pow(latency - mean, 2);
  }, 0) / latencies.length;

  return Math.round(Math.sqrt(variance));
}

/**
 * Get connection type
 */
export function getConnectionType(): string {
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    return connection?.effectiveType || 'unknown';
  }
  return 'unknown';
}

/**
 * Comprehensive network check
 */
export async function performNetworkCheck(): Promise<{
  ipAddress: string;
  latency: number;
  jitter: number;
  connectionType: string;
  vpnDetection: VPNDetectionResult;
  isSuspicious: boolean;
  suspicionReasons: string[];
}> {
  const ipAddress = await getClientIP();
  const latency = await measureLatency();
  const jitter = await measureJitter();
  const connectionType = getConnectionType();
  const vpnDetection = await detectVPNFree(ipAddress);

  const suspicionReasons: string[] = [];
  
  if (vpnDetection.vpnDetected) {
    suspicionReasons.push('VPN or proxy detected');
  }
  
  if (latency > 500) {
    suspicionReasons.push('High latency detected');
  }
  
  if (jitter > 100) {
    suspicionReasons.push('High network jitter detected');
  }

  return {
    ipAddress,
    latency,
    jitter,
    connectionType,
    vpnDetection,
    isSuspicious: suspicionReasons.length > 0,
    suspicionReasons
  };
}

/**
 * Calculate risk score based on network metrics
 */
export function calculateRiskScore(
  vpnDetected: boolean,
  latency: number,
  jitter: number
): number {
  let score = 0;

  if (vpnDetected) score += 50;
  if (latency > 500) score += 20;
  if (latency > 1000) score += 10;
  if (jitter > 100) score += 15;
  if (jitter > 200) score += 5;

  return Math.min(100, score);
}
