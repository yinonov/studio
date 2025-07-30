import {
  createHebrewCSSInjection,
  injectHebrewStyles,
  setupHebrewSigning,
} from '../../src/lib/hebrew-signing';

describe('Hebrew Signing Utilities', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    (console.warn as jest.Mock).mockRestore();
    (console.log as jest.Mock).mockRestore();
  });
  describe('createHebrewCSSInjection', () => {
    it('generates css with rtl direction and translations', () => {
      const css = createHebrewCSSInjection();
      expect(css).toContain('direction: rtl');
      expect(css).toContain('Translate "Sign"');
    });
  });

  describe('injectHebrewStyles', () => {
    it('returns false when iframe has no contentDocument', () => {
      const iframe = document.createElement('iframe');
      const result = injectHebrewStyles(iframe);
      expect(result).toBe(false);
    });

    it('injects style element and marks elements as translated', () => {
      const iframe = document.createElement('iframe');
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.body.innerHTML = '<button>Sign</button>';

      const result = injectHebrewStyles(iframe);
      const style = doc.getElementById('hebrew-translations');
      const btn = doc.querySelector('button');

      expect(result).toBe(true);
      expect(style).toBeTruthy();
      expect(btn?.getAttribute('data-hebrew-translated')).toBe('true');
    });
  });

  describe('setupHebrewSigning', () => {
    it('logs warning after max retries when no iframe found', () => {
      jest.useFakeTimers();
      setupHebrewSigning(10, 2);
      jest.runOnlyPendingTimers();
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      expect(console.warn).toHaveBeenCalledWith(
        'Failed to setup Hebrew localization after',
        2,
        'attempts'
      );
    });
  });
});
