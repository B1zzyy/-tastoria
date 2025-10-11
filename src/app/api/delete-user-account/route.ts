import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Delete the user from Supabase Auth using admin privileges
    const { error: authError } = await supabaseServer.auth.admin.deleteUser(userId);

    if (authError) {
      console.error('Error deleting user from auth:', authError);
      return NextResponse.json(
        { error: 'Failed to delete user from authentication system' },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted user ${userId} from auth system`);

    return NextResponse.json(
      { message: 'User account deleted successfully' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in delete-user-account API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
