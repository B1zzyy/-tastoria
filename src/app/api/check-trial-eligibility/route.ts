import { NextRequest, NextResponse } from 'next/server'
import { FingerprintService } from '@/lib/fingerprintService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { fingerprintData } = body

    // Get client IP address
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     request.ip || 
                     'unknown'

    // Generate fingerprint
    const fingerprint = FingerprintService.generateFingerprint({
      ...fingerprintData,
      ipAddress
    })

    // Check trial eligibility
    const result = await FingerprintService.checkTrialEligibility(fingerprint, ipAddress)

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Error checking trial eligibility:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check trial eligibility',
        isEligible: true // Fail open - allow trial if there's an error
      },
      { status: 500 }
    )
  }
}
