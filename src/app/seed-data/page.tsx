// src/app/seed-data/page.tsx
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Database, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { seedRequestData } from '@/lib/seed-data';

export default function SeedDataPage() {
  const [isSeeding, setIsSeeding] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSeed = async () => {
    setIsSeeding(true);
    setResult(null);

    try {
      const seedResult = await seedRequestData();
      setResult(seedResult);
    } catch (error) {
      setResult({ success: false, error: String(error) });
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="container mx-auto py-10 px-4 max-w-2xl">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl flex items-center gap-2">
            <Database className="h-8 w-8 text-primary" />
            Seed Test Data
          </CardTitle>
          <CardDescription className="text-base">
            Populate the database with dummy requests for testing all dashboards
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">Warning:</p>
              <p>This will add 25 dummy requests to your Firebase database. This is for testing purposes only.</p>
            </div>
          </div>

          {/* What will be created */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">What will be created:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 5 requests pending Ops Manager review</li>
              <li>• 4 requests pending Finance review</li>
              <li>• 3 requests pending Procurement</li>
              <li>• 4 requests in Procurement (being fulfilled)</li>
              <li>• 6 completed requests</li>
              <li>• 3 rejected requests</li>
            </ul>
            <p className="text-sm text-blue-800 font-semibold mt-2">Total: 25 requests from 8 different DCs</p>
          </div>

          {/* Seed Button */}
          <Button
            onClick={handleSeed}
            disabled={isSeeding}
            className="w-full h-12 text-base"
            size="lg"
          >
            {isSeeding ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Seeding Database...
              </>
            ) : (
              <>
                <Database className="mr-2 h-5 w-5" />
                Seed Test Data
              </>
            )}
          </Button>

          {/* Result */}
          {result && (
            <div
              className={`rounded-lg p-4 border ${
                result.success
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h3
                    className={`font-semibold mb-1 ${
                      result.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {result.success ? 'Success!' : 'Error'}
                  </h3>
                  {result.success ? (
                    <div className="text-sm text-green-800">
                      <p className="mb-2">Database seeded successfully!</p>
                      <p>✅ Created: {result.successCount} requests</p>
                      {result.errorCount > 0 && (
                        <p className="text-red-600">❌ Failed: {result.errorCount} requests</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-800">
                      {String(result.error || 'An unknown error occurred')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          {result?.success && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">🎯 Next Steps:</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>Now you can test all dashboards with realistic data:</p>
                <ul className="space-y-1 ml-4">
                  <li>• <a href="/requests" className="text-blue-600 hover:underline">DC Dashboard</a> - Login as any DC</li>
                  <li>• <a href="/qa-dashboard" className="text-blue-600 hover:underline">QA Dashboard</a> - Login as qa_mh/qa123</li>
                  <li>• <a href="/finance-dashboard" className="text-blue-600 hover:underline">Finance Dashboard</a> - Login as finance/finance123</li>
                  <li>• <a href="/procurement-dashboard" className="text-blue-600 hover:underline">Procurement Dashboard</a> - Login as procurement/procurement123</li>
                  <li>• <a href="/manager-dashboard" className="text-blue-600 hover:underline">Manager Dashboard</a> - Login as admin/admin123</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
