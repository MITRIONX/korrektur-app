# Korrektur-App - Design Spec

## Zweck

Android-App fuer Grundschullehrerinnen, mit der Klassenarbeiten fotografiert/gescannt und per KI (GPT-4o Vision) automatisch korrigiert werden. Fehler werden direkt im Bild annotiert, Punkte vergeben, Ergebnisse per QR-Code an Eltern teilbar.

## Zielgruppe

Grundschullehrerinnen, die gemischte Faecher unterrichten (Mathe, Deutsch, Sachkunde etc.). Die App muss einfach und schnell bedienbar sein - kein Tech-Hintergrund vorausgesetzt.

## Tech-Stack

| Komponente | Technologie |
|-----------|-------------|
| Mobile App | React Native / Expo (Android, spaeter iOS) |
| Backend API | Node.js / TypeScript |
| Server | syntrokids.de (46.225.218.211, Hetzner) |
| Datenbank | PostgreSQL |
| KI | OpenAI GPT-4o Vision API |
| QR-Codes | Generierung (Backend) + Erkennung (App) |

## Kern-Workflow

1. **Arbeit erstellen** - Fach, Klasse, Titel, max. Punkte, optional Musterloesung eingeben
2. **QR-Codes drucken** - Pro Schueler werden QR-Codes generiert und auf die Arbeitsblaetter gedruckt/geklebt. Jede Seite bekommt einen QR-Code der Arbeit-ID, Schueler-ID und Seiten-Nummer codiert
3. **Schueler schreiben** - Ganz normal auf Papier
4. **Stapel scannen** - Alle Blaetter durchfotografieren. App erkennt QR-Code automatisch und ordnet Seiten den Schuelern zu
5. **KI korrigiert** - GPT-4o erkennt Handschrift, prueft Antworten, vergibt Punkte, markiert Fehler
6. **Lehrerin prueft** - Sieht annotierte Bilder, kann Korrekturen und Punkte manuell anpassen
7. **Teilen** - Korrigierte Arbeiten ausdrucken, QR-Code fuer Eltern-Webansicht, PDF-Download

## App-Screens

### 1. Dashboard / Home

- Begruessung mit aktiver Klasse
- Schnellzugriff-Buttons: Scannen, Neue Arbeit, Klassen verwalten
- Liste der letzten Arbeiten mit Status-Badges (Scannen / Pruefen / Fertig)
- Fortschrittsanzeige (z.B. 18/24 gescannt)
- Bottom-Navigation: Home, Ergebnisse, Einstellungen

### 2. Klassen- und Schueler-Verwaltung

- Klassen anlegen (Name, Schuljahr)
- Schueler pro Klasse verwalten (Vorname, Nachname)
- Klasse wechseln vom Dashboard aus

### 3. Arbeit erstellen

- Formular: Fach, Titel, Datum, Klasse, maximale Punktzahl
- Optional: Musterloesung eingeben (Text oder Foto)
- Optional: Notenschluessel definieren (Punkte-zu-Noten-Mapping)
- QR-Code-Boegen generieren und drucken (ein Bogen pro Schueler mit QR-Codes fuer jede Seite)

### 4. Scanner-Ansicht

- Kamera mit Scan-Rahmen und Eck-Markierungen
- Automatische QR-Code-Erkennung in Echtzeit
- Gruenes Banner zeigt erkannten Schueler-Namen und Seitennummer
- Seiten-Zaehler (z.B. "12 von 48 Seiten gescannt")
- Auto-Modus: fotografiert automatisch wenn Blatt stabil erkannt wird
- Blitz-Toggle
- Galerie-Zugriff fuer bereits vorhandene Fotos

### 5. Korrektur-Ansicht (Kernstueck)

- Original-Scan als Hintergrund
- KI-Annotationen als Overlay:
  - Gruen mit Haekchen fuer richtige Antworten
  - Rot mit Kreuz fuer falsche Antworten + richtige Loesung daneben
  - Punkteangabe pro Aufgabe (z.B. "2/2 P")
- Gesamt-Punktestand oben (z.B. "8/10")
- Bearbeiten-Modus: Punkte manuell anpassen, Annotationen aendern
- Bestaetigen-Button: Korrektur abschliessen
- Swipe zwischen Seiten eines Schuelers
- Links/Rechts-Navigation zwischen Schuelern

### 6. Ergebnis-Uebersicht

- Statistiken: Durchschnittspunkte, Notenschnitt, Bestanden-Quote
- Farbcodierte Schueler-Rangliste (Gruen bis Rot)
- Aktionen:
  - Drucken: alle korrigierten Arbeiten ausdrucken
  - QR-Codes: Blatt mit QR-Codes pro Schueler generieren (Eltern scannen fuer Web-Ansicht)
  - Export: CSV/Excel fuer Notenbuch

