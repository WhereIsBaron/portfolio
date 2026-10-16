import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Skills from '@/components/Skills';
import Projects from '@/components/Projects';
import Terminal from '@/components/Terminal';
import Education from '@/components/Education';
import References from '@/components/References';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import OwnerBar from '@/components/OwnerBar';
import MobileCTA from '@/components/MobileCTA';
import { useReveal } from '@/hooks/useReveal';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Home() {
  usePageTitle('');
  useReveal([]);

  return (
    <div className="paper min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Terminal />
        <Education />
        <References />
        <Contact />
      </main>
      <Footer />
      <OwnerBar />
      <MobileCTA />
    </div>
  );
}
