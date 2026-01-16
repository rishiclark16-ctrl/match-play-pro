import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-background safe-top safe-bottom">
      <header className="shrink-0 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Privacy Policy</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground mb-6">Last updated: January 15, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground">
                MATCH Golf ("we," "our," or "us") is committed to protecting your privacy.
                This Privacy Policy explains how we collect, use, disclose, and safeguard
                your information when you use our mobile application.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">2. Information We Collect</h2>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.1 Personal Information</h3>
              <p className="text-muted-foreground mb-2">When you create an account, we collect:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><strong className="text-foreground">Email address</strong> - Used for account authentication and communication</li>
                <li><strong className="text-foreground">Name</strong> - Displayed to other players in your rounds</li>
                <li><strong className="text-foreground">Profile photo</strong> (optional) - Displayed on your profile and in rounds</li>
                <li><strong className="text-foreground">Golf handicap index</strong> (optional) - Used for handicap calculations</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.2 Golf Round Data</h3>
              <p className="text-muted-foreground mb-2">When you use the app to track golf rounds, we collect:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Golf course names and locations</li>
                <li>Hole-by-hole scores</li>
                <li>Game configurations (skins, nassau, match play, etc.)</li>
                <li>Round dates and times</li>
                <li>Player participation in rounds</li>
              </ul>

              <h3 className="text-lg font-semibold mt-4 mb-2">2.3 Device Permissions</h3>
              <p className="text-muted-foreground mb-2">With your permission, we may access:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><strong className="text-foreground">Camera</strong> - To scan QR codes for joining rounds</li>
                <li><strong className="text-foreground">Microphone</strong> - For voice-activated score entry</li>
                <li><strong className="text-foreground">Contacts</strong> - To invite friends to rounds (optional)</li>
                <li><strong className="text-foreground">Photos</strong> - To set your profile picture (optional)</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground mb-2">We use the collected information to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Provide and maintain the app's functionality</li>
                <li>Enable real-time score sharing with other players</li>
                <li>Calculate handicaps and game settlements</li>
                <li>Send important notifications about your rounds</li>
                <li>Improve app performance and fix bugs</li>
                <li>Respond to your support requests</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">4. Data Storage and Security</h2>
              <p className="text-muted-foreground mb-2">
                Your data is stored securely using Supabase, a trusted cloud database provider.
                We implement industry-standard security measures including:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure authentication with JWT tokens</li>
                <li>Row-level security policies</li>
                <li>Regular security audits</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">5. Data Sharing</h2>
              <p className="text-muted-foreground mb-2">We do not sell your personal information. We may share data with:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><strong className="text-foreground">Other players</strong> - Your name, scores, and handicap are visible to players in your rounds</li>
                <li><strong className="text-foreground">Service providers</strong> - We use Supabase for data storage and Sentry for error tracking</li>
                <li><strong className="text-foreground">Legal requirements</strong> - When required by law or to protect our rights</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">6. Your Rights</h2>
              <p className="text-muted-foreground mb-2">You have the right to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li><strong className="text-foreground">Access</strong> - Request a copy of your personal data</li>
                <li><strong className="text-foreground">Correction</strong> - Update or correct your information</li>
                <li><strong className="text-foreground">Deletion</strong> - Request deletion of your account and data</li>
                <li><strong className="text-foreground">Data portability</strong> - Export your round history</li>
                <li><strong className="text-foreground">Withdraw consent</strong> - Revoke permissions at any time</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">7. Data Retention</h2>
              <p className="text-muted-foreground">
                We retain your data for as long as your account is active. If you delete your account,
                we will delete your personal information within 30 days, except where retention is required by law.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                MATCH Golf is not intended for children under 13. We do not knowingly collect
                information from children under 13. If you believe we have collected such information,
                please contact us.
              </p>
            </div>

            <div className="pb-8">
              <h2 className="text-xl font-bold mb-3">9. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy or your data, please contact us at:{' '}
                <a href="mailto:privacy@matchgolf.dev" className="text-primary underline">
                  privacy@matchgolf.dev
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
