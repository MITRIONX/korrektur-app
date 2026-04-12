-- Fix: CASCADE delete on arbeiten when klasse is deleted
ALTER TABLE arbeiten DROP CONSTRAINT IF EXISTS arbeiten_klasse_id_fkey;
ALTER TABLE arbeiten ADD CONSTRAINT arbeiten_klasse_id_fkey FOREIGN KEY (klasse_id) REFERENCES klassen(id) ON DELETE CASCADE;
