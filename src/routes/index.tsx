import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Lock, Zap, Download } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Neptora — Professional Affidavit Generator" },
      { name: "description", content: "Streamline affidavit preparation with secure document automation." },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center hover:opacity-85 transition-smooth">
            <BrandLogo height={34} />
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition-smooth">Sign In</Link>
            <Link to="/auth" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl lg:text-6xl font-serif font-bold text-foreground leading-tight mb-6">
              Generate Professional Affidavits in Seconds
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Streamline affidavit preparation with secure document automation. Pick a template, fill in the details, and generate a finished affidavit instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth" className="btn-primary text-center">Request Access</Link>
              <Link to="/auth" className="btn-secondary text-center">Sign In</Link>
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl blur-3xl" />
            <div className="relative bg-card border border-border rounded-xl shadow-lg p-8 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border">
                <FileText className="w-5 h-5 text-gold" />
                <span className="font-medium text-foreground">Affidavit of Service</span>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-5/6" />
              </div>
              <div className="pt-4 flex gap-2">
                <div className="flex-1 h-10 bg-primary text-primary-foreground rounded font-medium flex items-center justify-center text-sm">Generate</div>
                <div className="flex-1 h-10 bg-card border border-border rounded font-medium flex items-center justify-center text-sm">Download</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="rule" /></div>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-4">Complete Legal Automation Platform</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Built for legal professionals, law firms, and caseworkers who demand precision, security, and effortless document automation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            { Icon: FileText, title: "Affidavit Automation", desc: "Generate professional court & tribunal affidavits in under 60 seconds with live preview and instant PDF/DOCX downloads." },
            { Icon: Zap, title: "Clause & Template Library", desc: "Standard legal affidavit templates with dynamic merge fields, conditional paragraphs, and custom notary stamps." },
            { Icon: Lock, title: "Encrypted Document Vault", desc: "Enterprise client-side WebCrypto AES-GCM encryption protects sensitive client records and sworn statements." },
            { Icon: Download, title: "Multi-Format Export", desc: "Export court-ready PDFs with precise legal typography, page numbering, and fully editable Microsoft Word DOCX files." },
            { Icon: Lock, title: "Role-Based Team Access", desc: "Granular access control for Super Admins, Staff with full visibility, and review coordinators." },
            { Icon: FileText, title: "Integrated Case Records", desc: "Centralized client management linking sworn affidavits, case notes, action items, and verifiable audit trails." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="card-gold p-6 rounded-lg hover:shadow-md transition-smooth">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-serif font-bold text-foreground mb-2">{title}</h3>
              <p className="text-muted-foreground text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="rule" /></div>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-card rounded-xl p-12 text-center border border-border">
          <h2 className="section-heading mb-4">Ready to Streamline Your Legal Document Workflow?</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
            Generate professional, court-ready affidavits and manage client files from one unified, secure platform.
          </p>
          <Link to="/auth" className="btn-primary inline-flex">Get Started Free</Link>
        </div>
      </section>

      <footer className="border-t border-border mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-4">
            <BrandLogo height={28} />
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Neptora. Professional legal document automation and affidavit management.
          </p>
        </div>
      </footer>
    </div>
  );
}
