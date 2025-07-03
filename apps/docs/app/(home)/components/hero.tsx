import Link from 'next/link';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import dedent from 'dedent';

export function Hero() {
  return (
    <section className="relative flex flex-1 flex-col justify-center items-center text-center px-4 py-16 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-card to-muted/20">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5 animate-pulse"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-ping opacity-20"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-chart-1/10 rounded-full blur-3xl animate-ping opacity-20 animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-chart-2/5 rounded-full blur-3xl opacity-10 animate-spin animation-duration-20000"></div>
      </div>

      {/* Floating LLM Badges */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 animate-float">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg">
            🤖 GPT-4
          </div>
        </div>
        <div className="absolute top-1/3 right-1/4 animate-float animation-delay-1000">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg">
            ⚡ Gemini
          </div>
        </div>
        <div className="absolute bottom-1/3 left-1/6 animate-float animation-delay-2000">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg">
            🧠 Claude
          </div>
        </div>
        <div className="absolute top-1/2 right-1/6 animate-float animation-delay-3000">
          <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-card-foreground shadow-lg">
            ⚡ TypeScript
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              TypeScript Port of Google's Python ADK
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent animate-gradient-x">
                Agent Development Kit
              </span>
              <br />
              <span className="text-foreground/80 text-3xl md:text-5xl lg:text-6xl">for TypeScript</span>
            </h1>

            <div className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Enhanced TypeScript port of Google's Agent Development Kit with simplified APIs and modern tooling
            </div>
          </div>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Build, deploy, and manage intelligent AI agents with <strong className="text-primary">TypeScript</strong> and <strong className="text-primary">multi-LLM support</strong>.
            Production-ready framework with <strong className="text-primary">AgentBuilder</strong> for rapid development.
          </p>

          {/* Quick Code Preview with proper syntax highlighting */}
          <div className="mx-auto text-left max-w-90">
            <DynamicCodeBlock
              lang="typescript"
              code={dedent`
                const response = await AgentBuilder
                  .withModel("gpt-4")
                  .ask("Build me an app");
              `}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/docs"
            className="group inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started
            <svg className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>

          <Link
            href="/docs/get-started/quickstart"
            className="group inline-flex items-center justify-center rounded-lg border border-border bg-background/80 backdrop-blur-sm px-8 py-3 text-lg font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground hover:scale-105 hover:shadow-lg"
          >
            Quick Start
            <svg className="ml-2 h-4 w-4 opacity-50 transition-all group-hover:opacity-100 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Stats/Features Bar */}
        <div className="flex flex-wrap justify-center gap-6 pt-8">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
            <span>Multi-LLM Support</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-chart-1 rounded-full animate-pulse animation-delay-500"></div>
            <span>Zero Boilerplate</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse animation-delay-1000"></div>
            <span>Production Ready</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 bg-chart-3 rounded-full animate-pulse animation-delay-1500"></div>
            <span>TypeScript First</span>
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-gradient-x {
          animation: gradient-x 3s ease infinite;
          background-size: 200% 200%;
        }

        .animation-delay-500 {
          animation-delay: 0.5s;
        }

        .animation-delay-1000 {
          animation-delay: 1s;
        }

        .animation-delay-1500 {
          animation-delay: 1.5s;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-3000 {
          animation-delay: 3s;
        }

        .animation-duration-20000 {
          animation-duration: 20s;
        }
      `}</style>
    </section>
  );
}