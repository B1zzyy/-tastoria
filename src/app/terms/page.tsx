import { Metadata } from 'next'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Terms of Service - Tastoria',
  description: 'Terms of Service for Tastoria - Your recipe management and AI cooking assistant',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
        
        {/* Terms of Service Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <iframe
            src="/terms-of-service.html"
            className="w-full h-screen border-0"
            title="Terms of Service"
          />
        </div>
      </div>
      
      <Footer />
    </div>
  )
}
