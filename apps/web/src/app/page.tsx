import Link from 'next/link';
import { headers } from 'next/headers';
import { getBrandName, getSetting } from '../lib/settings';

type BuyLinks = Record<string, unknown>;

function getVisitorCountry(): string | null {
  const requestHeaders = headers();
  const country = requestHeaders.get('x-vercel-ip-country') || requestHeaders.get('cf-ipcountry') || requestHeaders.get('x-country-code');
  return country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null;
}

function getSafeBuyLink(buyLinks: BuyLinks, visitorCountry: string | null): string | null {
  const countryKey = visitorCountry === 'GB' ? 'UK' : visitorCountry;
  const candidate = countryKey ? buyLinks[countryKey] ?? buyLinks.GLOBAL : buyLinks.GLOBAL;
  if (typeof candidate !== 'string') return null;
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [brandName, contestPaused, buyLinks, grandPrizeAmount, grandPrizeIsPlaceholder] = await Promise.all([
    getBrandName(),
    getSetting<boolean>('contest_paused', false),
    getSetting<BuyLinks>('buy_links', {}),
    getSetting<number>('grand_prize_amount_usd', 0),
    getSetting<boolean>('grand_prize_is_placeholder', true),
  ]);
  const buyLink = getSafeBuyLink(buyLinks, getVisitorCountry());
  const grandPrizeMessage = grandPrizeIsPlaceholder || !Number.isFinite(grandPrizeAmount) || grandPrizeAmount <= 0
    ? 'Grand prize amount to be announced.'
    : `Grand prize: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(grandPrizeAmount)}.`;

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <section className="relative isolate">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_15%,rgba(79,70,229,0.45),transparent_31%),radial-gradient(circle_at_86%_4%,rgba(245,158,11,0.22),transparent_25%),linear-gradient(135deg,#020617_0%,#111827_52%,#172554_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8 lg:px-10" aria-label="Main navigation">
          <Link href="/" className="text-base font-bold tracking-tight text-white sm:text-lg">{brandName}</Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-200 transition hover:text-white">Log in</Link>
            <Link href="/signup" className="rounded-full border border-white/15 bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-slate-950/20 transition hover:bg-amber-100">Join the challenge</Link>
          </div>
        </nav>

        {contestPaused && (
          <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10">
            <div role="status" className="rounded-xl border border-amber-300/30 bg-amber-300/10 px-4 py-3 text-sm text-amber-100"><span className="font-semibold">Submissions are paused.</span> We are temporarily carrying out contest maintenance.</div>
          </div>
        )}

        <div className="mx-auto grid max-w-6xl gap-14 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-16 lg:px-10 lg:pb-28">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/20 bg-amber-200/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> The Billion-Dollar Sudoku Challenge</p>
            <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">Solve 100 puzzles. <span className="text-amber-300">Could you win $1 billion?</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">One hundred puzzles. One extraordinary finish. Solve every challenge, submit your work, and put yourself in contention for a life-changing billion-dollar grand prize.</p>
            <p className="mt-4 text-sm font-semibold text-amber-200">{grandPrizeMessage}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:ring-offset-2 focus:ring-offset-slate-950">Play the challenge</Link>
              {buyLink && <a href={buyLink} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-slate-950">Buy the book</a>}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">Book buyers may qualify for $1,000 per-puzzle prizes and the $1 billion grand prize. Free players may enter for the grand prize.</p>
          </div>

          <div className="relative mx-auto w-full max-w-md [perspective:1200px] lg:max-w-none" aria-hidden="true">
            <div className="absolute -inset-6 rounded-[2rem] bg-indigo-500/20 blur-3xl" />
            <div className="hero-orbit absolute -right-2 -top-8 rounded-full border border-amber-200/30 bg-amber-300/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-100 shadow-lg shadow-amber-950/40">$1B grand prize</div>
            <div className="hero-cube relative rounded-[1.75rem] border border-white/15 bg-slate-900/75 p-4 shadow-2xl shadow-black/30 backdrop-blur sm:p-6">
              <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Your next move</p><p className="mt-1 text-lg font-bold text-white">Puzzle 01</p></div><div className="rounded-lg bg-amber-300 px-3 py-1.5 text-xs font-bold text-slate-950">9 × 9</div></div>
              <div className="grid grid-cols-9 overflow-hidden rounded-xl border-2 border-slate-200/80 bg-slate-100 text-center text-sm font-bold text-slate-800 shadow-inner sm:text-base">
                {[5, '', '', '', 7, '', '', '', 2, '', 9, '', 1, '', '', 8, '', '', '', '', 3, '', '', 5, '', 6, '', 8, '', '', 7, '', '', '', '', 4, '', 6, '', '', 4, '', '', 1, '', 7, '', '', '', 2, '', '', '', 9, '', 3, '', 6, '', '', 8, '', '', '', 1, '', '', '', '', 9, '', 4, '', '', '', 6, '', '', 2, '', '', '', 5].map((digit, index) => {
                  const row = Math.floor(index / 9); const column = index % 9;
                  return <div key={index} className={`aspect-square border border-slate-300/80 p-1 sm:p-2 ${(column === 2 || column === 5) ? 'border-r-2 border-r-slate-700' : ''} ${(row === 2 || row === 5) ? 'border-b-2 border-b-slate-700' : ''} ${digit ? 'bg-slate-200 text-slate-950' : 'bg-white text-indigo-600'}`}>{digit || (index === 12 || index === 40 || index === 68 ? <span className="text-indigo-500">•</span> : '')}</div>;
                })}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm"><span className="text-slate-300">100 puzzles. One shot.</span><span className="font-semibold text-amber-200">Make it count.</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 text-slate-900 sm:py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8 lg:px-10"><div className="max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">A clear path to play</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Bring your best thinking to every grid.</h2></div>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">{[['01', 'Create your account', 'Sign up with Google or email, then choose how you would like to participate.'], ['02', 'Take on all 100 puzzles', 'Enter each solution carefully. Given digits stay locked so every grid starts fair.'], ['03', 'Submit with confidence', 'Your completed grid is checked against Sudoku rules before it is saved.']].map(([number, title, description]) => <li key={number} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm"><span className="text-sm font-black text-indigo-600">{number}</span><h3 className="mt-6 text-lg font-bold">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p></li>)}</ol>
        </div>
      </section>

      <section className="bg-slate-100 py-16 text-slate-900 sm:py-20"><div className="mx-auto grid max-w-6xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-10"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Built for fair play</p><h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your work stays yours.</h2></div><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-bold">Book buyers</h3><p className="mt-2 text-sm leading-6 text-slate-600">Upload proof of purchase for review. You can still submit puzzle solutions while it is pending.</p></div><div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><h3 className="font-bold">Free players</h3><p className="mt-2 text-sm leading-6 text-slate-600">Join the challenge without buying the book and enter for the grand prize.</p></div></div></div></section>

      <footer className="border-t border-white/10 bg-slate-950 px-5 py-8 text-center text-sm text-slate-400 sm:px-8"><p>© {new Date().getFullYear()} {brandName}. Solve thoughtfully. Play fairly.</p></footer>
    </main>
  );
}

