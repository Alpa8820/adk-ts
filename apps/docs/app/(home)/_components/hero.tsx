import Link from 'next/link';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import dedent from 'dedent';

export function Hero() {
  return (
    <section className="relative flex flex-1 flex-col justify-center items-center px-4 py-12 overflow-hidden">
      {/* Subtle Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted/20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5"></div>

        {/* Minimal floating orbs */}
        <div className="absolute top-8 left-8 w-32 h-32 bg-primary/10 rounded-full blur-2xl animate-ping opacity-20"></div>
        <div className="absolute bottom-8 right-8 w-40 h-40 bg-chart-1/10 rounded-full blur-2xl animate-ping opacity-20 animation-delay-2000"></div>

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-grid-pattern opacity-3"></div>
      </div>

      {/* Main content - split layout */}
      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-full text-sm font-medium mb-4">
            <svg className="w-3.5 h-3.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            TypeScript Port of Google's Python ADK
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-3">
            <span className="text-foreground">
              Agent Development Kit
            </span>
            <br />
            <span className="text-primary text-2xl md:text-3xl lg:text-4xl font-medium">for TypeScript</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Enhanced TypeScript port with simplified APIs and modern tooling
          </p>
        </div>

        {/* Split content layout */}
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Left side - Description and features */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Build intelligent AI agents with ease
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Production-ready framework supporting <strong className="text-primary">multiple LLMs</strong>,
                built with <strong className="text-primary">TypeScript</strong> for type safety and modern development.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-muted-foreground">Multi-LLM Support</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-chart-1 rounded-full"></div>
                <span className="text-muted-foreground">Zero Boilerplate</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-chart-2 rounded-full"></div>
                <span className="text-muted-foreground">Production Ready</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                <span className="text-muted-foreground">TypeScript First</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/docs"
                className="group inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-md"
              >
                Get Started
                <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <Link
                href="/docs/get-started/quickstart"
                className="group inline-flex items-center justify-center rounded-lg border border-border bg-background/80 backdrop-blur-sm px-6 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105"
              >
                Quick Start
                <svg className="ml-2 h-4 w-4 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right side - Code preview */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-chart-1/20 rounded-lg blur opacity-25"></div>
            <div className="relative bg-card border border-border rounded-lg overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 border-b border-border">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                </div>
                <span className="text-xs text-muted-foreground font-mono">agent.ts</span>
              </div>
              <div className="p-4">
                <DynamicCodeBlock
                  lang="typescript"
                  code={dedent`
                    const response = await AgentBuilder
                      .withModel("gpt-4")
                      .withTools([SearchTool, FileTool])
                      .ask("Build me an app");

                    console.log(response.content);
                  `}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Compact CSS animations */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0);
          background-size: 24px 24px;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
}