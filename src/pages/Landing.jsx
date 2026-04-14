import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileSearch,
  Database,
  FileText,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  ArrowRight,
  CheckCircle,
  ChevronRight,
  Zap,
  Lock,
  BarChart3,
} from 'lucide-react';

const features = [
  {
    icon: Database,
    title: 'Document Ingestion',
    description: 'Upload PDF, DOCX, and XLSX files. We parse, chunk, and index every page automatically.',
  },
  {
    icon: FileSearch,
    title: 'RAG Retrieval',
    description: 'Retrieval-augmented generation surfaces the exact passages behind every claim.',
  },
  {
    icon: FileText,
    title: 'Executive Summaries',
    description: 'Structured investment memos generated in seconds — ready for IC presentation.',
  },
  {
    icon: TrendingUp,
    title: 'KPI Extraction',
    description: 'Automatically pull revenue, burn, margins, and 20+ other metrics with source citations.',
  },
  {
    icon: AlertTriangle,
    title: 'Red Flag Detection',
    description: 'Surface contradictions, missing data, and risk signals across all uploaded documents.',
  },
  {
    icon: BookOpen,
    title: 'Citation Tracking',
    description: 'Every output links back to the exact document and page — fully auditable.',
  },
];

const problems = [
  'Manually combing through 200-page data rooms',
  'Inconsistent analysis across deal teams',
  'No audit trail for AI-assisted conclusions',
  'Days of work before your first IC memo',
];

const solutions = [
  'Structured output in under 60 seconds',
  'Standardized framework across every deal',
  'Full citation back to source documents',
  'First draft ready before your next meeting',
];

const stats = [
  { value: '78%', label: 'Faster first-pass review' },
  { value: '94%', label: 'Citation accuracy' },
  { value: '12+', label: 'Document formats supported' },
  { value: 'SOC 2', label: 'Security ready' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0F172A] font-sans">
      {/* Nav */}
      <nav className="border-b border-slate-700/50 px-6 py-4 sticky top-0 z-50 bg-[#0F172A]/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <span className="text-white font-semibold text-base">DiligenceAI</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/dashboard"
              className="text-slate-300 hover:text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/dashboard"
              className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pt-20 pb-24 sm:pt-28 sm:pb-32">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
            <Zap size={13} className="text-blue-400" />
            <span className="text-blue-400 text-xs font-medium">AI-Powered · Citation-Backed · Auditable</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-[1.1] tracking-tight mb-6">
            AI-Powered Due Diligence.{' '}
            <span className="text-blue-400">Fast, Structured,</span>{' '}
            Verifiable.
          </h1>

          <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your data room. Get a structured investment memo with cited KPIs, red flags, and competitive analysis — in under a minute.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-6 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-blue-500/25"
            >
              Get Started Free
              <ArrowRight size={17} />
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white font-medium px-6 py-3.5 rounded-xl transition-colors text-base"
            >
              Request Demo
            </Link>
          </div>

          <p className="text-slate-600 text-xs mt-4">No credit card required · SOC 2 compliant infrastructure</p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-y border-slate-700/50 bg-[#1E293B]/50 px-6 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{s.value}</p>
              <p className="text-slate-400 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem / Solution */}
      <section className="px-6 py-20 sm:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              From messy data rooms to clear outputs
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Traditional due diligence is slow, inconsistent, and opaque. DiligenceAI changes that.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Problem */}
            <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-7">
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-red-500/15 rounded-lg flex items-center justify-center">
                  <span className="text-red-400 text-xs font-bold">!</span>
                </div>
                <h3 className="text-slate-200 font-semibold">The Old Way</h3>
              </div>
              <ul className="space-y-3.5">
                {problems.map((p) => (
                  <li key={p} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-400 text-xs font-bold">✕</span>
                    </div>
                    <span className="text-slate-400 text-sm leading-relaxed">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Solution */}
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-7 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 rounded-full blur-2xl" />
              <div className="flex items-center gap-2.5 mb-5">
                <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Zap size={13} className="text-blue-400" />
                </div>
                <h3 className="text-slate-200 font-semibold">With DiligenceAI</h3>
              </div>
              <ul className="space-y-3.5">
                {solutions.map((s) => (
                  <li key={s} className="flex items-start gap-3">
                    <CheckCircle size={17} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-200 text-sm leading-relaxed">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 sm:py-24 bg-[#1E293B]/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
              Every layer of analysis, covered
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto">
              Six integrated modules give you a complete picture of every deal.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ icon: Icon, title, description }) => (
              <div
                key={title}
                className="bg-[#0F172A] border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/30 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/15 transition-colors">
                  <Icon size={19} className="text-blue-400" />
                </div>
                <h3 className="text-slate-100 font-semibold text-base mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="px-6 py-20 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1E293B] border border-slate-700/50 rounded-2xl p-8 sm:p-12 text-center">
            <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Lock size={22} className="text-blue-400" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 tracking-tight">
              Built for institutional trust
            </h2>
            <p className="text-slate-400 text-base max-w-xl mx-auto mb-8 leading-relaxed">
              Your documents never train our models. All data is encrypted at rest and in transit. Configurable retention policies. Designed for venture, PE, and corporate development teams.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
              {['SOC 2 Ready', 'AES-256 Encryption', 'GDPR Compliant', 'No model training on your data'].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle size={14} className="text-green-400" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 sm:py-24 border-t border-slate-700/50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 tracking-tight">
            Ready to accelerate your diligence?
          </h2>
          <p className="text-slate-400 text-base mb-8">
            Join investment teams using DiligenceAI to close deals faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold px-7 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-blue-500/25"
            >
              Get Started Free
              <ArrowRight size={17} />
            </Link>
            <Link
              to="/dashboard"
              className="w-full sm:w-auto text-slate-400 hover:text-slate-200 font-medium px-4 py-3.5 text-base transition-colors"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 px-6 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-500 rounded-md flex items-center justify-center">
              <ShieldCheck size={12} className="text-white" />
            </div>
            <span className="text-slate-400 text-sm">DiligenceAI</span>
          </div>
          <p className="text-slate-600 text-xs">
            © 2024 DiligenceAI. All rights reserved. For authorized use only.
          </p>
        </div>
      </footer>
    </div>
  );
}
