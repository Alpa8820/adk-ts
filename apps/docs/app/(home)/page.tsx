"use client"
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
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
            <div className="space-y-2">
              <div className="inline-flex items-center bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Production Ready Framework
              </div>

              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-primary via-chart-1 to-chart-2 bg-clip-text text-transparent animate-gradient-x">
                  Agent Development Kit
                </span>
                <br />
                <span className="text-foreground/80 text-3xl md:text-5xl lg:text-6xl">for TypeScript</span>
              </h1>
            </div>

            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Build, deploy, and manage intelligent AI agents with <strong className="text-primary">TypeScript</strong> and <strong className="text-primary">multi-LLM support</strong>.
              Production-ready framework with AgentBuilder for rapid development.
            </p>

            {/* Quick Code Preview */}
            <div className="bg-card/50 backdrop-blur-sm border border-border rounded-lg p-4 max-w-2xl mx-auto">
              <div className="text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-destructive rounded-full"></div>
                    <div className="w-2 h-2 bg-chart-4 rounded-full"></div>
                    <div className="w-2 h-2 bg-chart-3 rounded-full"></div>
                  </div>
                  <span className="text-xs text-muted-foreground">TypeScript</span>
                </div>
                <pre className="text-sm text-foreground">
                  <code className="block">
                    <span className="text-chart-2">const</span> <span className="text-foreground">response</span> <span className="text-muted-foreground">=</span> <span className="text-chart-2">await</span> <span className="text-chart-1">AgentBuilder</span>
                    <br />
                    <span className="ml-2 text-muted-foreground">.</span><span className="text-chart-3">withModel</span><span className="text-muted-foreground">(</span><span className="text-chart-4">"gpt-4"</span><span className="text-muted-foreground">)</span>
                    <br />
                    <span className="ml-2 text-muted-foreground">.</span><span className="text-chart-3">ask</span><span className="text-muted-foreground">(</span><span className="text-chart-4">"Build me an app"</span><span className="text-muted-foreground">);</span>
                  </code>
                </pre>
              </div>
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

      {/* Features Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Choose ADK TypeScript?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to build production-ready AI agents with TypeScript's type safety and modern tooling.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">AgentBuilder API</h3>
              <p className="text-muted-foreground">Fluent interface for rapid agent creation with zero boilerplate. Create agents in one line or build complex workflows.</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-chart-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Multi-LLM Support</h3>
              <p className="text-muted-foreground">Seamlessly switch between OpenAI, Google Gemini, Anthropic Claude, and more with unified interface.</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-chart-3/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-chart-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Production Ready</h3>
              <p className="text-muted-foreground">Built-in session management, memory services, streaming, and artifact handling for enterprise deployment.</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-chart-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Advanced Tooling</h3>
              <p className="text-muted-foreground">Custom tools, function integration, Google Cloud tools, MCP support, and automatic schema generation.</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-chart-5/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-chart-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Multi-Agent Workflows</h3>
              <p className="text-muted-foreground">Orchestrate complex workflows with parallel, sequential, and hierarchical agent architectures.</p>
            </div>

            <div className="bg-card rounded-lg p-6 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">Developer Experience</h3>
              <p className="text-muted-foreground">Excellent DX with TypeScript IntelliSense, comprehensive examples, and intuitive APIs.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Build Agents in One Line
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              AgentBuilder's fluent interface eliminates boilerplate and lets you focus on building intelligent agents.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-foreground">Simple yet Powerful</h3>
                <p className="text-muted-foreground">
                  From one-line agents to complex multi-agent workflows, AgentBuilder scales with your needs.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">1</div>
                  <span className="text-foreground">Install @iqai/adk package</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">2</div>
                  <span className="text-foreground">Choose your LLM provider</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">3</div>
                  <span className="text-foreground">Start building agents</span>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p><strong>Supported Models:</strong> GPT-4, Claude-3.5-Sonnet, Gemini-2.5-Flash, and more</p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-6 border border-border">
              <pre className="text-sm text-foreground overflow-x-auto">
                <code>{`import { AgentBuilder } from '@iqai/adk';

// One-line agent creation
const response = await AgentBuilder
  .withModel("gemini-2.5-flash")
  .ask("What is the primary function of an AI agent?");

// Agent with session and tools
const { agent, runner, session } = await AgentBuilder
  .create("my_assistant")
  .withModel("gpt-4")
  .withDescription("A helpful AI assistant")
  .withInstruction("Provide concise responses.")
  .withTools(new GoogleSearch(), new HttpRequestTool())
  .withQuickSession("my-app", "user-123")
  .build();

// Multi-agent workflow
const workflow = await AgentBuilder
  .create("research_workflow")
  .asSequential([researchAgent, summaryAgent])
  .build();`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-gradient-to-r from-primary/5 via-chart-1/5 to-chart-2/5">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Build Your First Agent?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join developers building the future of AI with TypeScript. Get started with our comprehensive documentation and examples.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/docs/get-started/installation"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-all hover:bg-primary/90 hover:scale-105 shadow-lg"
            >
              Start Building
              <svg className="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>

            <Link
              href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
              className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-8 py-3 text-lg font-medium text-foreground transition-all hover:bg-accent hover:text-accent-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Examples
              <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* About */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">ADK TypeScript</h3>
              <p className="text-sm text-muted-foreground">
                Production-ready framework for building intelligent AI agents with TypeScript and multi-LLM support.
              </p>
              <div className="flex space-x-4">
                <Link
                  href="https://github.com/IQAIcom/adk-ts"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </Link>
                <Link
                  href="https://www.npmjs.com/package/@iqai/adk"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Documentation */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">Documentation</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/docs/get-started" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Getting Started
                  </Link>
                </li>
                <li>
                  <Link href="/docs/agents" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Agent Building
                  </Link>
                </li>
                <li>
                  <Link href="/docs/tools" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Tools & Functions
                  </Link>
                </li>
                <li>
                  <Link href="/docs/context" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Context & Memory
                  </Link>
                </li>
                <li>
                  <Link href="/docs/deploy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Deployment
                  </Link>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/tree/main/apps/examples"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Examples
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/blob/main/CHANGELOG.md"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Changelog
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/blob/main/CONTRIBUTION.md"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contributing
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/issues"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Issues & Support
                  </Link>
                </li>
              </ul>
            </div>

            {/* Community */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-card-foreground">Community</h3>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/discussions"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Discussions
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/releases"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Releases
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/blob/main/LICENSE.md"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    License
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/IQAIcom/adk-ts/blob/main/CODE_OF_CONDUCT.md"
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Code of Conduct
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="mt-12 pt-8 border-t border-border">
            <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
              <div className="text-sm text-muted-foreground">
                © 2025 ADK TypeScript. Released under the MIT License.
              </div>
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <span>Built with TypeScript</span>
                <span>•</span>
                <span>Powered by AI</span>
                <span>•</span>
                <Link
                  href="https://www.npmjs.com/package/@iqai/adk"
                  className="hover:text-primary transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  npm package
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
