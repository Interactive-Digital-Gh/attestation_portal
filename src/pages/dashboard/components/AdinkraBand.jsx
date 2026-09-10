import Adinkra1 from '../../../assets/images/adinkra_1.svg';
import Adinkra2 from '../../../assets/images/adinkra_2.svg';

const COLS = 26;
const ROWS = 4;
const PITCH = 82;

/**
 * Faint Adinkra glyph lattice anchored to the bottom of the applicant pages
 * (Figma: 329px band, two alternating glyphs on an 82px diagonal lattice).
 * The SVGs carry a baked 10% opacity, so the band itself stays near 1.
 */
const AdinkraBand = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`absolute bottom-0 left-0 w-full h-[329px] overflow-hidden pointer-events-none select-none opacity-60 ${className}`}
  >
    <div
      className="absolute top-0 -left-5 grid"
      style={{ gridTemplateColumns: `repeat(${COLS}, ${PITCH}px)`, gridAutoRows: `${PITCH}px` }}
    >
      {Array.from({ length: COLS * ROWS }).map((_, i) => {
        const row = Math.floor(i / COLS);
        const col = i % COLS;
        if ((row + col) % 2 !== 0) return <div key={i} />;
        const useFirst = ((row + col) / 2) % 2 === 0;
        return (
          <div key={i} className="flex items-center justify-center">
            <img src={useFirst ? Adinkra1 : Adinkra2} alt="" className="w-[60px] h-[51px] rotate-45" />
          </div>
        );
      })}
    </div>
  </div>
);

export default AdinkraBand;
