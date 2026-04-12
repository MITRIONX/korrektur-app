-- 001_initial.sql
-- Initial schema for Korrektur-App

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS klassen (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id),
  name        TEXT NOT NULL,
  schuljahr   TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schueler (
  id          SERIAL PRIMARY KEY,
  klasse_id   INTEGER NOT NULL REFERENCES klassen(id) ON DELETE CASCADE,
  vorname     TEXT NOT NULL,
  nachname    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS arbeiten (
  id               SERIAL PRIMARY KEY,
  klasse_id        INTEGER NOT NULL REFERENCES klassen(id),
  fach             TEXT NOT NULL,
  titel            TEXT NOT NULL,
  datum            DATE NOT NULL,
  max_punkte       NUMERIC NOT NULL,
  musterloesung    TEXT,
  notenschluessel  JSONB,
  status           TEXT NOT NULL DEFAULT 'entwurf'
                     CHECK (status IN ('entwurf','scannen','korrigieren','pruefen','fertig')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_seiten (
  id          SERIAL PRIMARY KEY,
  arbeit_id   INTEGER NOT NULL REFERENCES arbeiten(id) ON DELETE CASCADE,
  schueler_id INTEGER NOT NULL REFERENCES schueler(id),
  seiten_nr   INTEGER NOT NULL,
  bild_pfad   TEXT NOT NULL,
  qr_code     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arbeit_id, schueler_id, seiten_nr)
);

CREATE TABLE IF NOT EXISTS korrekturen (
  id             SERIAL PRIMARY KEY,
  scan_seite_id  INTEGER NOT NULL UNIQUE REFERENCES scan_seiten(id) ON DELETE CASCADE,
  punkte         NUMERIC NOT NULL DEFAULT 0,
  max_punkte     NUMERIC NOT NULL DEFAULT 0,
  annotationen   JSONB NOT NULL DEFAULT '[]',
  feedback       TEXT,
  status         TEXT NOT NULL CHECK (status IN ('ausstehend','ki_korrigiert','manuell_angepasst','bestaetigt')),
  ki_rohdaten    JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ergebnisse (
  id              SERIAL PRIMARY KEY,
  arbeit_id       INTEGER NOT NULL REFERENCES arbeiten(id) ON DELETE CASCADE,
  schueler_id     INTEGER NOT NULL REFERENCES schueler(id),
  gesamt_punkte   NUMERIC NOT NULL DEFAULT 0,
  max_punkte      NUMERIC NOT NULL DEFAULT 0,
  note            TEXT,
  share_token     TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (arbeit_id, schueler_id)
);