## QR-Code-System

### Arbeitsblatt-QR-Codes

Codierter Inhalt pro QR-Code:
```
korrektur://arbeit/{arbeit_id}/schueler/{schueler_id}/seite/{seiten_nr}
```

- Werden vom Backend generiert
- Als druckbarer Bogen (ein Bogen pro Schueler, Aufkleber oder direkt auf Arbeitsblaetter drucken)
- App erkennt diese QR-Codes beim Scannen und ordnet automatisch zu

### Ergebnis-QR-Codes

Codierter Inhalt:
```
https://syntrokids.de/ergebnis/{share_token}
```

- Einmaliger, nicht erratbarer Token pro Schueler/Arbeit
- Eltern scannen den QR-Code und sehen:
  - Punkte und Note
  - Annotiertes Bild der korrigierten Arbeit
  - PDF-Download-Option
- Kein Login erforderlich, Token-basierter Zugriff

## KI-Korrektur (GPT-4o Vision)

### Ablauf

1. Scan-Bild wird an Backend geschickt
2. Backend sendet Bild + Prompt an GPT-4o Vision API
3. Prompt enthaelt:
   - Fach und Aufgabentyp
   - Falls vorhanden: Musterloesung
   - Anweisung: Handschrift erkennen, Aufgaben identifizieren, Antworten bewerten
4. GPT-4o liefert strukturierte Antwort (JSON):
   - Erkannter Text pro Aufgabe
   - Bewertung (richtig/falsch/teilweise)
   - Punkte pro Aufgabe
   - Position der Aufgabe im Bild (Bounding-Box-Koordinaten fuer Annotationen)
   - Feedback-Text bei Fehlern
5. Backend speichert Korrektur-Daten
6. App zeigt Annotationen als Overlay ueber dem Original-Scan

### Prompt-Strategie

- Grundschul-Kontext: einfache, klare Bewertungskriterien
- Mathe: Rechenwege beruecksichtigen, nicht nur Endergebnis
- Deutsch: Rechtschreibung, Grammatik, bei Aufsaetzen auch Inhalt und Ausdruck
- Sachkunde: Faktenwissen pruefen
- Bei Musterloesung: expliziter Vergleich
- Ohne Musterloesung: KI bewertet eigenstaendig (Grundschul-Niveau)

### Rueckgabe-Format (GPT-4o)

```json
{
  "aufgaben": [
    {
      "nummer": 1,
      "erkannter_text": "7 x 8 = 56",
      "bewertung": "richtig",
      "punkte": 2,
      "max_punkte": 2,
      "position": { "x": 50, "y": 120, "w": 200, "h": 30 },
      "feedback": null
    },
    {
      "nummer": 2,
      "erkannter_text": "9 x 6 = 52",
      "bewertung": "falsch",
      "punkte": 0,
      "max_punkte": 2,
      "position": { "x": 50, "y": 160, "w": 200, "h": 30 },
      "feedback": "Richtige Antwort: 54"
    }
  ],
  "gesamt_punkte": 8,
  "max_punkte": 10
}
```

## Datenmodell

### Tabellen

**klassen**
- id (PK)
- name (z.B. "3b")
- schuljahr (z.B. "2025/2026")
- created_at, updated_at

**schueler**
- id (PK)
- klasse_id (FK -> klassen)
- vorname
- nachname
- created_at, updated_at

**arbeiten**
- id (PK)
- klasse_id (FK -> klassen)
- fach (z.B. "Mathe", "Deutsch", "Sachkunde")
- titel (z.B. "Einmaleins")
- datum
- max_punkte
- musterloesung (TEXT, nullable - JSON oder Freitext)
- notenschluessel (JSONB, nullable - Punkte-zu-Noten-Mapping)
- status (ENUM: entwurf, scannen, korrigieren, pruefen, fertig)
- created_at, updated_at

**scan_seiten**
- id (PK)
- arbeit_id (FK -> arbeiten)
- schueler_id (FK -> schueler)
- seiten_nr (INTEGER)
- bild_pfad (TEXT - Pfad zum gespeicherten Scan-Bild)
- qr_code (TEXT - codierter QR-Inhalt)
- created_at

**korrekturen**
- id (PK)
- scan_seite_id (FK -> scan_seiten, UNIQUE)
- punkte (INTEGER)
- max_punkte (INTEGER)
- annotationen (JSONB - Array von Aufgaben-Bewertungen mit Positionen)
- feedback (TEXT, nullable - allgemeines Feedback)
- status (ENUM: ausstehend, ki_korrigiert, manuell_angepasst, bestaetigt)
- ki_rohdaten (JSONB - originale GPT-Antwort)
- created_at, updated_at

