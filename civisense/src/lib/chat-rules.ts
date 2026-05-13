export type ChatRule = { icon: string; text: string };

export const CHAT_RULES: ChatRule[] = [
  { icon: "✅", text: "Bagikan info banjir, jalan tergenang, kondisi cuaca" },
  { icon: "✅", text: "Verifikasi (✓) pesan yang Anda tahu benar" },
  { icon: "✅", text: "Lampirkan lokasi bila relevan" },
  { icon: "❌", text: "Spam, promosi, atau pesan tidak terkait banjir" },
  { icon: "❌", text: "Hoaks, info menyesatkan, atau provokasi" },
  { icon: "❌", text: "Kata kasar, SARA, atau menyerang individu" },
  { icon: "🚩", text: "Laporkan pesan menyesatkan — 3 laporan = pesan hilang" },
  { icon: "⏱️", text: "1 pesan per menit, hanya 50 pesan terakhir tersimpan" },
];
