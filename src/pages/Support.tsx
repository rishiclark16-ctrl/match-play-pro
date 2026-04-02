import { motion } from 'framer-motion';
import { ArrowLeft, Mail, MessageCircle, HelpCircle, Bug, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    {
      href: 'mailto:support@matchgolf.dev',
      icon: Mail,
      iconBg: 'bg-[#EFF6FF]',
      iconColor: 'text-[#3B82F6]',
      title: 'Email Support',
      subtitle: 'support@matchgolf.dev',
    },
    {
      href: 'mailto:bugs@matchgolf.dev?subject=Bug%20Report',
      icon: Bug,
      iconBg: 'bg-[#FEF3C7]',
      iconColor: 'text-[#D97706]',
      title: 'Report a Bug',
      subtitle: 'Help us improve MATCH',
    },
    {
      href: 'mailto:feedback@matchgolf.dev?subject=Feature%20Request',
      icon: MessageCircle,
      iconBg: 'bg-[#F0FFF4]',
      iconColor: 'text-[#22C55E]',
      title: 'Feature Request',
      subtitle: 'Share your ideas',
    },
  ];

  return (
    <div className="h-screen flex flex-col bg-[#F8F8F6]">
      {/* Header */}
      <header className="shrink-0 px-6 pt-safe-content pb-3 border-b-2 border-foreground">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </motion.button>
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">MATCH Golf</p>
            <h1 className="text-[22px] font-black tracking-[-0.04em] text-foreground leading-none">Support</h1>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 pb-safe">
        <div className="max-w-3xl mx-auto space-y-4">

          {/* Contact Options */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Contact Us</p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              {contactItems.map((item, i) => (
                <div key={item.href}>
                  <a
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3.5"
                  >
                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center`}>
                      <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-foreground text-[14px]">{item.title}</p>
                      <p className="text-[12px] text-muted-foreground">{item.subtitle}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </a>
                  {i < contactItems.length - 1 && <div className="h-px bg-border/50 mx-4" />}
                </div>
              ))}
            </div>
          </section>

          {/* FAQ Section */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">FAQ</p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              {faqs.map((faq, index) => (
                <div key={faq.question}>
                  <details className="group">
                    <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none">
                      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <span className="font-medium text-foreground flex-1 text-[14px]">{faq.question}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-90" />
                    </summary>
                    <div className="px-4 pb-4 pl-14">
                      <p className="text-[13px] text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  </details>
                  {index < faqs.length - 1 && <div className="h-px bg-border/50 mx-4" />}
                </div>
              ))}
            </div>
          </section>

          {/* About */}
          <section>
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">About</p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] px-4 py-3">
              <div className="flex justify-between py-1.5">
                <span className="text-[14px] text-muted-foreground">Version</span>
                <span className="text-[14px] font-semibold text-foreground">1.0.0</span>
              </div>
              <div className="h-px bg-border/50" />
              <div className="flex justify-between py-1.5">
                <span className="text-[14px] text-muted-foreground">Developer</span>
                <span className="text-[14px] font-semibold text-foreground">MATCH Golf</span>
              </div>
            </div>
          </section>

          {/* Legal */}
          <section className="pb-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground px-1 mb-2">Legal</p>
            <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/privacy-policy')}
                className="flex items-center justify-between w-full px-4 py-3.5 text-left"
              >
                <span className="font-medium text-foreground text-[14px]">Privacy Policy</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
              <div className="h-px bg-border/50 mx-4" />
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/terms-of-service')}
                className="flex items-center justify-between w-full px-4 py-3.5 text-left"
              >
                <span className="font-medium text-foreground text-[14px]">Terms of Service</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.button>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
