/**
 * Ikon SVG dari Figma. `group` dan `stroke` adalah posisi vektor di dalam kotak ikon,
 * disalin dari Figma supaya ukuran garisnya tepat.
 */
const IKON = {
  phone: { size: 16, group: '16.67% 16.67% 12.5% 12.5%', stroke: '-7.35%' },
  mail: { size: 16, group: '20.83% 12.5%', stroke: '-8.93% -6.95%' },
  'map-pin': { size: 30, group: '12.5% 20.83%', stroke: '-3.7% -4.76%' },
  image: { size: 32, group: '16.67% 12.5%', stroke: '-3.91% -3.47%' },
  'arrow-white': { size: 16, group: '25% 20.83%', stroke: '-10.42% -8.93%' },
  'arrow-dark': { size: 16, group: '25% 20.83%', stroke: '-10.42% -8.93%' },
  'arrow-primary': { size: 16, group: '25% 20.83%', stroke: '-10.42% -8.93%' },
  'chevron-nav': { size: 16, group: '37.5% 25%', stroke: '-20.83% -10.42%' },
  shield: { size: 14, group: '12.5% 16.67%', stroke: '-7.94% -8.93%' },
  'shield-sm': { size: 12, group: '12.5% 16.67%', stroke: '-9.26% -10.42%' },
  clock: { size: 14, group: '12.5%', stroke: '-7.94%' },
  'clock-sm': { size: 12, group: '12.5%', stroke: '-9.26%' },
  lock: { size: 14, group: '12.5% 20.83%', stroke: '-7.94% -10.2%' },
  ship: { size: 24, group: '16.67% 12.5% 12.5% 12.5%', stroke: '-4.9% -4.63%' },
  heart: { size: 24, group: '22.49% 12.22% 16.67% 12.22%', stroke: '-5.71% -4.6%' },
  users: { size: 24, group: '18.75% 10.4% 16.67% 10.42%', stroke: '-5.38% -4.39%' },
  'file-text': { size: 24, group: '12.5% 20.83%', stroke: '-4.63% -5.95%' },
  award: { size: 24, group: '12.5% 25%', stroke: '-4.63% -6.94%' },
  stamp: { size: 24, group: '25% 20.83% 12.5% 20.83%', stroke: '-5.56% -5.95%' },
  menu: { size: 22, group: '25% 16.67%', stroke: '-7.58% -5.68%' },
  user: { size: 28, group: '16.67% 16.67% 12.5% 16.67%', stroke: '-4.2% -4.46%' },
  home: { size: 14, group: '16.67% 16.67% 12.5% 16.67%', stroke: '-8.4% -8.93%' },
  'chevron-right': { size: 14, group: '25% 37.5%', stroke: '-11.9% -23.81%' },
  'map-pin-md': { size: 24, group: '12.5% 20.83%', stroke: '-4.63% -5.95%' },
  'file-text-sm': { size: 20, group: '12.5% 20.83%', stroke: '-5.56% -7.14%' },
  download: { size: 16, group: '16.67% 20.83%', stroke: '-7.81% -8.93%' },
  search: { size: 20, group: '16.67%', stroke: '-6.25%' },
  'tag-22': { size: 22, group: '16.67% 12.5% 8.33% 12.5%', stroke: '-5.05%' },
  'calendar-22': { size: 22, group: '12.5%', stroke: '-5.05%' },
  'smartphone-22': { size: 22, group: '8.33% 25%', stroke: '-4.55% -7.58%' },
  'chevron-right-20': { size: 20, group: '25% 37.5%', stroke: '-8.33% -16.67%' },
  'chevron-right-16': { size: 16, group: '25% 37.5%', stroke: '-10.42% -20.83%' },
  'chevron-left-16': { size: 16, group: '25% 37.5%', stroke: '-10.42% -20.83%' },
  'chevron-16': { size: 16, group: '25% 37.5%', stroke: '-10.42% -20.83%' },
  'chevron-primary-16': { size: 16, group: '25% 37.5%', stroke: '-10.42% -20.83%' },
  'alert-20': { size: 20, group: '12.5%', stroke: '-5.56%' },
  'ship-20': { size: 20, group: '16.67% 12.5% 12.5% 12.5%', stroke: '-5.88% -5.56%' },
  'heart-20': { size: 20, group: '22.49% 12.22% 16.67% 12.22%', stroke: '-6.85% -5.51%' },
  'users-20': { size: 20, group: '18.75% 10.4% 16.67% 10.42%', stroke: '-6.45% -5.26%' },
  'hammer-20': { size: 20, group: '8.33% 8.33% 16.67% 16.67%', stroke: '-5.56%' },
  'award-20': { size: 20, group: '12.5% 25%', stroke: '-5.56% -8.33%' },
  'send-20': { size: 20, group: '12.5%', stroke: '-5.56%' },
  'stamp-20': { size: 20, group: '25% 20.83% 12.5% 20.83%', stroke: '-6.67% -7.14%' },
  'copy-20': { size: 20, group: '16.67%', stroke: '-6.25%' },
  'map-pin-22': { size: 22, group: '12.5% 20.83%', stroke: '-5.05% -6.49%' },
  'phone-22': { size: 22, group: '16.67% 16.67% 12.5% 12.5%', stroke: '-5.35%' },
  'mail-22': { size: 22, group: '20.83% 12.5%', stroke: '-6.49% -5.05%' },
  'clock-22': { size: 22, group: '12.5%', stroke: '-5.05%' },
  'globe-22': { size: 22, group: '12.5%', stroke: '-5.05%' },
  'map-pin-32': { size: 32, group: '12.5% 20.83%', stroke: '-3.47% -4.46%' },
  'nav-grid': { size: 20, group: '12.5%', stroke: '-5.56%' },
  'nav-inbox-aktif': { size: 20, group: '20.83% 12.5% 16.67% 12.5%', stroke: '-6.67% -5.56%' },
  'nav-clipboard': { size: 20, group: '12.5% 20.83%', stroke: '-5.56% -7.14%' },
  'nav-pen': { size: 20, group: '20.83% 20.83% 16.67% 16.67%', stroke: '-6.67%' },
  'nav-selesai': { size: 20, group: '12.5% 20.83%', stroke: '-5.56% -7.14%' },
  'nav-file': { size: 20, group: '12.5% 20.83%', stroke: '-5.56% -7.14%' },
  'log-out': { size: 18, group: '12.5%', stroke: '-6.17%' },
  check: { size: 16, group: '0%', stroke: '0%' },
  upload: { size: 20, group: '0%', stroke: '0%' },
  megaphone: { size: 20, group: '20.83% 10.5% 20.83% 16.67%', stroke: '-7.14% -5.72%' },
} as const;

export type IconName = keyof typeof IKON;

/** `ukuran` memperbesar ikon yang tidak punya versi tersendiri di Figma. */
export function Icon({ name, ukuran }: { name: IconName; ukuran?: number }) {
  const { size, group, stroke } = IKON[name];
  const sisi = ukuran ?? size;
  return (
    <span className="icon" style={{ width: sisi, height: sisi }} aria-hidden="true">
      <span className="icon__group" style={{ inset: group }}>
        <span className="icon__stroke" style={{ inset: stroke }}>
          <img src={`/icons/${name}.svg`} alt="" />
        </span>
      </span>
    </span>
  );
}
