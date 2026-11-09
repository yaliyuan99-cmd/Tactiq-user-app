import { brailleCells } from './braille';

describe('brailleCells', () => {
  it('writes letters in literary braille', () => {
    // h a n d
    expect(brailleCells('hand')).toEqual([[1, 2, 5], [1], [1, 3, 4, 5], [1, 4, 5]]);
    expect(brailleCells('t')).toEqual([[2, 3, 4, 5]]);
  });

  it('puts the number sign before a run of digits and keeps spaces as empty cells', () => {
    expect(brailleCells('lesson 12')).toEqual([[1, 2, 3], [1, 5], [2, 3, 4], [2, 3, 4], [1, 3, 5], [1, 3, 4, 5], [], [3, 4, 5, 6], [1], [1, 2]]);
  });

  it('leaves out what it cannot write', () => {
    expect(brailleCells('a—b!')).toEqual([[1], [1, 2]]);
  });
});
