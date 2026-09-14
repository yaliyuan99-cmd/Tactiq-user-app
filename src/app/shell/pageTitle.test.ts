import { hashTarget, pageTitleFromDocumentTitle } from './pageTitle';

describe('pageTitleFromDocumentTitle', () => {
  it('removes the product suffix', () => {
    expect(pageTitleFromDocumentTitle('Train · Tactiq')).toBe('Train');
    expect(pageTitleFromDocumentTitle('Lesson: Confirm and back · Tactiq')).toBe('Lesson: Confirm and back');
  });

  it('keeps titles without the suffix, including the bare product name', () => {
    expect(pageTitleFromDocumentTitle('Tactiq')).toBe('Tactiq');
    expect(pageTitleFromDocumentTitle('Something else')).toBe('Something else');
  });
});

describe('hashTarget', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('finds the element named by a hash, decoding it', () => {
    document.body.innerHTML = '<section id="emergency"></section><section id="a b"></section>';
    expect(hashTarget('#emergency')?.id).toBe('emergency');
    expect(hashTarget('#a%20b')?.id).toBe('a b');
  });

  it('returns null for an empty or unknown hash', () => {
    expect(hashTarget('')).toBeNull();
    expect(hashTarget('#')).toBeNull();
    expect(hashTarget('#missing')).toBeNull();
    expect(hashTarget('#%E0%A4%A')).toBeNull();
  });
});
