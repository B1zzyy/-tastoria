import { NextRequest, NextResponse } from 'next/server'
import { FingerprintService } from '@/lib/fingerprintService'
import { requirePremiumAccess } from '@/lib/authMiddleware'

export async function POST(request: NextRequest) {
  try {
    // Get user from auth
    const user = await requirePremiumAccess(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { fingerprintData } = body

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown'

    // Generate fingerprint
    const fingerprint = FingerprintService.generateFingerprint({
      ...fingerprintData,
      ipAddress
    })

    // Record trial usage
    await FingerprintService.recordTrialUsage(
      fingerprint,
      ipAddress,
      user.id,
      fingerprintData.userAgent,
      fingerprintData.screenResolution,
      fingerprintData.timezone
    )

    return NextResponse.json({
      success: true,
      message: 'Trial usage recorded'
    })

  } catch (error) {
    console.error('Error recording trial usage:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to record trial usage'
      },
      { status: 500 }
    )
  }
}
