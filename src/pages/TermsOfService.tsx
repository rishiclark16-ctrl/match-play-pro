import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function TermsOfService() {
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
          <h1 className="text-lg font-bold">Terms of Service</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <p className="text-sm text-muted-foreground mb-6">Last updated: January 15, 2026</p>

          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By downloading, installing, or using MATCH Golf ("the App"), you agree to be bound
                by these Terms of Service. If you do not agree to these terms, do not use the App.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground mb-2">MATCH Golf is a mobile application that provides:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Real-time golf score tracking</li>
                <li>Multiplayer round synchronization</li>
                <li>Golf betting game calculations (skins, nassau, match play, wolf, etc.)</li>
                <li>Handicap tracking and calculations</li>
                <li>Voice-activated score entry</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">3. Account Registration</h2>
              <p className="text-muted-foreground mb-2">To use certain features, you must create an account. You agree to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your account credentials</li>
                <li>Notify us immediately of any unauthorized access</li>
                <li>Accept responsibility for all activities under your account</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">4. User Conduct</h2>
              <p className="text-muted-foreground mb-2">You agree not to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Use the App for any illegal purpose</li>
                <li>Interfere with or disrupt the App's functionality</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Impersonate other users or provide false information</li>
                <li>Use the App to harass, abuse, or harm others</li>
                <li>Reverse engineer or decompile the App</li>
              </ul>
            </div>

            <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
              <h2 className="text-xl font-bold mb-3">5. Betting and Gambling Disclaimer</h2>
              <p className="text-muted-foreground mb-3">
                <strong className="text-foreground">Important:</strong> MATCH Golf is a score-tracking
                and calculation tool only. The App:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Does NOT facilitate real money gambling or betting</li>
                <li>Does NOT process any financial transactions for bets</li>
                <li>Does NOT verify or enforce payment of any wagers</li>
                <li>Is intended for friendly games and entertainment purposes only</li>
              </ul>
              <p className="text-muted-foreground mt-3">
                Any financial arrangements between players are solely between those players.
                MATCH Golf is not responsible for any disputes or losses related to bets or
                wagers made using the App's calculations. Users are responsible for complying
                with all applicable gambling laws in their jurisdiction.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">6. Intellectual Property</h2>
              <p className="text-muted-foreground">
                The App and its contents, including but not limited to text, graphics, logos, and
                software, are owned by MATCH Golf and protected by intellectual property laws.
                You may not copy, modify, or distribute any part of the App without our written consent.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">7. User Content</h2>
              <p className="text-muted-foreground">
                You retain ownership of content you create (scores, round data, profile information).
                By using the App, you grant us a license to store, display, and process your content
                as necessary to provide the service.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">8. Privacy</h2>
              <p className="text-muted-foreground">
                Your use of the App is also governed by our{' '}
                <a href="/privacy-policy" className="text-primary underline">Privacy Policy</a>,
                which describes how we collect, use, and protect your information.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">9. Disclaimers</h2>
              <p className="text-muted-foreground mb-2">
                THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Uninterrupted or error-free operation</li>
                <li>Accuracy of handicap or game calculations</li>
                <li>Availability of the service at all times</li>
                <li>That the App will meet your specific requirements</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">10. Limitation of Liability</h2>
              <p className="text-muted-foreground mb-2">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, MATCH GOLF SHALL NOT BE LIABLE FOR:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-2">
                <li>Any indirect, incidental, or consequential damages</li>
                <li>Loss of data, profits, or goodwill</li>
                <li>Damages arising from bets or wagers between users</li>
                <li>Errors in score calculations or handicap computations</li>
              </ul>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">11. Termination</h2>
              <p className="text-muted-foreground">
                We may suspend or terminate your access to the App at any time for violation of
                these terms or for any other reason. You may delete your account at any time
                through the App settings.
              </p>
            </div>

            <div>
              <h2 className="text-xl font-bold mb-3">12. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may update these Terms of Service from time to time. Continued use of the App
                after changes constitutes acceptance of the new terms.
              </p>
            </div>

            <div className="pb-8">
              <h2 className="text-xl font-bold mb-3">13. Contact Us</h2>
              <p className="text-muted-foreground">
                For questions about these Terms of Service, please contact us at:{' '}
                <a href="mailto:support@matchgolf.dev" className="text-primary underline">
                  support@matchgolf.dev
                </a>
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
