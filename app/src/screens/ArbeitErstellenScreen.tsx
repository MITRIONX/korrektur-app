import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getKlassen, createArbeit } from '../services/api';
import { Klasse } from '../types';

const FAECHER = ['Mathe', 'Deutsch', 'Sachkunde', 'Englisch', 'Kunst', 'Musik'];

export function ArbeitErstellenScreen() {
  const router = useRouter();

  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [selectedKlasseId, setSelectedKlasseId] = useState<number | null>(null);
  const [selectedFach, setSelectedFach] = useState<string>('');
  const [titel, setTitel] = useState('');
  const [maxPunkte, setMaxPunkte] = useState('');
  const [musterloesung, setMusterloesung] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadKlassen();
  }, []);

  const loadKlassen = async () => {
    setLoading(true);
    try {
      const data = await getKlassen();
      setKlassen(data);
      if (data.length > 0) {
        setSelectedKlasseId(data[0].id);
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Klassen konnten nicht geladen werden.';
      Alert.alert('Fehler', message);
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    selectedKlasseId !== null &&
    selectedFach !== '' &&
    titel.trim() !== '' &&
    maxPunkte.trim() !== '' &&
    !isNaN(Number(maxPunkte)) &&
    Number(maxPunkte) > 0;

  const handleCreate = async () => {
    if (!isValid || selectedKlasseId === null) return;
    setCreating(true);
    try {
      await createArbeit({
        klasse_id: selectedKlasseId,
        fach: selectedFach,
        titel: titel.trim(),
        max_punkte: Number(maxPunkte),
        musterloesung: musterloesung.trim() || undefined,
        datum: new Date().toISOString().split('T')[0],
        status: 'entwurf',
      });
      Alert.alert('Erfolg', 'Arbeit wurde erfolgreich erstellt.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Arbeit konnte nicht erstellt werden.';
      Alert.alert('Fehler', message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Zurück</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Arbeit erstellen</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Klasse */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Klasse</Text>
          {loading ? (
            <ActivityIndicator color="#3b82f6" />
          ) : klassen.length === 0 ? (
            <Text style={styles.emptyText}>Keine Klassen vorhanden. Bitte zuerst eine Klasse anlegen.</Text>
          ) : (
            <View style={styles.chipRow}>
              {klassen.map((klasse) => {
                const selected = selectedKlasseId === klasse.id;
                return (
                  <Pressable
                    key={klasse.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setSelectedKlasseId(klasse.id)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {klasse.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* Fach */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fach</Text>
          <View style={styles.chipRow}>
            {FAECHER.map((fach) => {
              const selected = selectedFach === fach;
              return (
                <Pressable
                  key={fach}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => setSelectedFach(fach)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {fach}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Titel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Titel</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. Mathe-Test Kapitel 3"
            placeholderTextColor="#64748b"
            value={titel}
            onChangeText={setTitel}
          />
        </View>

        {/* Max Punkte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Maximale Punkte</Text>
          <TextInput
            style={styles.input}
            placeholder="z.B. 100"
            placeholderTextColor="#64748b"
            value={maxPunkte}
            onChangeText={setMaxPunkte}
            keyboardType="numeric"
          />
        </View>

        {/* Musterlösung */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Musterlösung <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Musterlösung eingeben..."
            placeholderTextColor="#64748b"
            value={musterloesung}
            onChangeText={setMusterloesung}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Create Button */}
        <Pressable
          style={[styles.createButton, (!isValid || creating) && styles.createButtonDisabled]}
          onPress={handleCreate}
          disabled={!isValid || creating}
        >
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Arbeit erstellen</Text>
          )}
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  backButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 15,
    fontWeight: '500',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  optional: {
    fontWeight: '400',
    textTransform: 'none',
    color: '#64748b',
    fontSize: 12,
    letterSpacing: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
  },
  chipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  chipText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#fff',
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f1f5f9',
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 120,
    paddingTop: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.4,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
