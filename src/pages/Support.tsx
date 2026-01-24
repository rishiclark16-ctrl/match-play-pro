import { ArrowLeft, Mail, MessageCircle, HelpCircle, Bug, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TechCard, TechCardContent } from '@/components/ui/tech-card';

export default function Support() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: 'How do I start a new round?',
      answer: 'Tap the "+" button on the home screen, select a course, add players, and choose your games. You can then share the round code or QR code with other players.',
    },
    {
      question: 'How do I join someone else\'s round?',
      answer: 'Go to the Join Round page and either scan the QR code or enter the 6-character round code shared by the round creator.',
    },
    {
      question: 'How does handicap scoring work?',
      answer: 'Players receive strokes on holes based on their handicap and the hole\'s difficulty rating. In match play, the difference between handicaps determines stroke allocation.',
    },
    {
      question: 'Can I use the app offline?',
      answer: 'Yes! Scores are saved locally and will sync automatically when you regain internet connection. A status indicator shows your online/offline status.',
    },
    {
      question: 'How do I add friends?',
      answer: 'Go to the Friends page and share your friend code, or enter another player\'s friend code to send them a request.',
    },
    {
      question: 'What games are supported?',
      answer: 'MATCH supports Nassau, Skins, Match Play, Best Ball, Wolf, and Stableford scoring formats. You can enable multiple games in a single round.',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-background pb-safe">
      <header className="shrink-0 bg-background border-b border-border px-4 py-3 pt-safe-content">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold">Help & Support</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Contact Options */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Contact Us
            </h2>
            <TechCard>
              <TechCardContent className="p-0">
                <a
                  href="mailto:support@matchgolf.dev"
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Email Support</p>
                    <p className="text-sm text-muted-foreground">support@matchgolf.dev</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </a>
                <div className="border-t border-border" />
                <a
                  href="mailto:bugs@matchgolf.dev?subject=Bug%20Report"
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                    <Bug className="w-5 h-5 text-warning" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Report a Bug</p>
                    <p className="text-sm text-muted-foreground">Help us improve MATCH</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </a>
                <div className="border-t border-border" />
                <a
                  href="mailto:feedback@matchgolf.dev?subject=Feature%20Request"
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-success" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">Feature Request</p>
                    <p className="text-sm text-muted-foreground">Share your ideas</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </a>
              </TechCardContent>
            </TechCard>
          </section>

          {/* FAQ Section */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Frequently Asked Questions
            </h2>
            <TechCard>
              <TechCardContent className="p-0 divide-y divide-border">
                {faqs.map((faq, index) => (
                  <details key={index} className="group">
                    <summary className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors list-none">
                      <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                      <span className="font-medium flex-1">{faq.question}</span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-4 pl-12">
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                  </details>
                ))}
              </TechCardContent>
            </TechCard>
          </section>

          {/* App Info */}
          <section>
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
              About
            </h2>
            <TechCard>
              <TechCardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Version</span>
                  <span className="font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Developer</span>
                  <span className="font-medium">MATCH Golf</span>
                </div>
              </TechCardContent>
            </TechCard>
          </section>

          {/* Legal Links */}
          <section className="pb-8">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground mb-3">
              Legal
            </h2>
            <TechCard>
              <TechCardContent className="p-0">
                <button
                  onClick={() => navigate('/privacy-policy')}
                  className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="font-medium">Privacy Policy</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
                <div className="border-t border-border" />
                <button
                  onClick={() => navigate('/terms-of-service')}
                  className="flex items-center justify-between w-full p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <span className="font-medium">Terms of Service</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </TechCardContent>
            </TechCard>
          </section>
        </div>
      </main>
    </div>
  );
}
