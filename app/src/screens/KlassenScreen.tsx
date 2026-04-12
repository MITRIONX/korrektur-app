import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  getKlassen, createKlasse, updateKlasse, deleteKlasse,
  getSchueler, createSchueler, updateSchueler, schuelerAustreten,
} from '../services/api';
import { Klasse, Schueler } from '../types';

type ScreenView = 'klassen' | 'schueler';

function getKlassenstufe(einschulungsjahr: string): string {
  const ej = parseInt(einschulungsjahr, 10);
  if (isNaN(ej)) return '?';
  const now = new Date();
  const stufe = now.getMonth() + 1 >= 8
    ? now.getFullYear() - ej + 1
    : now.getFullYear() - ej;
  return stufe > 0 ? stufe.toString() : '?';
}

function getKlassenName(k: Klasse): string {
  return `Klasse ${getKlassenstufe(k.schuljahr)}${k.name}`;
}

function getKlassenDisplay(k: Klasse): string {
  const name = getKlassenName(k);
  return k.maskottchen ? `${name} (${k.maskottchen})` : name;
}

export function KlassenScreen() {
  const router = useRouter();
  const [view, setView] = useState<ScreenView>('klassen');
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [selectedKlasse, setSelectedKlasse] = useState<Klasse | null>(null);
  const [schueler, setSchueler] = useState<Schueler[]>([]);
  const [loading, setLoading] = useState(false);

  // Create klasse
  const [einschulungsjahr, setEinschulungsjahr] = useState('');
  const [suffix, setSuffix] = useState('');
  const [maskottchen, setMaskottchen] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit modal
  const [editModal, setEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editJahr, setEditJahr] = useState('');
  const [editMaskottchen, setEditMaskottchen] = useState('');
  const [editingKlasse, setEditingKlasse] = useState<Klasse | null>(null);

  // Create schueler
  const [neuerVorname, setNeuerVorname] = useState('');
  const [neuerNachname, setNeuerNachname] = useState('');

  useEffect(() => { loadKlassen(); }, []);

  const loadKlassen = async () => {
    setLoading(true);
    try { setKlassen(await getKlassen()); }
    catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
    finally { setLoading(false); }
  };

  const loadSchueler = async (klasse: Klasse) => {
    setSelectedKlasse(klasse);
    setView('schueler');
    setLoading(true);
    try { setSchueler(await getSchueler(klasse.id)); }
    catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
    finally { setLoading(false); }
  };

  const handleCreateKlasse = async () => {
    const ej = einschulungsjahr.trim();
    const s = suffix.trim().toLowerCase();
    if (!ej || isNaN(parseInt(ej, 10)) || !s) {
      Alert.alert('Fehler', 'Einschulungsjahr und Bezeichnung sind Pflicht.');
      return;
    }
    setCreating(true);
    try {
      const neu = await createKlasse({ name: s, schuljahr: ej, maskottchen: maskottchen.trim() || undefined });
      setKlassen(prev => [...prev, neu]);
      setEinschulungsjahr(''); setSuffix(''); setMaskottchen('');
    } catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
    finally { setCreating(false); }
  };

  const openEditKlasse = (k: Klasse) => {
    setEditingKlasse(k);
    setEditName(k.name);
    setEditJahr(k.schuljahr);
    setEditMaskottchen(k.maskottchen || '');
    setEditModal(true);
  };

  const handleSaveKlasse = async () => {
    if (!editingKlasse) return;
    try {
      const updated = await updateKlasse(editingKlasse.id, {
        name: editName.trim(),
        schuljahr: editJahr.trim(),
        maskottchen: editMaskottchen.trim() || undefined,
      });
      setKlassen(prev => prev.map(k => k.id === updated.id ? updated : k));
      setEditModal(false);
    } catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
  };

  const handleDeleteKlasse = (k: Klasse) => {
    Alert.alert(
      'Klasse loeschen?',
      `${getKlassenDisplay(k)} wirklich loeschen? Alle Schueler und Arbeiten gehen verloren!`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Loeschen', style: 'destructive',
          onPress: async () => {
            try {
              await deleteKlasse(k.id);
              setKlassen(prev => prev.filter(x => x.id !== k.id));
            } catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
          }
        },
      ]
    );
  };

  const handleCreateSchueler = async () => {
    if (!selectedKlasse || !neuerVorname.trim() || !neuerNachname.trim()) return;
    try {
      const neu = await createSchueler(selectedKlasse.id, { vorname: neuerVorname.trim(), nachname: neuerNachname.trim() });
      setSchueler(prev => [...prev, neu]);
      setNeuerVorname(''); setNeuerNachname('');
    } catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
  };

  const handleAustreten = (s: Schueler) => {
    if (!selectedKlasse) return;
    Alert.alert(
      'Schueler austragen?',
      `${s.vorname} ${s.nachname} als ausgetreten markieren? Daten bleiben erhalten.`,
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Austragen',
          onPress: async () => {
            try {
              await schuelerAustreten(selectedKlasse.id, s.id);
              setSchueler(prev => prev.filter(x => x.id !== s.id));
            } catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
          }
        },
      ]
    );
  };

  // ===== SCHUELER VIEW =====
  if (view === 'schueler' && selectedKlasse) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => { setView('klassen'); setSelectedKlasse(null); }}>
            <Text style={styles.backText}>← Klassen</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{getKlassenDisplay(selectedKlasse)}</Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Schueler hinzufuegen</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Vorname" placeholderTextColor="#64748b"
                value={neuerVorname} onChangeText={setNeuerVorname} />
              <TextInput style={[styles.input, { flex: 1 }]} placeholder="Nachname" placeholderTextColor="#64748b"
                value={neuerNachname} onChangeText={setNeuerNachname} />
            </View>
            <Pressable
              style={[styles.btn, (!neuerVorname.trim() || !neuerNachname.trim()) && styles.btnDisabled]}
              onPress={handleCreateSchueler}
              disabled={!neuerVorname.trim() || !neuerNachname.trim()}>
              <Text style={styles.btnText}>Hinzufuegen</Text>
            </Pressable>
          </View>

          {loading ? <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 32 }} /> : (
            <FlatList
              data={schueler}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
              ListEmptyComponent={<Text style={styles.emptyText}>Noch keine Schueler.</Text>}
              renderItem={({ item }) => (
                <View style={styles.listItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.listItemText}>{item.nachname}, {item.vorname}</Text>
                    {item.aktiv === false && <Text style={{ color: '#ef4444', fontSize: 11 }}>Ausgetreten</Text>}
                  </View>
                  <Pressable onPress={() => handleAustreten(item)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>Austragen</Text>
                  </Pressable>
                </View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ===== KLASSEN VIEW =====
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Zurueck</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Klassen</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Neue Klasse</Text>
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 2 }]} placeholder="Einschulung (z.B. 2023)"
              placeholderTextColor="#64748b" value={einschulungsjahr} onChangeText={setEinschulungsjahr}
              keyboardType="numeric" maxLength={4} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="z.B. b"
              placeholderTextColor="#64748b" value={suffix} onChangeText={setSuffix}
              maxLength={3} autoCapitalize="none" />
          </View>
          <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Maskottchen (z.B. Fuchs)"
            placeholderTextColor="#64748b" value={maskottchen} onChangeText={setMaskottchen} />
          {einschulungsjahr.length === 4 && suffix.trim() && (
            <Text style={styles.previewText}>
              → Klasse {getKlassenstufe(einschulungsjahr)}{suffix.trim().toLowerCase()}
              {maskottchen.trim() ? ` (${maskottchen.trim()})` : ''}
            </Text>
          )}
          <Pressable
            style={[styles.btn, (creating || !einschulungsjahr.trim() || !suffix.trim()) && styles.btnDisabled]}
            onPress={handleCreateKlasse}
            disabled={creating || !einschulungsjahr.trim() || !suffix.trim()}>
            {creating ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.btnText}>Klasse erstellen</Text>}
          </Pressable>
        </View>

        {loading ? <ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 32 }} /> : (
          <FlatList
            data={klassen}
            keyExtractor={i => String(i.id)}
            contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
            ListEmptyComponent={<Text style={styles.emptyText}>Noch keine Klassen.</Text>}
            renderItem={({ item }) => (
              <Pressable style={styles.listItem} onPress={() => loadSchueler(item)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.listItemText}>{getKlassenDisplay(item)}</Text>
                  <Text style={styles.listItemSub}>Einschulung {item.schuljahr}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable onPress={() => openEditKlasse(item)} style={styles.actionBtn}>
                    <Text style={styles.actionBtnText}>✏️</Text>
                  </Pressable>
                  <Pressable onPress={() => handleDeleteKlasse(item)} style={[styles.actionBtn, { borderColor: '#ef4444' }]}>
                    <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>🗑️</Text>
                  </Pressable>
                </View>
              </Pressable>
            )}
          />
        )}
      </View>

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Klasse bearbeiten</Text>
            <TextInput style={styles.input} placeholder="Bezeichnung (z.B. b)" placeholderTextColor="#64748b"
              value={editName} onChangeText={setEditName} />
            <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Einschulungsjahr"
              placeholderTextColor="#64748b" value={editJahr} onChangeText={setEditJahr} keyboardType="numeric" />
            <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Maskottchen"
              placeholderTextColor="#64748b" value={editMaskottchen} onChangeText={setEditMaskottchen} />
            <View style={[styles.row, { marginTop: 16 }]}>
              <Pressable style={[styles.btn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => setEditModal(false)}>
                <Text style={styles.btnText}>Abbrechen</Text>
              </Pressable>
              <Pressable style={[styles.btn, { flex: 1 }]} onPress={handleSaveKlasse}>
                <Text style={styles.btnText}>Speichern</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9' },
  backText: { color: '#3b82f6', fontSize: 15 },
  closeText: { color: '#94a3b8', fontSize: 18 },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 8 },
  input: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, color: '#f1f5f9', fontSize: 15 },
  previewText: { color: '#10b981', fontSize: 14, fontWeight: '600', marginTop: 10 },
  btn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  listItem: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  listItemText: { color: '#f1f5f9', fontSize: 16, fontWeight: '500' },
  listItemSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  actionBtn: { borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  actionBtnText: { fontSize: 14 },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center', marginTop: 32 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 24 },
  modalTitle: { color: '#f1f5f9', fontSize: 18, fontWeight: '700', marginBottom: 16 },
});
