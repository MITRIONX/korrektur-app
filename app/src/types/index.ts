export interface User {
  id: number;
  email: string;
  name: string;
}

export interface Klasse {
  id: number;
  name: string;
  schuljahr: string;
  maskottchen?: string | null;
}

export interface Schueler {
  id: number;
  klasse_id: number;
  vorname: string;
  nachname: string;
}

export interface Arbeit {
  id: number;
  klasse_id: number;
  fach: string;
  titel: string;
  datum: string;
  max_punkte: number;
  musterloesung?: string;
  notenschluessel?: Record<string, number>;
  status: 'entwurf' | 'scannen' | 'korrigieren' | 'pruefen' | 'fertig';
}

export interface ScanSeite {
  id: number;
  arbeit_id: number;
  schueler_id?: number;
  seiten_nr: number;
  bild_pfad: string;
  vorname?: string;
  nachname?: string;
}

export interface KorrekturAufgabe {
  nummer: string;
  erkannter_text: string;
  bewertung: string;
  punkte: number;
  max_punkte: number;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  feedback?: string;
}

export interface Korrektur {
  id: number;
  scan_seite_id: number;
  punkte: number;
  max_punkte: number;
  annotationen: KorrekturAufgabe[];
  feedback?: string;
  status: string;
}

export interface Ergebnis {
  id: number;
  arbeit_id: number;
  schueler_id: number;
  gesamt_punkte: number;
  max_punkte: number;
  note: number;
  share_token: string;
  vorname: string;
  nachname: string;
}
