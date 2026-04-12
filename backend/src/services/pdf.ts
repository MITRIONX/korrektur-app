import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';
import { config } from '../config';

interface Student {
  id: number;
  vorname: string;
  nachname: string;
}

/**
 * Generates a combined PDF with QR codes for each student.
 * Takes the template PDF and adds a QR code + student name at the specified position.
 * Returns the path to the generated PDF.
 */
export async function generateStudentPdfs(
  arbeitId: number,
  templatePdfPath: string,
  students: Student[],
  qrX: number, // percentage 0-100 from left
  qrY: number, // percentage 0-100 from top
): Promise<string> {
  const templateBytes = fs.readFileSync(templatePdfPath);
  const combinedPdf = await PDFDocument.create();
  const font = await combinedPdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await combinedPdf.embedFont(StandardFonts.HelveticaBold);

  for (const student of students) {
    // Load fresh copy of template for each student
    const templateDoc = await PDFDocument.load(templateBytes);
    const pages = templateDoc.getPages();

    for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
      const page = pages[pageIdx];
      const { width, height } = page.getSize();

      // Generate QR code as PNG buffer
      const qrContent = `korrektur://arbeit/${arbeitId}/schueler/${student.id}/seite/${pageIdx + 1}`;
      const qrPngBuffer = await QRCode.toBuffer(qrContent, { width: 80, margin: 1 });

      // Embed QR image
      const qrImage = await templateDoc.embedPng(qrPngBuffer);
      const qrSize = 60; // points

      // Calculate position from percentages
      // qrX/qrY are percentages from top-left
      // PDF coordinate system is bottom-left, so we need to flip Y
      const posX = (qrX / 100) * width;
      const posY = height - (qrY / 100) * height - qrSize - 14; // 14 for name text below

      // Draw QR code
      page.drawImage(qrImage, {
        x: posX,
        y: posY + 14, // above the name
        width: qrSize,
        height: qrSize,
      });

      // Draw student name below QR code
      const nameText = `${student.vorname} ${student.nachname}`;
      const nameWidth = font.widthOfTextAtSize(nameText, 8);
      const nameX = posX + (qrSize - nameWidth) / 2; // center under QR

      page.drawText(nameText, {
        x: Math.max(2, nameX),
        y: posY,
        size: 8,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Copy all pages from this student's version to combined PDF
    const copiedPages = await combinedPdf.copyPages(templateDoc, templateDoc.getPageIndices());
    for (const copiedPage of copiedPages) {
      combinedPdf.addPage(copiedPage);
    }
  }

  // Save combined PDF
  const outputDir = path.join(config.uploadDir, 'pdfs', String(arbeitId));
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `arbeit-${arbeitId}-alle.pdf`);
  const pdfBytes = await combinedPdf.save();
  fs.writeFileSync(outputPath, pdfBytes);

  return outputPath;
}
