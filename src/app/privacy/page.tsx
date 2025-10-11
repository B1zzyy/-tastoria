import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
        
        {/* Termly Privacy Policy Content */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <iframe
            src="/privacy-policy.html"
            className="w-full h-screen border-0"
            title="Privacy Policy"
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}
