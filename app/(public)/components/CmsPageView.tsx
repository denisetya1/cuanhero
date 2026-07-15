type CmsPageViewProps = {
  title: string;
  content: string;
  label: string;
};

export default function CmsPageView({ title, content, label }: CmsPageViewProps) {
  return (
    <main className="relative mx-auto min-h-[70vh] w-full max-w-5xl overflow-hidden px-4 py-16 md:px-8 md:py-24">
      <div className="pointer-events-none absolute left-1/2 top-8 h-72 w-[80%] -translate-x-1/2 rounded-full bg-cyan-400/8 blur-[110px]" />

      <header className="relative border-b border-white/10 pb-10 md:pb-14">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px w-10 bg-cyan-300/70" />
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.3em] text-cyan-300">
            {label}
          </p>
        </div>
        <h1 className="max-w-4xl text-4xl font-bold leading-tight text-white md:text-6xl">
          {title}
        </h1>
      </header>

      <article
        className="cms-public-content relative py-10 text-base leading-8 text-slate-300 md:py-14"
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </main>
  );
}

