'use client';

class KeepAliveService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Ping every 5 minutes (300,000ms) to keep functions warm
  private readonly PING_INTERVAL = 5 * 60 * 1000;

  start() {
    if (this.isRunning) return;

    console.log('🔄 Keep-alive service started');
    this.isRunning = true;

    // Initial ping
    this.ping();

    // Set up recurring pings
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.PING_INTERVAL);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ Keep-alive service stopped');
  }

  private async ping() {
    try {
      const response = await fetch('/api/keep-alive', {
        method: 'GET',
        cache: 'no-cache',
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Keep-alive ping successful:', data.timestamp);
      } else {
        console.warn('⚠️ Keep-alive ping failed:', response.status);
      }
    } catch (error) {
      console.warn('⚠️ Keep-alive ping error:', error);
    }
  }

  isActive() {
    return this.isRunning;
  }
}

// Create singleton instance
export const keepAliveService = new KeepAliveService();

// Auto-start when imported (only in browser and not on localhost)
if (typeof window !== 'undefined') {
  // Only start keep-alive in production (not on localhost)
  const isProduction = !window.location.hostname.includes('localhost') && 
                      !window.location.hostname.includes('127.0.0.1');
  
  if (isProduction) {
    // Start after a short delay to avoid blocking initial page load
    setTimeout(() => {
      keepAliveService.start();
    }, 3000);
  }

  // Stop when page is about to unload
  window.addEventListener('beforeunload', () => {
    keepAliveService.stop();
  });

  // Restart when page becomes visible again (user comes back to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !keepAliveService.isActive() && isProduction) {
      keepAliveService.start();
    } else if (document.visibilityState === 'hidden') {
      keepAliveService.stop();
    }
  });
}
