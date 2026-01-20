import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";

const StaffTrainingGuide = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-white text-black print:bg-white">
      {/* Print-hidden navigation */}
      <div className="print:hidden fixed top-4 left-4 right-4 flex justify-between z-50">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="w-4 h-4 mr-2" />
          Print / Save as PDF
        </Button>
      </div>

      {/* Printable Content */}
      <div className="max-w-4xl mx-auto p-8 pt-20 print:pt-8 print:max-w-none">
        {/* Header */}
        <div className="text-center mb-8 border-b-2 border-black pb-6">
          <h1 className="text-3xl font-bold mb-2">CCN Health Kiosk</h1>
          <h2 className="text-xl text-gray-600">Staff Training Guide - Feature Map</h2>
          <p className="text-sm text-gray-500 mt-2">Version 1.0 | January 2026</p>
        </div>

        {/* Feature Map Diagram - ASCII Version for Print */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">System Overview</h3>
          <div className="border-2 border-gray-300 p-4 font-mono text-xs leading-relaxed bg-gray-50">
            <pre className="whitespace-pre overflow-x-auto">{`
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              🚪 ENTRY FLOW                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐           │
│  │  Idle    │───▶│ Language │───▶│ QR Card  │───▶│    Dashboard     │           │
│  │  Screen  │    │ Selection│    │   Scan   │    │   (Main Hub)     │           │
│  └──────────┘    └──────────┘    └──────────┘    └──────────────────┘           │
│       │                              │                    │                      │
│       │                              ▼                    │                      │
│       │                    ┌──────────────────┐           │                      │
│       │                    │ Quick Select     │           │                      │
│       │                    │ (Tester Bypass)  │───────────┘                      │
│       │                    └──────────────────┘                                  │
│       │                                                                          │
│       └────────────────────────▶ [Admin Hub] (Admin Button)                      │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                           🏠 DASHBOARD (2x2 Grid)                                │
│                                                                                  │
│    ┌─────────────────────┐              ┌─────────────────────┐                 │
│    │   ❤️ Health          │              │   👥 Community       │                 │
│    │   Screenings        │              │   Programmes        │                 │
│    └─────────────────────┘              └─────────────────────┘                 │
│                                                                                  │
│    ┌─────────────────────┐              ┌─────────────────────┐                 │
│    │   🏥 Find Care       │              │   👤 Profile &       │                 │
│    │   (Clinic Map)      │              │   Rewards           │                 │
│    └─────────────────────┘              └─────────────────────┘                 │
│                                                                                  │
│    ♿ Accessibility Bar (Always Visible): TTS | Font Size | Voice | AI Chat     │
└─────────────────────────────────────────────────────────────────────────────────┘
            `}</pre>
          </div>
        </section>

        {/* Feature Details */}
        <section className="mb-8 page-break-before">
          <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">Feature Details</h3>
          
          <div className="grid grid-cols-2 gap-4 print:grid-cols-2">
            {/* Health Screenings */}
            <div className="border p-4">
              <h4 className="font-bold text-green-700 mb-2">❤️ Health Screenings</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Blood Pressure measurement</li>
                <li>Height & Weight tracking</li>
                <li>Historical results display</li>
                <li>AI-powered programme recommendations</li>
                <li>Color-coded health status indicators</li>
              </ul>
            </div>

            {/* Community Programmes */}
            <div className="border p-4">
              <h4 className="font-bold text-blue-700 mb-2">👥 Community Programmes</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Browse available programmes</li>
                <li>6-digit programme ID lookup</li>
                <li>Real-time capacity tracking</li>
                <li>Registration with points reward</li>
                <li>"Getting There" PDF guides</li>
                <li>Feedback submission (1-5 stars)</li>
              </ul>
            </div>

            {/* Find Care */}
            <div className="border p-4">
              <h4 className="font-bold text-purple-700 mb-2">🏥 Find Care</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>1,000+ CHAS clinics on map</li>
                <li>Geolocation (find nearest)</li>
                <li>Operating hours display</li>
                <li>Clinic type filters</li>
                <li>Government facilities included</li>
              </ul>
            </div>

            {/* Profile & Rewards */}
            <div className="border p-4">
              <h4 className="font-bold text-orange-700 mb-2">👤 Profile & Rewards</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                <li>Points balance display</li>
                <li>Daily login bonus (+5 pts)</li>
                <li>Event attendance history</li>
                <li>Tiered rewards shop</li>
                <li>Medal equipping</li>
                <li>Voucher code viewing</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Accessibility Features */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">♿ Accessibility Features</h3>
          <div className="border p-4">
            <div className="grid grid-cols-4 gap-4 text-sm text-center">
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-bold">TTS Toggle</div>
                <div className="text-xs text-gray-600">Hover-to-speak on all text</div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-bold">Font Size</div>
                <div className="text-xs text-gray-600">Adjustable text sizing</div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-bold">Voice Navigator</div>
                <div className="text-xs text-gray-600">Voice-based navigation</div>
              </div>
              <div className="p-2 bg-blue-50 rounded">
                <div className="font-bold">AI Health Chat</div>
                <div className="text-xs text-gray-600">Conversational assistant</div>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Portal */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">⚙️ Admin Portal</h3>
          <div className="border p-4">
            <p className="text-sm mb-3">Access via <strong>"Admin" button</strong> on Idle Screen</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="p-2 bg-orange-50 rounded border">
                <div className="font-bold">Programme Management</div>
                <div className="text-xs">Create, edit, delete programmes</div>
              </div>
              <div className="p-2 bg-orange-50 rounded border">
                <div className="font-bold">Attendance & Points</div>
                <div className="text-xs">Mark attendance, award points</div>
              </div>
              <div className="p-2 bg-orange-50 rounded border">
                <div className="font-bold">Account Management</div>
                <div className="text-xs">Manage admin users & roles</div>
              </div>
              <div className="p-2 bg-orange-50 rounded border">
                <div className="font-bold">Rewards Management</div>
                <div className="text-xs">Configure rewards & tiers</div>
              </div>
              <div className="p-2 bg-orange-50 rounded border">
                <div className="font-bold">Slideshow Management</div>
                <div className="text-xs">Idle screen media</div>
              </div>
              <div className="p-2 bg-red-50 rounded border">
                <div className="font-bold">Audit Logs 🔒</div>
                <div className="text-xs">Password protected</div>
              </div>
            </div>
          </div>
        </section>

        {/* User Journey Quick Reference */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">📋 Common User Journeys</h3>
          <div className="space-y-3 text-sm">
            <div className="border-l-4 border-green-500 pl-3">
              <strong>New User Registration:</strong> Idle → Language → Scan Card → Auto-create Profile → Dashboard
            </div>
            <div className="border-l-4 border-blue-500 pl-3">
              <strong>Programme Signup:</strong> Dashboard → Community → Browse → Select → Register → Points Awarded
            </div>
            <div className="border-l-4 border-purple-500 pl-3">
              <strong>Find Nearby Clinic:</strong> Dashboard → Find Care → Enable Location → View Nearest → Get Details
            </div>
            <div className="border-l-4 border-orange-500 pl-3">
              <strong>Redeem Reward:</strong> Dashboard → Profile → Rewards → Select Tier → Redeem → View Code/Equip
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-xs text-gray-500 border-t pt-4 mt-8">
          <p>CCN Health Kiosk - Internal Training Document</p>
          <p>For questions, contact the IT support team</p>
        </footer>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page-break-before { page-break-before: always; }
          @page { margin: 1cm; size: A4; }
        }
      `}</style>
    </div>
  );
};

export default StaffTrainingGuide;
