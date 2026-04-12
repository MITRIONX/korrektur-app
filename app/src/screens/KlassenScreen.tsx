import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { getKlassen, createKlasse, getSchueler, createSchueler } from '../services/api';
import { Klasse, Schueler } from '../types';

type View = 'klassen' | 'schueler';

export function KlassenScreen() {
  const router = useRouter();

  const [view, setView] = useState<View>('klassen');
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<Klasse | null>(null);
  const [schueler, setSchueler] = useState<Schueler[]>([]);
  const [loading, setLoading] = useState(false);

  // Klasse creation
  const [neueKlasseName, setNeueKlasseName] = useState('');
  const [klasseCreating, setKlasseCreating] = useState(false);

  // Schueler creation
  const [neuerVorname, setNeuerVorname] = useState('');
  const [neuerNachname, setNeuerNachname] = useState('');
  const [schuelerCreating, setSchuelerCreating] = useState(false);

  useEffect(() => {
    loadKlassen();
  }, []);

  const loadKlassen = async () => {
    setLoading(true);
    try {
      const data = await getKlassen();
      setKlassen(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Klassen konnten nicht geladen werden.';
      Alert.alert('Fehler', message);
    } finally {
      setLoading(false);
    }
  };

  const loadSchueler = async (klasse: Klasse) => {
    setLoading(true);
    setSelectedKlasse(klasse);
    setView('schueler');
    try {
      const data = await getSchueler(klasse.id);
      setSchueler(data);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Schüler konnten nicht geladen werden.';
      Alert.alert('Fehler', message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKlasse = async () => {
    const name = neueKlasseName.trim();
    if (!name) {
      Alert.alert('Fehler', 'Bitte einen Klassennamen eingeben.');
      return;
    }
    setKlasseCreating(true);
    try {
      const neu = await createKlasse({ name, schuljahr: '2025/2026' });
      setKlassen((prev) => [...prev, neu]);
      setNeueKlasseName('');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Klasse konnte nicht erstellt werden.';
      Alert.alert('Fehler', message);
    } finally {
      setKlasseCreating(false);
    }
  };

  const handleCreateSchueler = async () => {
    const vorname = neuerVorname.trim();
    const nachname = neuerNachname.trim();
    if (!vorname || !nachname) {
      Alert.alert('Fehler', 'Bitte Vor- und Nachname eingeben.');
      return;
    }
    if (!selectedKlasse) return;
    setSchuelerCreating(true);
    try {
      const neu = await createSchueler(selectedKlasse.id, { vorname, nachname });
      setSchueler((prev) => [...prev, neu]);
      setNeuerVorname('');
      setNeuerNachname('');
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Schüler konnte nicht erstellt werden.';
      Alert.alert('Fehler', message);
    } finally {
      setSchuelerCreating(false);
    }
  };

  const handleBackFromSchueler = () => {
    setView('klassen');
    setSelectedKlasse(null);
    setSchueler([]);
    setNeuerVorname('');
    setNeuerNachname('');
  };

  if (view === 'schueler' && selectedKlasse) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={handleBackFromSchueler}>
            <Text style={styles.backButtonText}>← Klassen</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{selectedKlasse.name}</Text>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Add Schueler Form */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Neuen Schüler hinzufügen</Text>
            <TextInput
              style={styles.input}
              placeholder="Vorname"
              placeholderTextColor="#64748b"
              value={neuerVorname}
              onChangeText={setNeuerVorname}
            />
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder="Nachname"
              placeholderTextColor="#64748b"
              value={neuerNachname}
              onChangeText={setNeuerNachname}
            />
            <Pressable
              style={[styles.button, (schuelerCreating || !neuerVorname.trim() || !neuerNachname.trim()) && styles.buttonDisabled]}
              onPress={handleCreateSchueler}
              disabled={schuelerCreating || !neuerVorname.trim() || !neuerNachname.trim()}
            >
              {schuelerCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Schüler hinzufügen</Text>
              )}
            </Pressable>
          </View>

          {/* Schueler List */}
          {loading ? (
            <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 32 }} />
          ) : (
            <FlatList
              data={schueler}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.listContent}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Noch keine Schüler in dieser Klasse.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <Text style={styles.listItemText}>
                    {item.nachname}, {item.vorname}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      </View>
    );
  }

  // Klassen view
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Zurück</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Klassen</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        {/* Add Klasse Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Neue Klasse hinzufügen</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.inputFlex]}
              placeholder="z.B. 3a"
              placeholderTextColor="#64748b"
              value={neueKlasseName}
              onChangeText={setNeueKlasseName}
            />
            <Pressable
              style={[styles.button, styles.buttonInline, (klasseCreating || !neueKlasseName.trim()) && styles.buttonDisabled]}
              onPress={handleCreateKlasse}
              disabled={klasseCreating || !neueKlasseName.trim()}
            >
              {klasseCreating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonText}>Hinzufügen</Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* Klassen List */}
        {loading ? (
          <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 32 }} />
        ) : (
          <FlatList
            data={klassen}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Noch keine Klassen vorhanden.</Text>
            }
            renderItem={({ item }) => (
              <Pressable style={styles.listItem} onPress={() => loadSchueler(item)}>
                <View>
                  <Text style={styles.listItemText}>{item.name}</Text>
                  <Text style={styles.listItemSubtext}>{item.schuljahr}</Text>
                </View>
                <Text style={styles.chevron}>›</Text>
              </Pressable>
            )}
          />
        )}
      </View>
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
  closeButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  closeButtonText: {
    color: '#94a3b8',
    fontSize: 18,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f1f5f9',
    fontSize: 15,
  },
  inputFlex: {
    flex: 1,
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  buttonInline: {
    marginTop: 0,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  listItem: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listItemText: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '500',
  },
  listItemSubtext: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 2,
  },
  chevron: {
    color: '#64748b',
    fontSize: 22,
    fontWeight: '300',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 32,
  },
});
