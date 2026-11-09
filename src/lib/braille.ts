/**
 * Literary (uncontracted) six-dot braille: dots 1–3 down the left of a cell,
 * 4–6 down the right. Letters, digits (after the number sign) and spaces;
 * anything else is left out.
 */
const LETTERS: Readonly<Record<string, readonly number[]>> = {
  a: [1], b: [1, 2], c: [1, 4], d: [1, 4, 5], e: [1, 5], f: [1, 2, 4], g: [1, 2, 4, 5], h: [1, 2, 5], i: [2, 4],
  j: [2, 4, 5], k: [1, 3], l: [1, 2, 3], m: [1, 3, 4], n: [1, 3, 4, 5], o: [1, 3, 5], p: [1, 2, 3, 4],
  q: [1, 2, 3, 4, 5], r: [1, 2, 3, 5], s: [2, 3, 4], t: [2, 3, 4, 5], u: [1, 3, 6], v: [1, 2, 3, 6],
  w: [2, 4, 5, 6], x: [1, 3, 4, 6], y: [1, 3, 4, 5, 6], z: [1, 3, 5, 6],
};
const NUMBER_SIGN = [3, 4, 5, 6];
const DIGIT_LETTERS = 'jabcdefghi';

/** The cells for a piece of text, a space being an empty cell. Exported for tests. */
export function brailleCells(text: string): (readonly number[])[] {
  const cells: (readonly number[])[] = [];
  let inNumber = false;
  for (const char of text.toLowerCase()) {
    if (char === ' ') {
      cells.push([]);
      inNumber = false;
    } else if (char >= '0' && char <= '9') {
      if (!inNumber) cells.push(NUMBER_SIGN);
      inNumber = true;
      cells.push(LETTERS[DIGIT_LETTERS[Number(char)] ?? 'j'] ?? []);
    } else if (LETTERS[char]) {
      inNumber = false;
      cells.push(LETTERS[char] ?? []);
    }
  }
  return cells;
}