**ergebnisse**
- id (PK)
- arbeit_id (FK -> arbeiten)
- schueler_id (FK -> schueler)
- gesamt_punkte (INTEGER)
- max_punkte (INTEGER)
- note (TEXT, nullable)
- share_token (TEXT, UNIQUE - fuer QR-Code Eltern-Link)
- created_at, updated_at

## Backend API (syntrokids.de)

### Endpunkte

**Klassen & Schueler**
- `GET /api/klassen` - alle Klassen
- `POST /api/klassen` - Klasse anlegen
- `GET /api/klassen/:id/schueler` - Schueler einer Klasse
- `POST /api/klassen/:id/schueler` - Schueler hinzufuegen

**Arbeiten**
- `GET /api/arbeiten` - alle Arbeiten (mit Filter nach Klasse)
- `POST /api/arbeiten` - Arbeit erstellen
- `GET /api/arbeiten/:id` - Arbeit-Details
- `PUT /api/arbeiten/:id` - Arbeit aktualisieren

**QR-Codes**
- `GET /api/arbeiten/:id/qr-codes` - QR-Code-Bogen als PDF generieren

**Scans**
- `POST /api/arbeiten/:id/scans` - Scan-Bild hochladen (Multipart)
- `GET /api/arbeiten/:id/scans` - alle Scans einer Arbeit

**Korrekturen**
- `POST /api/scans/:id/korrigieren` - KI-Korrektur ausloesen
- `GET /api/scans/:id/korrektur` - Korrektur-Ergebnis abrufen
- `PUT /api/korrekturen/:id` - Korrektur manuell anpassen
- `PUT /api/korrekturen/:id/bestaetigen` - Korrektur bestaetigen

**Ergebnisse**
- `GET /api/arbeiten/:id/ergebnisse` - Ergebnis-Uebersicht
- `GET /api/arbeiten/:id/ergebnisse/pdf` - PDF mit allen korrigierten Arbeiten
- `GET /api/arbeiten/:id/ergebnisse/export` - CSV/Excel Export
- `GET /api/arbeiten/:id/ergebnisse/qr-codes` - QR-Code-Bogen fuer Eltern

**Eltern-Zugriff (oeffentlich, kein Auth)**
- `GET /api/ergebnis/:share_token` - Ergebnis-Daten fuer Eltern-Webansicht
- `GET /api/ergebnis/:share_token/pdf` - PDF-Download

**Eltern-Webansicht**
- `GET /ergebnis/:share_token` - Server-side rendered HTML-Seite mit Ergebnis

## Authentifizierung

Einfach gehalten fuer den Start:
- App-seitig: E-Mail + Passwort Login
- JWT-Token fuer API-Zugriff
- Eltern-Links: Token-basiert, kein Login noetig

## Datei-Speicherung

Scan-Bilder werden auf dem SyntroKids-Server im Dateisystem gespeichert:
```
/data/korrektur-app/scans/{arbeit_id}/{schueler_id}/seite_{nr}.jpg
```

Annotierte Bilder (mit Korrekturen gerendert) werden on-demand generiert oder gecacht:
```
/data/korrektur-app/annotiert/{korrektur_id}.jpg
```

## Projektstruktur

```
korrektur-app/
├── app/                    # React Native / Expo App
│   ├── src/
│   │   ├── screens/        # Dashboard, Scanner, Korrektur, Ergebnisse, Einstellungen
│   │   ├── components/     # Wiederverwendbare UI-Komponenten
│   │   ├── services/       # API-Client, QR-Scanner, Bild-Verarbeitung
│   │   ├── store/          # State Management
│   │   └── utils/          # Hilfsfunktionen
│   ├── app.json
│   └── package.json
├── backend/                # Node.js / TypeScript Backend
│   ├── src/
│   │   ├── routes/         # Express/Fastify Routes
│   │   ├── services/       # Geschaeftslogik, OpenAI-Service, QR-Service, PDF-Service
│   │   ├── models/         # Datenbank-Modelle
│   │   ├── middleware/     # Auth, Error-Handling
│   │   └── views/          # Eltern-Webansicht Templates
│   ├── migrations/         # Datenbank-Migrationen
│   └── package.json
└── docs/
    └── superpowers/
        └── specs/
```

## Nicht im Scope (v1)

- iOS-Version (kommt spaeter durch Expo)
- Offline-Modus (erfordert lokale KI oder Caching-Strategie)
- Mehrere Lehrerinnen / Multi-User
- Eltern-App (nur Web-Link)
- Automatische Notenvergabe nach Bundesland-Schluessel
- Sprach-Feedback fuer Schueler
