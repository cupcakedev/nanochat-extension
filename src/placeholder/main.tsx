import React from 'react';
import ReactDOM from 'react-dom/client';
import '@app/styles/global.css';

function Spinner() {
  return (
    <div className="relative h-8 w-8">
      <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-brand-600 animate-spin" />
      <div className="absolute inset-[6px] rounded-full bg-brand-600/15 animate-pulse" />
    </div>
  );
}

function PlaceholderPage() {
  return (
    <main className="min-h-screen w-full bg-neutral-bg">
      <div className="flex min-h-screen items-center justify-center px-6">
        <section className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-neutral-100/80 border border-white/5 backdrop-blur-xl">
            <Spinner />
          </div>
          <p className="text-sm font-medium text-neutral-500">Loading NanoChat…</p>
        </section>
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlaceholderPage />
  </React.StrictMode>,
);
