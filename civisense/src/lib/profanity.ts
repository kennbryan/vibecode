const PROFANE_WORDS = [
  "anjing",
  "bangsat",
  "bastard",
  "bitch",
  "brengsek",
  "bullshit",
  "damn",
  "fuck",
  "goblok",
  "idiot",
  "kampret",
  "kontol",
  "memek",
  "ngentot",
  "pantek",
  "pepek",
  "shit",
  "tai",
  "tolol",
] as const;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const PROFANITY_SOURCE = `(^|[^\\p{L}\\p{N}_])(${PROFANE_WORDS.map(escapeRegExp).join("|")})(?=$|[^\\p{L}\\p{N}_])`;

function makeProfanityPattern() {
  return new RegExp(PROFANITY_SOURCE, "giu");
}

export function sanitizeProfanity(value: string) {
  return value.replace(makeProfanityPattern(), (_match, prefix: string) => `${prefix}***`);
}

export function containsProfanity(value: string) {
  return makeProfanityPattern().test(value);
}
