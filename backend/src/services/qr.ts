import QRCode from 'qrcode';

export interface Student {
  id: number;
  vorname: string;
  nachname: string;
}

export async function generateQrCode(content: string): Promise<string> {
  return QRCode.toDataURL(content, { width: 150, margin: 1 });
}

export function buildQrContent(arbeitId: number, schuelerId: number, seitenNr: number): string {
  return `korrektur://arbeit/${arbeitId}/schueler/${schuelerId}/seite/${seitenNr}`;
}

export function parseQrContent(content: string): { arbeitId: number; schuelerId: number; seitenNr: number } | null {
  const match = content.match(/^korrektur:\/\/arbeit\/(\d+)\/schueler\/(\d+)\/seite\/(\d+)$/);
  if (!match) return null;
  return {
    arbeitId: parseInt(match[1], 10),
    schuelerId: parseInt(match[2], 10),
    seitenNr: parseInt(match[3], 10),
  };
}

export async function generateQrSheet(
  arbeitId: number,
  students: Student[],
  pagesPerStudent: number
): Promise<string> {
  const sections: string[] = [];

  for (const student of students) {
    const qrCodes: string[] = [];
    for (let page = 1; page <= pagesPerStudent; page++) {
      const content = buildQrContent(arbeitId, student.id, page);
      const dataUrl = await generateQrCode(content);
      qrCodes.push(`
        <div class="qr-item">
          <img src="${dataUrl}" alt="QR Code Seite ${page}" />
          <p>Seite ${page}</p>
        </div>`);
    }

    sections.push(`
      <div class="student-section" style="page-break-after: always;">
        <h2>${student.vorname} ${student.nachname}</h2>
        <p>Arbeit ID: ${arbeitId} | Schüler ID: ${student.id}</p>
        <div class="qr-grid">
          ${qrCodes.join('')}
        </div>
      </div>`);
  }

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR-Code Bogen - Arbeit ${arbeitId}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .student-section { margin-bottom: 40px; }
    .qr-grid { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; }
    .qr-item { text-align: center; }
    .qr-item img { display: block; }
    .qr-item p { margin: 4px 0 0; font-size: 12px; }
    @media print {
      .student-section { page-break-after: always; }
    }
  </style>
</head>
<body>
  ${sections.join('')}
</body>
</html>`;
}
