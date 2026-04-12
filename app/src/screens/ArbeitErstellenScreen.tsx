import { useEffect, useState, useRef } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { getKlassen, getSchueler, createArbeit, uploadArbeitPdf, generateArbeitPdfs, analysiereArbeit } from '../services/api';
import { useAuthStore } from '../store/auth';
import { Klasse, Schueler } from '../types';

const SCREEN_WIDTH = Dimensions.get('window').width;
const FAECHER = ['Mathe', 'Deutsch', 'Sachkunde', 'Englisch', 'Kunst', 'Musik'];

function getKlassenstufe(ej: string): string {
  const n = parseInt(ej, 10);
  if (isNaN(n)) return '?';
  const now = new Date();
  return (now.getMonth() + 1 >= 8 ? now.getFullYear() - n + 1 : now.getFullYear() - n).toString();
}

function getKlassenDisplay(k: Klasse): string {
  const name = `Klasse ${getKlassenstufe(k.schuljahr)}${k.name}`;
  return k.maskottchen ? `${name} (${k.maskottchen})` : name;
}

type Step = 'details' | 'analyse' | 'pdf_position' | 'schueler';

export function ArbeitErstellenScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('details');

  // Step 1: Details
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [selectedKlasseId, setSelectedKlasseId] = useState<number | null>(null);
  const [fach, setFach] = useState('');
  const [titel, setTitel] = useState('');
  const [maxPunkte, setMaxPunkte] = useState('');
  const [musterloesung, setMusterloesung] = useState('');
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [arbeitId, setArbeitId] = useState<number | null>(null);

  // Step Analyse
  const [analyse, setAnalyse] = useState<any>(null);
  const [analysing, setAnalysing] = useState(false);

  // Step QR Position
  const [qrX, setQrX] = useState(75); // percentage
  const [qrY, setQrY] = useState(5);  // percentage
  const previewWidth = SCREEN_WIDTH - 48;
  const previewHeight = previewWidth * 1.414; // A4 ratio

  // Step 3: Schueler selection
  const [schueler, setSchueler] = useState<Schueler[]>([]);
  const [selectedSchueler, setSelectedSchueler] = useState<Set<number>>(new Set());
  const [generating, setGenerating] = useState(false);

  // QR Drag
  const panRef = useRef({ x: (75 / 100) * previewWidth, y: (5 / 100) * previewHeight });
  const [qrPos, setQrPos] = useState({ x: panRef.current.x, y: panRef.current.y });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gesture) => {
        const newX = Math.max(0, Math.min(previewWidth - 60, panRef.current.x + gesture.dx));
        const newY = Math.max(0, Math.min(previewHeight - 70, panRef.current.y + gesture.dy));
        setQrPos({ x: newX, y: newY });
      },
      onPanResponderRelease: (_, gesture) => {
        panRef.current = {
          x: Math.max(0, Math.min(previewWidth - 60, panRef.current.x + gesture.dx)),
          y: Math.max(0, Math.min(previewHeight - 70, panRef.current.y + gesture.dy)),
        };
        setQrX(Math.round((panRef.current.x / previewWidth) * 100));
        setQrY(Math.round((panRef.current.y / previewHeight) * 100));
      },
    })
  ).current;

  useEffect(() => {
    getKlassen()
      .then(data => { setKlassen(data); if (data.length > 0) setSelectedKlasseId(data[0].id); })
      .catch(e => Alert.alert('Fehler', e?.response?.data?.error || e?.message))
      .finally(() => setLoading(false));
  }, []);

  const handlePickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.[0]) {
        setPdfUri(result.assets[0].uri);
        setPdfName(result.assets[0].name);
      }
    } catch { Alert.alert('Fehler', 'PDF konnte nicht ausgewaehlt werden.'); }
  };

  const handleStep1Next = async () => {
    if (!selectedKlasseId || !fach || !titel || !maxPunkte) {
      Alert.alert('Fehler', 'Bitte alle Pflichtfelder ausfuellen.');
      return;
    }
    setCreating(true);
    try {
      // Create arbeit
      const arbeit = await createArbeit({
        klasse_id: selectedKlasseId, fach, titel,
        max_punkte: parseInt(maxPunkte, 10),
        musterloesung: musterloesung.trim() || null,
        status: 'entwurf', datum: new Date().toISOString().split('T')[0],
      } as any);
      setArbeitId(arbeit.id);

      // Upload PDF if selected
      if (pdfUri && pdfName) {
        await uploadArbeitPdf(arbeit.id, pdfUri, pdfName);
        // Start analysis
        setStep('analyse');
        setAnalysing(true);
        try {
          const result = await analysiereArbeit(arbeit.id);
          setAnalyse(result);
        } catch (e: any) {
          Alert.alert('Hinweis', 'Automatische Analyse nicht moeglich. Du kannst trotzdem fortfahren.');
        } finally {
          setAnalysing(false);
        }
      } else {
        Alert.alert('Erstellt', 'Arbeit ohne PDF angelegt.', [{ text: 'OK', onPress: () => router.back() }]);
      }
    } catch (e: any) {
      Alert.alert('Fehler', e?.response?.data?.error || e?.message);
    } finally {
      setCreating(false);
    }
  };

  const handleStep2Next = async () => {
    if (!selectedKlasseId) return;
    // Load students
    try {
      const data = await getSchueler(selectedKlasseId);
      setSchueler(data);
      setSelectedSchueler(new Set(data.map(s => s.id))); // all selected by default
      setStep('schueler');
    } catch (e: any) {
      Alert.alert('Fehler', e?.response?.data?.error || e?.message);
    }
  };

  const toggleSchueler = (id: number) => {
    setSelectedSchueler(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!arbeitId || selectedSchueler.size === 0) return;
    setGenerating(true);
    try {
      const result = await generateArbeitPdfs(arbeitId, Array.from(selectedSchueler), qrX, qrY);
      Alert.alert(
        'PDFs generiert!',
        `${result.schueler_count} personalisierte Kopien erstellt. Du kannst sie jetzt in der Arbeit herunterladen und drucken.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (e: any) {
      Alert.alert('Fehler', e?.response?.data?.error || e?.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator color="#3b82f6" size="large" style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  // ===== STEP: Analyse =====
  if (step === 'analyse') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('details')}><Text style={styles.backText}>← Zurueck</Text></Pressable>
          <Text style={styles.headerTitle}>KI-Analyse</Text>
          <Text style={styles.stepText}>2/4</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          {analysing ? (
            <View style={{ alignItems: 'center', marginTop: 60, gap: 16 }}>
              <ActivityIndicator color="#3b82f6" size="large" />
              <Text style={{ color: '#94a3b8', fontSize: 15 }}>KI analysiert das Arbeitsblatt...</Text>
              <Text style={{ color: '#64748b', fontSize: 13 }}>Aufgaben und Loesungen werden erkannt</Text>
            </View>
          ) : analyse ? (
            <>
              <Text style={styles.hint}>{analyse.zusammenfassung}</Text>
              <View style={{ backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#10b981' }}>
                <Text style={{ color: '#10b981', fontSize: 14, fontWeight: '700' }}>
                  {analyse.aufgaben?.length || 0} Aufgaben erkannt · {analyse.empfohlene_max_punkte || 0} Punkte empfohlen
                </Text>
              </View>
              {analyse.aufgaben?.map((a: any, i: number) => (
                <View key={i} style={{ backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#334155' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: '#3b82f6', fontSize: 13, fontWeight: '700' }}>Aufgabe {a.nummer}</Text>
                    <Text style={{ color: '#f59e0b', fontSize: 12 }}>{a.max_punkte}P · {a.typ}</Text>
                  </View>
                  <Text style={{ color: '#f1f5f9', fontSize: 14, marginBottom: 6 }}>{a.beschreibung}</Text>
                  <Text style={{ color: '#10b981', fontSize: 12 }}>
                    Loesung: {typeof a.loesungen === 'string' ? a.loesungen : JSON.stringify(a.loesungen)}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ color: '#94a3b8', fontSize: 15 }}>Keine Analyse verfuegbar</Text>
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable style={styles.submitBtn} onPress={() => setStep('pdf_position')}>
            <Text style={styles.submitText}>Weiter → QR-Code platzieren</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===== STEP 3: Schueler auswaehlen =====
  if (step === 'schueler') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('pdf_position')}><Text style={styles.backText}>← Zurueck</Text></Pressable>
          <Text style={styles.headerTitle}>Schueler auswaehlen</Text>
          <Text style={styles.stepText}>4/4</Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.hint}>{selectedSchueler.size} von {schueler.length} ausgewaehlt</Text>
          <Pressable style={styles.selectAllBtn} onPress={() => {
            if (selectedSchueler.size === schueler.length) setSelectedSchueler(new Set());
            else setSelectedSchueler(new Set(schueler.map(s => s.id)));
          }}>
            <Text style={styles.selectAllText}>
              {selectedSchueler.size === schueler.length ? 'Keine auswaehlen' : 'Alle auswaehlen'}
            </Text>
          </Pressable>
          {schueler.map(s => (
            <Pressable key={s.id} style={styles.schuelerItem} onPress={() => toggleSchueler(s.id)}>
              <View style={[styles.checkbox, selectedSchueler.has(s.id) && styles.checkboxChecked]}>
                {selectedSchueler.has(s.id) && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.schuelerName}>{s.vorname} {s.nachname}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            style={[styles.submitBtn, (generating || selectedSchueler.size === 0) && styles.btnDisabled]}
            onPress={handleGenerate}
            disabled={generating || selectedSchueler.size === 0}>
            {generating ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.submitText}>
                {selectedSchueler.size} PDFs generieren & drucken
              </Text>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===== STEP 2: QR-Code positionieren =====
  if (step === 'pdf_position') {
    const token = useAuthStore.getState().token;
    const previewUrl = `http://46.225.218.211:3100/api/arbeiten/${arbeitId}/pdf-preview`;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => setStep('analyse')}><Text style={styles.backText}>← Zurueck</Text></Pressable>
          <Text style={styles.headerTitle}>QR-Code platzieren</Text>
          <Text style={styles.stepText}>3/4</Text>
        </View>
        <View style={{ flex: 1, padding: 12 }}>
          <Text style={styles.hint}>Ziehe den QR-Code an die gewuenschte Position</Text>

          {/* PDF preview as image with draggable QR overlay */}
          <View style={[styles.pdfPreview, { width: previewWidth, height: previewHeight }]}>
            <Image
              source={{ uri: previewUrl, headers: { Authorization: `Bearer ${token}` } }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />

            {/* Draggable QR Code overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <View
                {...panResponder.panHandlers}
                style={[styles.qrDraggable, { left: qrPos.x, top: qrPos.y }]}
              >
                <View style={styles.qrBox}>
                  <Text style={styles.qrIcon}>▪▪▪{'\n'}▪▪▪{'\n'}▪▪▪</Text>
                </View>
                <Text style={styles.qrName}>Max Mustermann</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.footer}>
          <Pressable style={styles.submitBtn} onPress={handleStep2Next}>
            <Text style={styles.submitText}>Weiter → Schueler auswaehlen</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // ===== STEP 1: Details =====
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}><Text style={styles.backText}>← Zurueck</Text></Pressable>
        <Text style={styles.headerTitle}>Arbeit erstellen</Text>
        <Text style={styles.stepText}>1/4</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 40 }}>
        <Text style={styles.label}>Klasse</Text>
        {klassen.length === 0 ? (
          <Text style={styles.hint}>Keine Klassen. Bitte zuerst eine anlegen.</Text>
        ) : (
          <View style={styles.chipRow}>
            {klassen.map(k => (
              <Pressable key={k.id} style={[styles.chip, selectedKlasseId === k.id && styles.chipActive]}
                onPress={() => setSelectedKlasseId(k.id)}>
                <Text style={[styles.chipText, selectedKlasseId === k.id && styles.chipTextActive]}>
                  {getKlassenDisplay(k)}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={styles.label}>Fach</Text>
        <View style={styles.chipRow}>
          {FAECHER.map(f => (
            <Pressable key={f} style={[styles.chip, fach === f && styles.chipActive]} onPress={() => setFach(f)}>
              <Text style={[styles.chipText, fach === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Titel</Text>
        <TextInput style={styles.input} placeholder="z.B. Mathe-Test Kapitel 3"
          placeholderTextColor="#64748b" value={titel} onChangeText={setTitel} />

        <Text style={styles.label}>Max. Punkte</Text>
        <TextInput style={styles.input} placeholder="z.B. 20"
          placeholderTextColor="#64748b" value={maxPunkte} onChangeText={setMaxPunkte} keyboardType="numeric" />

        <Text style={styles.label}>Arbeitsblatt (PDF)</Text>
        <Pressable style={styles.pdfButton} onPress={handlePickPdf}>
          <Text style={styles.pdfButtonIcon}>📄</Text>
          <Text style={styles.pdfButtonText}>{pdfName || 'PDF auswaehlen...'}</Text>
        </Pressable>
        {pdfUri && <Pressable onPress={() => { setPdfUri(null); setPdfName(null); }}><Text style={styles.pdfRemove}>✕ entfernen</Text></Pressable>}

        <Text style={styles.label}>Musterloesung (optional)</Text>
        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Aufgabe 1: 42 ..."
          placeholderTextColor="#64748b" value={musterloesung} onChangeText={setMusterloesung} multiline />
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.submitBtn, (creating || !selectedKlasseId || !fach || !titel || !maxPunkte) && styles.btnDisabled]}
          onPress={handleStep1Next}
          disabled={creating || !selectedKlasseId || !fach || !titel || !maxPunkte}>
          {creating ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.submitText}>{pdfUri ? 'Weiter → QR platzieren' : 'Arbeit erstellen'}</Text>
          )}
        </Pressable>
      </View>
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
  stepText: { color: '#64748b', fontSize: 13 },
  scroll: { flex: 1, padding: 20 },
  footer: { padding: 16, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155' },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 20, marginBottom: 8 },
  hint: { color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  chipText: { color: '#94a3b8', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: '#f1f5f9', fontSize: 16 },
  pdfButton: { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 10, borderStyle: 'dashed' },
  pdfButtonIcon: { fontSize: 22 },
  pdfButtonText: { color: '#94a3b8', fontSize: 15, flex: 1 },
  pdfRemove: { color: '#ef4444', fontSize: 13, marginTop: 6 },
  submitBtn: { backgroundColor: '#3b82f6', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Step 2: PDF Preview
  pdfPreview: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', position: 'relative', marginTop: 8 },
  pdfContent: { padding: 20 },
  pdfTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  pdfSubtitle: { fontSize: 12, color: '#64748b', marginBottom: 16 },
  pdfLine: { height: 10, backgroundColor: '#e2e8f0', borderRadius: 4, marginBottom: 8, width: '100%' },
  qrDraggable: { position: 'absolute', alignItems: 'center', width: 70 },
  qrBox: { width: 56, height: 56, backgroundColor: '#1e293b', borderRadius: 4, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#3b82f6' },
  qrIcon: { color: '#3b82f6', fontSize: 12, lineHeight: 14, textAlign: 'center' },
  qrName: { fontSize: 7, color: '#1e293b', marginTop: 2, textAlign: 'center' },
  positionInfo: { color: '#64748b', fontSize: 12, marginTop: 8 },
  // Step 3: Schueler
  selectAllBtn: { backgroundColor: '#1e293b', borderRadius: 8, padding: 10, alignItems: 'center', marginBottom: 12 },
  selectAllText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  schuelerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#334155', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  schuelerName: { color: '#f1f5f9', fontSize: 16 },
});
