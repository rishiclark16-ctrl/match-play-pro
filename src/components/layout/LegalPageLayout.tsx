import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from './PageHeader';

/**
 * Shell for long-form legal text (Privacy Policy, Terms of Service).
 * Restyles the plain h2/h3/p/ul markup inside it via descendant selectors,
 * so the legal copy itself never has to change for a visual refresh.
 */
export function LegalPageLayout({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  const navigate = useNavigate();
  return (
    <div className="h-screen flex flex-col bg-background">
      <PageHeader title={title} eyebrow="MATCH Golf" onBack={() => navigate(-1)} />
      <main className="flex-1 overflow-y-auto px-5 pt-1 pb-nav">
        <div className="max-w-3xl mx-auto">
          <p className="inline-flex items-center h-8 px-3 rounded-full bg-muted text-[12px] font-semibold text-muted-foreground mb-4">
            Last updated {updated}
          </p>
          <article
            className={[
              'bg-card border border-border rounded-[20px] px-5 py-6',
              '[&_section]:space-y-7',
              '[&_h2]:text-[19px] [&_h2]:font-extrabold [&_h2]:tracking-[-0.01em] [&_h2]:text-foreground [&_h2]:mb-2.5',
              '[&_h3]:text-[15px] [&_h3]:font-bold [&_h3]:text-foreground [&_h3]:mt-5 [&_h3]:mb-1.5',
              '[&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-muted-foreground',
              '[&_ul]:text-[15px] [&_ul]:leading-relaxed [&_ul]:text-muted-foreground [&_ul]:space-y-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:ml-0 [&_ul]:list-outside',
              '[&_li::marker]:text-primary',
              '[&_strong]:text-foreground [&_strong]:font-semibold',
              '[&_a]:text-primary [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2',
            ].join(' ')}
          >
            {children}
          </article>
        </div>
      </main>
    </div>
  );
}
