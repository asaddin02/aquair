// Ikon garis sederhana. Setiap ikon selalu didampingi teks di layar (spesifikasi 11).
const JALUR = {
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2zM16 16h2v2h-2z',
  rumah: ['M3 11 12 4l9 7', 'M5 10v10h14V10', 'M10 20v-6h4v6'],
  cek: 'm5 12 5 5 9-10',
  silang: 'M6 6l12 12M18 6 6 18',
  awas: ['M12 3 2 21h20L12 3z', 'M12 10v5M12 18v.5'],
  kiri: 'M15 5l-7 7 7 7',
  lokasi: ['M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z', 'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  radar: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z', 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 12l6-6'],
  dasbor: 'M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-3H4zM14 7h6V4h-6z',
  rit: ['M3 17h2l2-5h8l3 5h3', 'M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', 'M9 12V7h5'],
  orang: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6'],
  setuju: ['M9 12l2 2 4-4', 'M7 4h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3z'],
  uang: ['M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z', 'M12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'],
  galon: ['M9 3h6v3H9z', 'M8 6h8l1 3v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V9z', 'M7 13h10'],
  wa: ['M4 20l1.3-4A8 8 0 1 1 8 18.7z', 'M9 9.5c.5 2.5 3 5 5.5 5.5l1.2-1.4-2-1-.8.8c-1-.4-2-1.4-2.4-2.4l.8-.8-1-2z'],
  alat: 'M14.5 5.5a4 4 0 0 0 5 5L12 18l-3 3-3-3 3-3 7.5-7.5z',
  perisai: ['M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z', 'm9 12 2 2 4-4'],
  gerigi: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1'],
  sinyal: 'M2 20h2M7 20v-4M12 20v-8M17 20V8M22 20V4',
  unduh: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  bintang: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
  cetak: ['M7 9V3h10v6', 'M5 9h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2z', 'M7 14h10v7H7z'],
  tambah: 'M12 5v14M5 12h14',
  kunci: ['M7 11h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 11V8a4 4 0 0 1 8 0v3'],
  ulang: ['M4 12a8 8 0 0 1 14-5.3L20 9', 'M20 4v5h-5', 'M20 12a8 8 0 0 1-14 5.3L4 15', 'M4 20v-5h5'],
  lab: ['M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3', 'M7.5 15h9'],
  keluar: ['M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3', 'M10 17l5-5-5-5', 'M15 12H3'],
  kamera: ['M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z'],
};

export default function Ikon({ n, s = 20, className }) {
  const d = JALUR[n];
  if (!d) return null;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className={className}>
      {(Array.isArray(d) ? d : [d]).map((p) => <path key={p} d={p} />)}
    </svg>
  );
}

export function Logo({ s = 26 }) {
  return (
    <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 2C11 9 6 14.5 6 20a10 10 0 0 0 20 0C26 14.5 21 9 16 2z" fill="var(--brand)" />
      <path d="m11 20 3.5 3.5L21.5 16" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
