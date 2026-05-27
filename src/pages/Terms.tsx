import { Link } from 'react-router-dom';
import { SEO } from '@/components/SEO';

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SEO title="Terms of Service" description="AWARTS terms of service — rules, acceptable use, content ownership, and account policies." canonical="/terms" keywords="terms of service, acceptable use, AWARTS terms, user agreement" jsonLd={{ "@context": "https://schema.org", "@type": "WebPage", "name": "Terms of Service", "description": "AWARTS terms of service", "url": "https://awarts.club/terms" }} />
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 h-14">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-4 bg-primary" style={{ clipPath: 'polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)' }} />
            <span className="font-mono text-sm font-bold text-foreground">AWARTS</span>
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: March 1, 2026</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_strong]:text-foreground">
          <h2>1. Acceptance</h2>
          <p>By using AWARTS (the "Service"), you agree to these terms. If you do not agree, do not use the Service.</p>

          <h2>2. Your Account</h2>
          <p>You are responsible for maintaining the security of your account. You must provide accurate information. One account per person.</p>

          <h2>3. Content Ownership</h2>
          <p>You retain ownership of all content you submit (session data, posts, images, comments). By posting, you grant AWARTS a license to display and distribute your content within the Service.</p>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Submit fabricated or manipulated usage data.</li>
            <li>Attempt to manipulate leaderboard rankings through artificial means.</li>
            <li>Harass, abuse, or threaten other users.</li>
            <li>Use automated tools to scrape data or create fake accounts.</li>
            <li>Interfere with the Service's operation or security.</li>
          </ul>

          <h2>5. AI Data Usage & Intellectual Property Policy</h2>
          <p>To protect AWARTS' original intellectual property, visual designs, and database from copycats, clones, and unauthorized replication, the following strict terms apply to all Artificial Intelligence (AI) models, Large Language Models (LLMs), scrapers, crawlers, and automated indexers:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Allowed Real-Time Queries:</strong> AI models (including those developed by OpenAI, Anthropic, Google, Meta, Apple, and Perplexity) are permitted to fetch public real-time pages <em>solely</em> to answer user-initiated queries, search results, or real-time assistant commands.</li>
            <li><strong>Strict Prohibition on Cloning & Mimicking:</strong> You are strictly prohibited from using AWARTS' visual layout, code structure, stylesheets, token-calculation algorithms, and core platform concepts to build, copy, train, or launch any competing, cloned, or highly derivative tracking platform.</li>
            <li><strong>No Bulk Scraping or Training:</strong> Bulk scraping, structural harvesting, or utilization of AWARTS' database, code, or interface for training custom AI models is strictly prohibited without explicit written consent from the platform owners.</li>
          </ul>

          <h2>6. Verified vs Unverified Data</h2>
          <p>Sessions submitted via the CLI are marked as "Verified." Web-imported data is marked as "Unverified." Verified sessions receive priority in leaderboard rankings.</p>

          <h2>7. Termination</h2>
          <p>We may suspend or terminate accounts that violate these terms. You may delete your account at any time through Settings.</p>

          <h2>8. Disclaimer</h2>
          <p>The Service is provided "as is" without warranty of any kind. We do not guarantee accuracy of cost estimates or token counts — these are derived from third-party provider data.</p>

          <h2>9. Changes</h2>
          <p>We may update these terms. Continued use after changes constitutes acceptance.</p>

          <h2>10. Contact</h2>
          <p>Questions about these terms? Open an issue on <a href="https://github.com/HarshalJain-cs/AWARTS" className="text-primary hover:underline">GitHub</a>.</p>
        </div>
      </main>

      <footer className="border-t border-border py-8 mt-12">
        <div className="max-w-3xl mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>&copy; {new Date().getFullYear()} AWARTS</span>
          <div className="flex gap-4">
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
