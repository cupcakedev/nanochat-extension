import React from 'react';
import ReactDOM from 'react-dom/client';
import '@app/styles/global.css';

function Spinner() {
  return (
    <div className="relative h-10 w-10">
      <div className="absolute inset-0 rounded-full border-2 border-neutral-400/30 border-t-brand-600 animate-spin" />
      <div className="absolute inset-[7px] rounded-full bg-brand-600/20 animate-pulse" />
    </div>
  );
}

function PlaceholderPage() {
  return (
    <main className="min-h-screen w-full bg-neutral-bg text-neutral-800">
      <div className="mx-auto flex min-h-screen w-full max-w-2xl items-center justify-center px-6">
        <section className="w-full flex flex-col items-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-inset ring-white/10">
            <Spinner />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-neutral-800">NanoChat is thinking</h1>
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
