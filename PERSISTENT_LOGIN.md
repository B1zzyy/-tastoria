# Persistent Login System

This document explains the enhanced persistent login system implemented to keep users logged in across browser sessions and device restarts.

## Features

### 1. Device Fingerprinting
- Creates a unique identifier for each device/browser combination
- Uses multiple browser characteristics (user agent, screen resolution, timezone, language, canvas fingerprint, etc.)
- Stores device associations with user accounts
- Valid for up to 1 year

### 2. Session Keep-Alive Service
- Automatically refreshes sessions every 15 minutes
- Prevents session expiration
- Handles retry logic with exponential backoff
- Auto-starts when user is authenticated
- Auto-stops when user logs out

### 3. Enhanced Session Recovery
- Primary: Standard Supabase session recovery
- Fallback: Device-based session recovery
- Automatic session refresh on token expiry
- Manual session refresh capability

### 4. Improved Storage
- Uses localStorage for persistence
- Multiple storage keys for redundancy
- Graceful fallback if storage is unavailable
- Automatic cleanup of old associations

## How It Works

### Login Flow
1. User signs in normally
2. System creates device fingerprint
3. Associates user ID with device fingerprint
4. Starts session keep-alive service
5. Stores session data in localStorage

### Session Recovery Flow
1. On app load, check for existing Supabase session
2. If no session found, check for device association
3. If device association found, attempt session refresh
4. If successful, restore user session
5. Continue with normal app flow

### Keep-Alive Flow
1. Service runs every 15 minutes
2. Checks if session is close to expiring (within 5 minutes)
3. If needed, refreshes the session
4. Updates device association timestamp
5. Handles errors with retry logic

## Files Modified

### New Files
- `src/lib/deviceFingerprint.ts` - Device fingerprinting utilities
- `src/lib/sessionKeepAlive.ts` - Session keep-alive service
- `src/components/SessionRefreshButton.tsx` - Manual refresh button

### Modified Files
- `src/hooks/useAuth.ts` - Enhanced with device fingerprinting and recovery
- `src/lib/supabase.ts` - Updated configuration
- `src/app/layout.tsx` - Initializes keep-alive service

## Usage

### Automatic (Default)
The system works automatically once implemented. Users will stay logged in across:
- Browser restarts
- Device restarts
- Extended periods of inactivity
- Network interruptions

### Manual Refresh
If needed, users can manually refresh their session using the `SessionRefreshButton` component:

```tsx
import SessionRefreshButton from '@/components/SessionRefreshButton'

// In your component
<SessionRefreshButton />
```

### Programmatic Access
```tsx
import { useAuth } from '@/hooks/useAuth'

const { refreshSession, attemptDeviceBasedRecovery } = useAuth()

// Manual session refresh
await refreshSession()

// Device-based recovery
await attemptDeviceBasedRecovery()
```

## Security Considerations

1. **Device Fingerprinting**: Uses multiple browser characteristics but doesn't access sensitive data
2. **Local Storage**: All data is stored locally on the user's device
3. **Session Expiry**: Sessions still have expiration times for security
4. **Logout Cleanup**: Device associations are cleared on logout
5. **Retry Limits**: Prevents infinite retry loops

## Browser Compatibility

- Works on all modern browsers
- Graceful degradation if localStorage is unavailable
- Handles private/incognito mode limitations
- Compatible with mobile browsers (iOS Safari, Chrome Mobile, etc.)

## Troubleshooting

### User Still Gets Logged Out
1. Check browser console for errors
2. Verify localStorage is available
3. Check if user manually cleared browser data
4. Verify Supabase session settings

### Performance Issues
1. Keep-alive service runs every 15 minutes (minimal impact)
2. Device fingerprinting runs once per session
3. All operations are asynchronous and non-blocking

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` to see detailed logs of the authentication flow.
