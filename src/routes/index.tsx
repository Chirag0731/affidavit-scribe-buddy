import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Lock, Zap, Download } from "lucide-react";

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
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
              <span className="text-gold font-serif font-bold text-lg">N</span>
            </div>
            <span className="font-serif font-bold text-xl text-gray-900">Neptora</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth" className="text-gray-600 hover:text-gray-900 transition-smooth">Sign In</Link>
            <Link to="/auth" className="btn-primary">Get Started</Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl lg:text-6xl font-serif font-bold text-gray-900 leading-tight mb-6">
              Generate Professional Affidavits in Seconds
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Streamline affidavit preparation with secure document automation. Pick a template, fill in the details, and generate a finished affidavit instantly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth" className="btn-primary text-center">Request Access</Link>
              <Link to="/auth" className="btn-secondary text-center">Sign In</Link>
            </div>
          </div>

          <div className="relative animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-transparent rounded-2xl blur-3xl" />
            <div className="relative bg-white border border-gray-200 rounded-xl shadow-lg p-8 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                <FileText className="w-5 h-5 text-gold" />
                <span className="font-medium text-gray-900">Affidavit of Service</span>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded w-2/3" />
                <div className="h-3 bg-gray-200 rounded w-full" />
                <div className="h-3 bg-gray-200 rounded w-5/6" />
              </div>
              <div className="pt-4 flex gap-2">
                <div className="flex-1 h-10 bg-black text-white rounded font-medium flex items-center justify-center text-sm">Generate</div>
                <div className="flex-1 h-10 bg-white border border-gray-300 rounded font-medium flex items-center justify-center text-sm">Download</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="rule" /></div>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="section-heading mb-4">Why Lawyers Choose Neptora</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Built for legal professionals who demand precision, security, and efficiency.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { Icon: Lock, title: "Secure", desc: "Enterprise-grade security with encrypted storage and role-based access controls." },
            { Icon: Zap, title: "Fast Generation", desc: "Generate professional documents in less than 60 seconds from start to finish." },
            { Icon: FileText, title: "Multiple Templates", desc: "Use pre-built templates covering the most common Canadian affidavits." },
            { Icon: Download, title: "Export Options", desc: "Download the finished affidavit as a plain-text file ready for further editing." },
          ].map(({ Icon, title, desc }) => (
            <div key={title} className="card-gold p-6 rounded-lg hover:shadow-md transition-smooth">
              <div className="w-12 h-12 bg-gold/20 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-gold" />
              </div>
              <h3 className="font-serif font-bold text-gray-900 mb-2">{title}</h3>
              <p className="text-gray-600 text-sm">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6"><div className="rule" /></div>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="bg-gray-50 rounded-xl p-12 text-center">
          <h2 className="section-heading mb-4">Ready to Streamline Your Process?</h2>
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto">
            Join law firms using Neptora to generate professional affidavits in seconds.
          </p>
          <Link to="/auth" className="btn-primary inline-flex">Get Started Free</Link>
        </div>
      </section>

      <footer className="border-t border-gray-200 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="mb-4">
            <BrandLogo height={24} />
          </div>
          <p className="text-sm text-gray-600">
            © {new Date().getFullYear()} Neptora. Professional document automation for law firms.
          </p>
        </div>
      </footer>
    </div>
  );
}
