"use client"

import { Hero } from './components/hero';
import { Features } from './components/features';
import { CodeExample } from './components/code-example';
import { CTA } from './components/cta';
import { Footer } from './components/footer';

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <Features />
      <CodeExample />
      <CTA />
      <Footer />
    </div>
  );
}
