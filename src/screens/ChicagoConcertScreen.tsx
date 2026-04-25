import { Link, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import { useApp } from '../context/AppContext';

interface ConcertPick {
  name: string;
  category: string;
  walkMin: number;
  vibe: string;
  why: string;
  emoji: string;
}

// Curated picks for the Soldier Field concert weekend.
// All hand-picked for proximity, atmosphere, and the kind of energy that fits
// a big show night. Walking minutes are from Soldier Field.
const PRE_SHOW: ConcertPick[] = [
  { name: 'Three Aces', category: 'Italian / Bar', walkMin: 12, vibe: 'High energy, group-friendly', why: 'Loud Italian-American spot in Little Italy with strong cocktails. Pre-game without breaking the bank.', emoji: '\u{1F35D}' },
  { name: 'Maple & Ash', category: 'Steakhouse', walkMin: 18, vibe: 'Date night, splurge', why: 'Gold Coast power steakhouse — the play if you want to eat well before the show.', emoji: '\u{1F969}' },
  { name: 'Cira', category: 'Mediterranean', walkMin: 10, vibe: 'Cool, scene-y', why: 'Hoxton Hotel rooftop. Mediterranean small plates. Sunset views over the South Loop.', emoji: '\u{1F319}' },
  { name: 'Lou Mitchell\u2019s', category: 'Diner / Brunch', walkMin: 15, vibe: 'Old Chicago classic', why: 'Iconic Chicago diner. Get the eggs early and walk it off heading to the stadium.', emoji: '\u{1F373}' },
  { name: 'Acanto', category: 'Italian', walkMin: 22, vibe: 'Refined, not fussy', why: 'Quiet Italian on Michigan Ave. Pasta hits, quick service if you tell them you\u2019ve got tickets.', emoji: '\u{1F35D}' },
  { name: 'Avli on the Park', category: 'Greek', walkMin: 14, vibe: 'Lively, lake views', why: 'Greek tavern overlooking Lakefront. Whole branzino and a view of the skyline.', emoji: '\u{1F990}' },
];

const POST_SHOW: ConcertPick[] = [
  { name: 'Au Cheval', category: 'Late-night burger', walkMin: 22, vibe: 'Dark, loud, perfect post-show', why: 'Some say it\u2019s the best burger in America. Open until 1 AM. Worth the walk to West Loop.', emoji: '\u{1F354}' },
  { name: 'Small Cheval', category: 'Quick burger', walkMin: 25, vibe: 'Same kitchen, faster', why: 'Au Cheval\u2019s walk-up sibling. Same flavor, no wait.', emoji: '\u{1F35F}' },
  { name: 'Green Street Smoked Meats', category: 'BBQ / Bar', walkMin: 28, vibe: 'Loud post-show energy', why: 'Texas-style brisket in West Loop. Stays late, perfect group-trip move.', emoji: '\u{1F355}' },
  { name: 'Pequod\u2019s Pizza', category: 'Deep-dish', walkMin: 38, vibe: 'Chicago classic', why: 'Caramelized cheese crust. The Chicago pizza locals actually argue is the best.', emoji: '\u{1F355}' },
  { name: 'Untitled Supper Club', category: 'Live music + cocktails', walkMin: 30, vibe: 'Sophisticated late', why: 'Hidden whiskey lounge with live jazz/soul. Keep the music night going.', emoji: '\u{1F3B7}' },
  { name: 'The Aviary', category: 'Cocktails', walkMin: 30, vibe: 'Showstopper cocktails', why: 'Grant Achatz\u2019s cocktail laboratory. Reservation needed but worth the planning.', emoji: '\u{1F378}' },
];

const NEXT_DAY_BRUNCH: ConcertPick[] = [
  { name: 'Ina Mae Tavern', category: 'New Orleans brunch', walkMin: 35, vibe: 'Wicker Park, neighborhoody', why: 'NOLA-inspired brunch. Beignets, fried chicken, big drinks. Cures everything.', emoji: '\u{1F95E}' },
  { name: 'Kasama', category: 'Filipino brunch', walkMin: 40, vibe: 'Michelin, walk-in', why: 'World\u2019s only Michelin-starred Filipino. Brunch is walk-in. Get there at 10.', emoji: '\u{1F95E}' },
  { name: 'Bongo Room', category: 'Brunch institution', walkMin: 25, vibe: 'Sweet spot, lines worth it', why: 'Pancake flights and white-chocolate-pretzel fillings. Famous for a reason.', emoji: '\u{1F95E}' },
  { name: 'Mama Delia', category: 'Coastal Italian', walkMin: 33, vibe: 'Light, beautiful room', why: 'Lake Michigan-meets-Mediterranean. Elegant brunch if you\u2019re recovering well.', emoji: '\u{1F35E}' },
  { name: 'Beatrix River North', category: 'Healthy brunch', walkMin: 28, vibe: 'Recovery mode', why: 'Big menu, cleansing options, great coffee. Where to go when you need to feel human again.', emoji: '\u{1F957}' },
  { name: 'Big Star', category: 'Tacos + Bloody Marys', walkMin: 38, vibe: 'Wicker Park patio', why: 'Tacos, frozen margs, hangover food. The patio is the move on a sunny day.', emoji: '\u{1F32E}' },
];

interface SectionProps {
  title: string;
  subtitle: string;
  picks: ConcertPick[];
  emoji: string;
}

function Section({ title, subtitle, picks, emoji }: SectionProps) {
  return (
    <section className="mb-12">
      <div className="mb-5">
        <div className="text-2xl mb-1">{emoji}</div>
        <h2 className="font-heading text-2xl font-bold text-text-primary mb-1">{title}</h2>
        <p className="text-sm text-text-tertiary">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {picks.map((pick) => (
          <div key={pick.name} className="card-edge-glow rounded-2xl border border-border-subtle bg-bg-elevated p-4">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-base">{pick.emoji}</span>
                  <h3 className="font-heading font-bold text-text-primary text-[15px] truncate">{pick.name}</h3>
                </div>
                <div className="text-[12px] text-text-tertiary">{pick.category}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-[11px] font-bold text-accent-amber bg-amber-tint-bg10 px-2 py-1 rounded-md inline-block whitespace-nowrap">
                  {pick.walkMin} min walk
                </div>
              </div>
            </div>
            <div className="text-[11px] uppercase tracking-wider text-text-muted font-semibold mt-2 mb-1">
              {pick.vibe}
            </div>
            <p className="text-[13px] text-text-secondary leading-relaxed">{pick.why}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ChicagoConcertScreen() {
  const navigate = useNavigate();
  const { cities, setSelectedCity, setUseGps, setScreen } = useApp();

  const handlePlanMyWeekend = () => {
    // Pre-select Chicago and drop the user into the home screen ready to plan
    const chicago = cities.find(c => c.slug === 'chicago');
    if (chicago) {
      setSelectedCity(chicago);
      setUseGps(false);
    }
    setScreen('home');
    navigate('/');
  };

  return (
    <div className="font-sans bg-bg-body min-h-screen text-text-primary">
      <div className="max-w-[760px] mx-auto px-5 pt-8 pb-16">
        {/* Back link */}
        <Link to="/" className="text-accent-amber no-underline text-sm font-medium">
          {'\u2190'} Back to NxStops
        </Link>

        {/* Hero */}
        <div className="mt-8 mb-10">
          <div className="inline-block text-[10px] font-bold uppercase tracking-[0.15em] text-accent-amber bg-amber-tint-bg10 border border-amber-tint-border20 rounded-full px-3 py-1 mb-4">
            {'\u{1F3A4}'} Concert Weekend Guide
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-3 leading-[1.05]">
            Heading to <span className="bg-accent-text-gradient">Raymond & Brown</span> at Soldier Field?
          </h1>
          <p className="text-[15px] md:text-lg text-text-secondary leading-relaxed mb-6">
            Don\u2019t fly in just for the show. We\u2019ve curated the best pre-show dinners,
            post-show late-night spots, and next-morning brunches around the venue. Every pick
            is hand-picked for vibe, walking distance, and energy that fits a big concert night.
          </p>
          <button
            onClick={handlePlanMyWeekend}
            className="bg-accent-gradient text-text-on-accent border-none rounded-[14px] px-6 py-3.5 text-[15px] font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)] active:scale-[0.97] transition-transform"
          >
            {'\u{2728}'} Plan My Concert Weekend
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3 mb-12 p-5 rounded-2xl border border-border-subtle bg-bg-elevated">
          <div className="text-center">
            <div className="font-heading text-2xl font-bold text-accent-amber">18</div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-wide mt-1">Curated picks</div>
          </div>
          <div className="text-center border-x border-border-subtle">
            <div className="font-heading text-2xl font-bold text-accent-amber">{'\u003C'}30 min</div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-wide mt-1">Walking distance</div>
          </div>
          <div className="text-center">
            <div className="font-heading text-2xl font-bold text-accent-amber">3 day</div>
            <div className="text-[11px] text-text-tertiary uppercase tracking-wide mt-1">Weekend covered</div>
          </div>
        </div>

        <Section
          title="Pre-Show Dinner"
          subtitle="Eat well before the show. All within 25 min of Soldier Field."
          picks={PRE_SHOW}
          emoji="\u{1F37D}\u{FE0F}"
        />

        <Section
          title="Post-Show Late Night"
          subtitle="Concert ends around 11pm. Don\u2019t go straight back to the hotel."
          picks={POST_SHOW}
          emoji="\u{1F319}"
        />

        <Section
          title="Brunch the Next Day"
          subtitle="Recovery mode. Great food. Worth waking up for."
          picks={NEXT_DAY_BRUNCH}
          emoji="\u{2615}"
        />

        {/* Final CTA */}
        <div className="mt-4 text-center px-6 py-10 bg-bg-elevated rounded-2xl border border-amber-tint-border20">
          <h2 className="font-heading text-2xl font-bold mb-2">Want a personalized day plan?</h2>
          <p className="text-text-secondary text-sm mb-6 max-w-md mx-auto leading-relaxed">
            NxStops builds a full curated day around your vibe in under 10 seconds — restaurants,
            stops, sunset spots, late-night, all timed perfectly.
          </p>
          <button
            onClick={handlePlanMyWeekend}
            className="bg-accent-gradient text-text-on-accent border-none rounded-[14px] px-8 py-4 text-base font-semibold cursor-pointer shadow-[0_4px_20px_var(--amber-tint-shadow)] active:scale-[0.97] transition-transform"
          >
            Open NxStops in Chicago
          </button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
