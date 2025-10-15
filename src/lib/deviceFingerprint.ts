/**
 * Device fingerprinting utility for persistent authentication
 * Creates a unique identifier for the device/browser combination
 */

export interface DeviceFingerprint {
  id: string;
  timestamp: number;
  userAgent: string;
  screen: string;
  timezone: string;
  language: string;
}

const FINGERPRINT_KEY = 'tastoria-device-fingerprint';
const FINGERPRINT_EXPIRY = 365 * 24 * 60 * 60 * 1000; // 1 year

/**
 * Generate a device fingerprint
 */
export function generateDeviceFingerprint(): DeviceFingerprint {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Create a unique canvas fingerprint
  ctx?.fillText('Device fingerprint', 10, 10);
  const canvasFingerprint = canvas.toDataURL();
  
  // Collect device information
  const fingerprint: DeviceFingerprint = {
    id: '',
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
    screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language
  };
  
  // Create a hash from all the collected data
  const fingerprintString = JSON.stringify({
    userAgent: fingerprint.userAgent,
    screen: fingerprint.screen,
    timezone: fingerprint.timezone,
    language: fingerprint.language,
    canvas: canvasFingerprint,
    // Add some additional browser features
    features: {
      localStorage: typeof Storage !== 'undefined',
      sessionStorage: typeof Storage !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined',
      webgl: !!document.createElement('canvas').getContext('webgl'),
      touch: 'ontouchstart' in window
    }
  });
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprintString.length; i++) {
    const char = fingerprintString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  fingerprint.id = Math.abs(hash).toString(36);
  
  return fingerprint;
}

/**
 * Get or create device fingerprint
 */
export function getDeviceFingerprint(): DeviceFingerprint {
  try {
    const stored = localStorage.getItem(FINGERPRINT_KEY);
    if (stored) {
      const fingerprint: DeviceFingerprint = JSON.parse(stored);
      
      // Check if fingerprint is still valid (not expired)
      if (Date.now() - fingerprint.timestamp < FINGERPRINT_EXPIRY) {
        return fingerprint;
      }
    }
  } catch (error) {
    console.warn('Failed to load stored fingerprint:', error);
  }
  
  // Generate new fingerprint
  const fingerprint = generateDeviceFingerprint();
  
  try {
    localStorage.setItem(FINGERPRINT_KEY, JSON.stringify(fingerprint));
  } catch (error) {
    console.warn('Failed to store fingerprint:', error);
  }
  
  return fingerprint;
}

/**
 * Store user association with device fingerprint
 */
export function associateUserWithDevice(userId: string): void {
  try {
    const fingerprint = getDeviceFingerprint();
    const userDeviceKey = `tastoria-user-device-${fingerprint.id}`;
    const userDeviceData = {
      userId,
      fingerprintId: fingerprint.id,
      timestamp: Date.now(),
      lastSeen: Date.now()
    };
    
    localStorage.setItem(userDeviceKey, JSON.stringify(userDeviceData));
    
    // Also store in a general user devices list
    const userDevicesKey = `tastoria-user-${userId}-devices`;
    const existingDevices = JSON.parse(localStorage.getItem(userDevicesKey) || '[]');
    const deviceIndex = existingDevices.findIndex((d: { fingerprintId: string }) => d.fingerprintId === fingerprint.id);
    
    if (deviceIndex >= 0) {
      existingDevices[deviceIndex] = userDeviceData;
    } else {
      existingDevices.push(userDeviceData);
    }
    
    // Keep only the last 5 devices per user
    if (existingDevices.length > 5) {
      existingDevices.sort((a: { lastSeen: number }, b: { lastSeen: number }) => b.lastSeen - a.lastSeen);
      existingDevices.splice(5);
    }
    
    localStorage.setItem(userDevicesKey, JSON.stringify(existingDevices));
  } catch (error) {
    console.warn('Failed to associate user with device:', error);
  }
}

/**
 * Get user ID associated with current device
 */
export function getAssociatedUserId(): string | null {
  try {
    const fingerprint = getDeviceFingerprint();
    const userDeviceKey = `tastoria-user-device-${fingerprint.id}`;
    const stored = localStorage.getItem(userDeviceKey);
    
    if (stored) {
      const userDeviceData = JSON.parse(stored);
      
      // Check if association is still valid (within 30 days)
      if (Date.now() - userDeviceData.timestamp < 30 * 24 * 60 * 60 * 1000) {
        return userDeviceData.userId;
      }
    }
  } catch (error) {
    console.warn('Failed to get associated user ID:', error);
  }
  
  return null;
}

/**
 * Clear device association (for logout)
 */
export function clearDeviceAssociation(): void {
  try {
    const fingerprint = getDeviceFingerprint();
    const userDeviceKey = `tastoria-user-device-${fingerprint.id}`;
    localStorage.removeItem(userDeviceKey);
  } catch (error) {
    console.warn('Failed to clear device association:', error);
  }
}
