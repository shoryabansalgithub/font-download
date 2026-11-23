'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import HeroSection from './components/HeroSection';

/** Long enough for the button's loading state to be seen before the page changes. */
const KEY_PRESS_HOLD_MS = 400;

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSearch = (targetUrl: string) => {
    setLoading(true);
    setTimeout(() => {
      router.push(`/scan?url=${encodeURIComponent(targetUrl)}`);
    }, KEY_PRESS_HOLD_MS);
  };

  // The landing page is the machine and nothing else. The gradient matches the
  // photograph's own edges (dark sides, brighter grid floor) so any letterbox
  // around the scene reads as more of the room.
  return (
    <main className="flex min-h-screen flex-col justify-center bg-[linear-gradient(180deg,#012de6_0%,#0230ea_55%,#1d4df7_100%)]">
      <HeroSection onSearch={handleSearch} loading={loading} />
    </main>
  );
}
