import { memo } from 'react';
import type { Place } from '../services/places';
import NativeImg from './NativeImg';
import { fixPhotoUrl } from '../utils/photoUrl';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CuratedSection {
  label: string;
  emoji: string;
  picks: (Place & { gem?: boolean })[];
}

interface CuratedPicksProps {
  sections: Record<'morning' | 'afternoon' | 'evening', CuratedSection>;
  vibeLabel: string;
  cityName: string;
  onAddPlace: (place: Place) => void;
  addedPlaceIds: Set<string>;
  onViewPlace?: (place: Place) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render dollar signs for the price level (1-4). */
function renderPriceLevel(level: number): string {
  if (level <= 0) return '';
  return '$'.repeat(Math.min(level, 4));
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const PickCard = memo(function PickCard({
  place,
  isAdded,
  onAdd,
  onView,
}: {
  place: Place & { gem?: boolean };
  isAdded: boolean;
  onAdd: () => void;
  onView?: () => void;
}) {
  const photoSrc = fixPhotoUrl(place.photoUrl);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${onView ? 'View details for ' : ''}${place.name}`}
      className="shrink-0 w-[160px] rounded-xl bg-bg-elevated border border-border-subtle overflow-hidden cursor-pointer"
      onClick={() => onView?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView?.();
        }
      }}
    >
      {/* Photo */}
      <div className="h-[120px] w-full relative overflow-hidden">
        {photoSrc ? (
          <NativeImg
            src={photoSrc}
            alt={place.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover block"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background:
                'linear-gradient(135deg, var(--bg-subtle) 0%, var(--bg-elevated) 100%)',
            }}
          >
            <span className="text-2xl opacity-40">{'\u{1F4CD}'}</span>
          </div>
        )}

        {/* Hidden Gem badge */}
        {place.gem && (
          <span className="absolute top-1.5 left-1.5 bg-amber-tint-bg10 text-accent-amber text-[10px] font-semibold px-1.5 py-0.5 rounded-md">
            Hidden Gem
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-2.5 pt-2 pb-2.5">
        <div className="text-[13px] font-bold text-text-primary truncate leading-tight">
          {place.name}
        </div>

        {place.categoryDisplay && (
          <div className="text-[11px] text-text-secondary mt-0.5 truncate">
            {place.categoryDisplay}
          </div>
        )}

        {/* Rating + Price */}
        <div className="flex items-center gap-1.5 mt-1">
          {place.rating > 0 && (
            <span className="text-[11px] text-accent-amber font-semibold">
              {'\u2605'} {place.rating.toFixed(1)}
            </span>
          )}
          {place.priceLevel > 0 && (
            <span className="text-[11px] text-text-tertiary">
              {renderPriceLevel(place.priceLevel)}
            </span>
          )}
        </div>

        {/* Add / Added button */}
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          {isAdded ? (
            <button
              disabled
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-green-tint-bg text-status-green border border-green-tint-border cursor-default min-h-[32px]"
            >
              Added {'\u2713'}
            </button>
          ) : (
            <button
              onClick={() => onAdd()}
              className="w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-accent-gradient text-text-on-accent border-none cursor-pointer min-h-[32px]"
              aria-label={`Add ${place.name} to plan`}
            >
              + Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Section row
// ---------------------------------------------------------------------------

const SectionRow = memo(function SectionRow({
  section,
  addedPlaceIds,
  onAddPlace,
  onViewPlace,
}: {
  section: CuratedSection;
  addedPlaceIds: Set<string>;
  onAddPlace: (place: Place) => void;
  onViewPlace?: (place: Place) => void;
}) {
  if (section.picks.length === 0) return null;

  return (
    <div className="mb-5">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-2.5 px-1">
        <span className="text-base">{section.emoji}</span>
        <span className="text-sm font-semibold text-text-primary">
          {section.label}
        </span>
        <span className="text-[11px] text-text-tertiary ml-auto">
          {section.picks.length} {section.picks.length === 1 ? 'pick' : 'picks'}
        </span>
      </div>

      {/* Horizontally scrollable cards — negative margins break out of parent px-5 padding */}
      <div className="-mx-5 px-5 flex gap-3 overflow-x-auto pb-2 scroll-hidden">
        {section.picks.map((place) => (
          <PickCard
            key={place.placeId}
            place={place}
            isAdded={addedPlaceIds.has(place.placeId)}
            onAdd={() => onAddPlace(place)}
            onView={onViewPlace ? () => onViewPlace(place) : undefined}
          />
        ))}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default memo(function CuratedPicks({
  sections,
  vibeLabel,
  cityName,
  onAddPlace,
  addedPlaceIds,
  onViewPlace,
}: CuratedPicksProps) {
  const sectionKeys: ('morning' | 'afternoon' | 'evening')[] = [
    'morning',
    'afternoon',
    'evening',
  ];

  const totalPicks = sectionKeys.reduce(
    (sum, key) => sum + sections[key].picks.length,
    0,
  );

  // Nothing to show at all
  if (totalPicks === 0) return null;

  return (
    <div>
      {/* Title */}
      <div className="mb-4 px-1">
        <div className="text-base font-bold text-text-primary">
          Curated Picks
        </div>
        <div className="text-[12px] text-text-tertiary mt-0.5">
          {vibeLabel} in {cityName}
        </div>
      </div>

      {/* Sections */}
      {sectionKeys.map((key) => (
        <SectionRow
          key={key}
          section={sections[key]}
          addedPlaceIds={addedPlaceIds}
          onAddPlace={onAddPlace}
          onViewPlace={onViewPlace}
        />
      ))}

      {/* Bottom hint */}
      <div className="text-center text-[11px] text-text-tertiary mt-1 mb-2">
        Tap <span className="font-semibold">+</span> to add picks to your day
      </div>
    </div>
  );
});
