import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { TrialService } from './trialService';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface AuthenticatedUser {
  id: string;
  email: string;
}

export async function authenticateUser(request: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    
    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || ''
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<NextResponse | AuthenticatedUser> {
  const user = await authenticateUser(request);
  
  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  return user;
}

export async function requirePremiumAccess(request: NextRequest): Promise<NextResponse | AuthenticatedUser> {
  const authResult = await requireAuth(request);
  
  // If it's a NextResponse (error), return it
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  
  const user = authResult;
  
  // Check if user has premium access
  const hasAccess = await TrialService.canAccessFeature(user.id);
  
  if (!hasAccess) {
    return NextResponse.json(
      { error: 'Premium subscription required' },
      { status: 403 }
    );
  }
  
  return user;
}
