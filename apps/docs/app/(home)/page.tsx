import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center items-center text-center px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="mb-6 text-5xl font-bold tracking-tight lg:text-7xl">
          <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            Agent Development Kit
          </span>
          <br />
          <span className="text-foreground/80">for TypeScript</span>
        </h1>

        <p className="mb-8 text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Build, deploy, and manage AI agents with <strong>TypeScript</strong> and <strong>Google's Gemini models</strong>
        </p>

        <Link
          href="/docs"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-8 py-3 text-lg font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          View Documentation
          <svg
            className="ml-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </Link>
      </div>
    </main>
  );
}
