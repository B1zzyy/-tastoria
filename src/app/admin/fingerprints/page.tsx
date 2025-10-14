'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { FingerprintService } from '@/lib/fingerprintService';

interface FingerprintRecord {
  id: string;
  fingerprint_hash: string;
  user_id: string;
  ip_address: string;
  user_agent: string;
  screen_resolution: string;
  timezone: string;
  trial_used: boolean;
  trial_start_date: string;
  created_at: string;
}

export default function FingerprintAdmin() {
  const [fingerprints, setFingerprints] = useState<FingerprintRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFingerprint, setCurrentFingerprint] = useState<string>('');

  useEffect(() => {
    fetchFingerprints();
    // Get current browser fingerprint
    const fingerprintData = FingerprintService.getClientFingerprint();
    const fingerprint = FingerprintService.generateFingerprint(fingerprintData);
    setCurrentFingerprint(fingerprint);
  }, []);

  const fetchFingerprints = async () => {
    try {
      const { data, error } = await supabase
        .from('trial_fingerprints')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching fingerprints:', error);
      } else {
        setFingerprints(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEligibility = async () => {
    try {
      const fingerprintData = FingerprintService.getClientFingerprint();
      const response = await fetch('/api/check-trial-eligibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fingerprintData })
      });
      
      const result = await response.json();
      alert(`Eligible: ${result.isEligible}\nReason: ${result.reason || 'None'}`);
    } catch (error) {
      console.error('Test failed:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Fingerprint Admin</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">Current Browser Fingerprint</h2>
        <p className="font-mono text-sm break-all">{currentFingerprint}</p>
        <button 
          onClick={testEligibility}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Eligibility
        </button>
      </div>

      <div className="mb-4">
        <button 
          onClick={fetchFingerprints}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
        >
          Refresh Data
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 border-b text-left">Fingerprint</th>
              <th className="px-4 py-2 border-b text-left">IP Address</th>
              <th className="px-4 py-2 border-b text-left">Screen</th>
              <th className="px-4 py-2 border-b text-left">Trial Used</th>
              <th className="px-4 py-2 border-b text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {fingerprints.map((fp) => (
              <tr key={fp.id} className={fp.fingerprint_hash === currentFingerprint ? 'bg-yellow-100' : ''}>
                <td className="px-4 py-2 border-b font-mono text-xs">
                  {fp.fingerprint_hash}
                </td>
                <td className="px-4 py-2 border-b">{fp.ip_address}</td>
                <td className="px-4 py-2 border-b">{fp.screen_resolution}</td>
                <td className="px-4 py-2 border-b">
                  <span className={`px-2 py-1 rounded text-xs ${
                    fp.trial_used ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {fp.trial_used ? 'Used' : 'Available'}
                  </span>
                </td>
                <td className="px-4 py-2 border-b text-sm">
                  {new Date(fp.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {fingerprints.length === 0 && (
        <p className="text-gray-500 text-center py-8">No fingerprints found</p>
      )}
    </div>
  );
}
