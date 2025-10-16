/**
 * Connection health utilities to detect and handle network issues
 */

export class ConnectionHealth {
  private static isOnline = true;
  private static listeners: Array<(isOnline: boolean) => void> = [];

  static init() {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('🌐 Connection restored');
        this.isOnline = true;
        this.notifyListeners(true);
      });

      window.addEventListener('offline', () => {
        console.log('📴 Connection lost');
        this.isOnline = false;
        this.notifyListeners(false);
      });

      // Initial check
      this.isOnline = navigator.onLine;
    }
  }

  static isConnected(): boolean {
    return this.isOnline;
  }

  static addListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  static async testConnection(): Promise<boolean> {
    try {
      // Test with a simple fetch to a reliable endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.log('🔍 Connection test failed:', error);
      return false;
    }
  }
}
