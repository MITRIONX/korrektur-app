import { generateQrCode, buildQrContent, parseQrContent, generateQrSheet, Student } from '../../src/services/qr';

describe('QR Code Service', () => {
  describe('generateQrCode', () => {
    it('returns a data URL starting with data:image/png;base64,', async () => {
      const content = buildQrContent(1, 1, 1);
      const dataUrl = await generateQrCode(content);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('parseQrContent', () => {
    it('parses valid content correctly', () => {
      const content = buildQrContent(42, 7, 2);
      const result = parseQrContent(content);
      expect(result).not.toBeNull();
      expect(result!.arbeitId).toBe(42);
      expect(result!.schuelerId).toBe(7);
      expect(result!.seitenNr).toBe(2);
    });

    it('returns null for invalid content', () => {
      expect(parseQrContent('invalid-content')).toBeNull();
      expect(parseQrContent('korrektur://wrong/format')).toBeNull();
      expect(parseQrContent('')).toBeNull();
    });
  });

  describe('generateQrSheet', () => {
    it('generates HTML containing student names and data URLs', async () => {
      const students: Student[] = [
        { id: 1, vorname: 'Max', nachname: 'Mustermann' },
        { id: 2, vorname: 'Erika', nachname: 'Musterfrau' },
      ];

      const html = await generateQrSheet(10, students, 2);

      expect(html).toContain('Max Mustermann');
      expect(html).toContain('Erika Musterfrau');
      expect(html).toMatch(/data:image\/png;base64,/);
      expect(html).toContain('<!DOCTYPE html>');
    });
  });
});
