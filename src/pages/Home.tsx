import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Skills from '@/components/Skills';
import Projects from '@/components/Projects';
import Education from '@/components/Education';
import References from '@/components/References';
import Contact from '@/components/Contact';
import Footer from '@/components/Footer';
import OwnerBar from '@/components/OwnerBar';
import { useReveal } from '@/hooks/useReveal';

export default function Home() {
  useReveal([]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Education />
        <References />
        <Contact />
      </main>
      <Footer />
      <OwnerBar />
    </div>
  );
}
