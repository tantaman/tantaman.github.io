import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

/**
 * Blog homepage – v2
 * – Pixel‑art‑meets‑photorealistic logo that morphs on hover
 * – Deeper glass‑morphism cards with gleam / glare layers
 * – Same data + layout so it’s a drop‑in upgrade
 */
const posts = [];

export default function BlogHome() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-blue-900 to-blue-800 text-gray-50 selection:bg-blue-300/40 font-sans">
      {/* ————————————————————— Top bar / Logo */}
      <header className="relative z-30 flex items-center justify-center h-24">
        {/* Pixel‑art → photoreal cross‑fade */}
        <div className="relative group w-24 h-24">
          {/* Pixel version */}
          <img
            src="/avatar_pixel.png"
            alt="pixel avatar logo"
            className="w-full h-full object-cover rounded-full border-4 border-white/60 shadow-xl"
            style={{
              imageRendering: 'pixelated',
            }}
          />
          {/* Photoreal version – revealed on hover */}
          <img
            src="/avatar_real.jpg"
            alt="photo avatar logo"
            className="absolute inset-0 w-full h-full object-cover rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out"
          />
        </div>
      </header>

      {/* ————————————————————— Hero */}
      <section className="relative flex items-center justify-center h-[45vh] overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1522196772883-5e45a87cc5b0?auto=format&fit=crop&w=1600&q=80"
          alt="hero background"
          className="absolute inset-0 w-full h-full object-cover object-center scale-105 brightness-75"
        />
        <div className="absolute inset-0 backdrop-blur-md bg-blue-900/50" />
        <h1 className="relative z-10 text-3xl md:text-5xl font-extrabold tracking-wide drop-shadow-lg">
          Thoughts on Code & Life
        </h1>
      </section>

      {/* ————————————————————— Posts grid */}
      <main className="py-16 px-4 md:px-8 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, idx) => (
            <motion.article
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: idx * 0.04,
              }}
              viewport={{ once: true }}
              className="group"
            >
              {/* Glass card */}
              <Card className="relative overflow-hidden rounded-3xl border border-white/25 bg-white/10 backdrop-blur-xl shadow-2xl transition-transform duration-300 hover:-translate-y-1 hover:shadow-3xl">
                {/* Edge highlight */}
                <div className="pointer-events-none absolute inset-0 border border-white/60 opacity-5 rounded-3xl" />
                {/* Glass gleam – appears on hover */}
                <div className="pointer-events-none absolute -inset-0.5 bg-gradient-to-br from-white/60 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Header image */}
                <div className="h-40 w-full overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <CardContent className="relative p-6">
                  <h2 className="text-lg font-semibold leading-snug mb-1 line-clamp-2 hover:text-blue-300 transition-colors duration-200">
                    {post.title}
                  </h2>
                  <p className="text-sm text-gray-200/80 mb-3">
                    {post.date} · {post.category}
                  </p>
                  <p className="text-sm leading-relaxed line-clamp-3 mb-6 text-gray-200/90">
                    {post.excerpt}
                  </p>
                  <Button
                    variant="ghost"
                    className="px-0 text-blue-300 hover:text-blue-200"
                  >
                    Read more →
                  </Button>
                </CardContent>
              </Card>
            </motion.article>
          ))}
        </div>
      </main>

      {/* ————————————————————— footer */}
      <footer className="w-full py-10 text-center text-sm text-gray-300/80">
        © {new Date().getFullYear()} — Your Name. All rights reserved.
      </footer>
    </div>
  );
}
