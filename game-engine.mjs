export const MAX_ATTEMPTS = 6;

export function parseWords(text) {
  return [...new Set(
    text
      .split(/\r?\n/)
      .map((word) => word.trim().toUpperCase())
      .filter((word) => /^[A-Z]+$/.test(word))
  )];
}

export function availableLengths(words) {
  return [...new Set(words.map((word) => word.length))]
    .filter((length) => length >= 3 && length <= 10)
    .sort((a, b) => a - b);
}

export function chooseTarget(words, length, random = Math.random) {
  const candidates = words.filter((word) => word.length === length);
  if (candidates.length === 0) {
    throw new Error(`No words of length ${length} are available.`);
  }
  return candidates[Math.floor(random() * candidates.length)];
}

export function getFeedback(target, guess) {
  const result = Array(guess.length).fill("gray");
  const remaining = target.split("");

  for (let index = 0; index < guess.length; index += 1) {
    if (guess[index] === remaining[index]) {
      result[index] = "green";
      remaining[index] = null;
    }
  }

  for (let index = 0; index < guess.length; index += 1) {
    if (result[index] === "green") continue;
    const match = remaining.indexOf(guess[index]);
    if (match !== -1) {
      result[index] = "yellow";
      remaining[match] = null;
    }
  }

  return result;
}
