import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageCircle, HelpCircle, Bug, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-semibold text-muted-foreground px-1 mb-2">{children}</p>;
}

const cardClass = 'bg-card border border-border rounded-[20px] overflow-hidden';

export default function Support() {
  const navigate = useNavigate();

  const faqs = [
    {
      question: 'How do I start a new round?',
      answer: 'Tap the "+" button on the home screen, select a course, add players, and choose your games. You can then share the round code or QR code with other players.',
    },
    {
      question: "How do I join someone else's round?",
      answer: 'Go to the Join Round page and either scan the QR code or enter the 6-character round code shared by the round creator.',
    },
    {
      question: 'How does handicap scoring work?',
      answer: "Players receive strokes on holes based on their handicap and the hole's difficulty rating. In match play, the difference between handicaps determines stroke allocation.",
    },
    {
      question: 'Can I use the app offline?',
      answer: 'Yes! Scores are saved locally and will sync automatically when you regain internet connection. A status indicator shows your online/offline status.',
    },
    {
      question: 'How do I add friends?',
      answer: "Go to the Friends page and share your friend code, or enter another player's friend code to send them a request.",
    },
    {
      question: 'What games are supported?',
      answer: 'MATCH supports Nassau, Skins, Match Play, Best Ball, Wolf, and Stableford scoring formats. You can enable multiple games in a single round.',
    },
  ];

  const contactItems = [
    { href: 'mailto:bugs@matchgolf.dev?subject=Bug%20Report', icon: Bug, title: 'Report a Bug', subtitle: 'Help us improve MATCH' },
    { href: 'mailto:feedback@matchgolf.dev?subject=Feature%20Request', icon: MessageCircle, title: 'Feature Request', subtitle: 'Share your ideas' },
  ];

  return (
    <div className="h-screen flex flex-col bg-background">
      <PageHeader title="Support" eyebrow="MATCH Golf" onBack={() => navigate(-1)} />

      <main className="flex-1 overflow-y-auto px-5 pt-1 pb-nav">
        <div className="max-w-3xl mx-auto space-y-3.5 pb-10">

          {/* Forest hero: the primary way to reach us */}
          <section className="bg-primary rounded-[28px] p-5 text-white">
            <p className="text-[13px] font-semibold text-on-forest-muted">Contact us</p>
            <h2 className="text-[26px] font-extrabold tracking-[-0.02em] leading-tight mt-1">Need a hand?</h2>
            <p className="text-[14px] text-on-forest-muted mt-1">Questions, bugs or ideas? Email the MATCH team.</p>
            <motion.a
              whileTap={{ scale: 0.98 }}
              href="mailto:support@matchgolf.dev"
              className="mt-4 flex items-center gap-3 h-14 pl-2 pr-4 rounded-[16px] bg-white/10"
            >
              <span className="w-10 h-10 rounded-[12px] bg-gold flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-gold-foreground" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-bold leading-tight">Email Support</span>
                <span className="block text-[13px] text-on-forest-muted truncate">support@matchgolf.dev</span>
              </span>
              <ChevronRight className="w-5 h-5 text-on-forest-muted" />
            </motion.a>
          </section>

          {/* Other contact options */}
          <section className={cardClass}>
            {contactItems.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                className={'flex items-center gap-3 px-4 min-h-[64px] active:bg-muted/60 transition-colors' + (i < contactItems.length - 1 ? ' border-b border-border' : '')}
              >
                <div className="w-10 h-10 rounded-[12px] bg-muted flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-[15px]">{item.title}</p>
                  <p className="text-[13px] text-muted-foreground">{item.subtitle}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </a>
            ))}
          </section>

          {/* FAQ Section */}
          <section>
            <SectionLabel>FAQ</SectionLabel>
            <div className={cardClass}>
              {faqs.map((faq, index) => (
                <details key={faq.question} className={'group' + (index < faqs.length - 1 ? ' border-b border-border' : '')}>
                  <summary className="flex items-center gap-3 px-4 min-h-[56px] py-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                    <HelpCircle className="w-5 h-5 text-primary shrink-0" />
                    <span className="font-semibold text-foreground flex-1 text-[15px] leading-snug">{faq.question}</span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="px-4 pb-4 pl-12">
                    <p className="text-[14px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
            <SectionLabel>About</SectionLabel>
            <div className={cardClass}>
              <div className="flex justify-between items-center px-4 min-h-[52px] border-b border-border">
                <span className="text-[15px] text-muted-foreground">Version</span>
                <span className="text-[15px] font-semibold text-foreground tabular-nums">1.0.0</span>
              </div>
              <div className="flex justify-between items-center px-4 min-h-[52px]">
                <span className="text-[15px] text-muted-foreground">Developer</span>
                <span className="text-[15px] font-semibold text-foreground">MATCH Golf</span>
              </div>
            </div>
          </section>

          {/* Legal */}
          <section>
            <SectionLabel>Legal</SectionLabel>
            <div className={cardClass}>
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate('/privacy-policy')}
                className="flex items-center justify-between w-full px-4 min-h-[56px] text-left border-b border-border"
              >
                <span className="font-semibold text-foreground text-[15px]">Privacy Policy</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.985 }}
                onClick={() => navigate('/terms-of-service')}
                className="flex items-center justify-between w-full px-4 min-h-[56px] text-left"
              >
                <span className="font-semibold text-foreground text-[15px]">Terms of Service</span>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </motion.button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
