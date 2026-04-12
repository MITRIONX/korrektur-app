import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getArbeit, getScans, triggerKorrektur, deleteArbeit, downloadArbeitPdf } from '../../src/services/api';
import type { Arbeit, ScanSeite } from '../../src/types';

export default function ArbeitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [arbeit, setArbeit] = useState<Arbeit | null>(null);
  const [scans, setScans] = useState<ScanSeite[]>([]);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [arbeitData, scansData] = await Promise.all([
        getArbeit(parseInt(id!, 10)),
        getScans(parseInt(id!, 10)),
      ]);
      setArbeit(arbeitData);
      setScans(scansData);
    } catch (err: any) {
      Alert.alert('Fehler', err?.response?.data?.error || err?.message || 'Konnte Arbeit nicht laden');
    } finally {
      setLoading(false);
    }
  };

  const handleKorrigieren = async () => {
    if (scans.length === 0) {
      Alert.alert('Keine Scans', 'Bitte zuerst Arbeiten scannen.');
      return;
    }
    setCorrecting(true);
    try {
      let erfolg = 0, fehler = 0;
      for (const scan of scans) {
        try { await triggerKorrektur(scan.id); erfolg++; } catch { fehler++; }
      }
      Alert.alert('Korrektur fertig', `${erfolg} Seiten korrigiert${fehler > 0 ? `, ${fehler} Fehler` : ''}`);
      loadData();
    } catch (err: any) {
      Alert.alert('Fehler', err?.message || 'Korrektur fehlgeschlagen');
    } finally {
      setCorrecting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Arbeit loeschen?', 'Alle Scans und Korrekturen gehen verloren!', [
      { text: 'Abbrechen', style: 'cancel' },
      {
        text: 'Loeschen', style: 'destructive',
        onPress: async () => {
          try {
            await deleteArbeit(parseInt(id!, 10));
            router.back();
          } catch (e: any) { Alert.alert('Fehler', e?.response?.data?.error || e?.message); }
        }
      },
    ]);
  };

  const handleDownloadPdf = () => {
    const url = downloadArbeitPdf(parseInt(id!, 10));
    Linking.openURL(url);
  };

  if (loading) {
    return <SafeAreaView style={styles.container}><ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 100 }} /></SafeAreaView>;
  }

  if (!arbeit) {
    return <SafeAreaView style={styles.container}><Text style={styles.emptyText}>Arbeit nicht gefunden</Text></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Zurueck</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{arbeit.fach}</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.titel}>{arbeit.titel}</Text>
        <Text style={styles.meta}>
          {new Date(arbeit.datum).toLocaleDateString('de-DE')} · Max. {arbeit.max_punkte} Punkte
        </Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor(arbeit.status) }]}>
            <Text style={styles.statusText}>{arbeit.status}</Text>
          </View>
          <Text style={styles.scanCount}>{scans.length} Seiten gescannt</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.push(`/scanner?arbeitId=${id}`)}>
          <Text style={styles.actionIcon}>📷</Text>
          <Text style={styles.actionLabel}>Scannen</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.actionPrimary]}
          onPress={handleKorrigieren} disabled={correcting}>
          <Text style={styles.actionIcon}>{correcting ? '⏳' : '🧠'}</Text>
          <Text style={[styles.actionLabel, { color: '#fff' }]}>
            {correcting ? 'Korrigiert...' : 'KI Korrigieren'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* PDF Download */}
      {(arbeit as any).pdf_pfad && (
        <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPdf}>
          <Text style={styles.downloadIcon}>📥</Text>
          <Text style={styles.downloadText}>Personalisierte PDFs herunterladen</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Gescannte Seiten</Text>
      <FlatList
        data={scans}
        keyExtractor={item => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.scanItem}
            onPress={() => router.push(`/korrektur?scanId=${item.id}` as any)}>
            <View>
              <Text style={styles.scanName}>{item.vorname} {item.nachname}</Text>
              <Text style={styles.scanMeta}>Seite {item.seiten_nr}</Text>
            </View>
            <Text style={styles.scanArrow}>→</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>Noch keine Scans.</Text>}
      />
    </SafeAreaView>
  );
}

function statusColor(status: string) {
  switch (status) {
    case 'fertig': return '#10b981';
    case 'pruefen': case 'korrigieren': return '#f59e0b';
    case 'scannen': return '#3b82f6';
    default: return '#334155';
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  backText: { color: '#3b82f6', fontSize: 15 },
  headerTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  deleteText: { fontSize: 18 },
  infoCard: {
    backgroundColor: '#1e293b', margin: 20, borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#334155',
  },
  titel: { color: '#f1f5f9', fontSize: 20, fontWeight: '700' },
  meta: { color: '#64748b', fontSize: 13, marginTop: 4 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  scanCount: { color: '#94a3b8', fontSize: 13 },
  actions: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 12 },
  actionButton: {
    flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#334155',
  },
  actionPrimary: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  actionIcon: { fontSize: 22 },
  actionLabel: { fontSize: 11, color: '#94a3b8', marginTop: 4, fontWeight: '600' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#1e293b', marginHorizontal: 20, marginBottom: 16,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#10b981',
  },
  downloadIcon: { fontSize: 20 },
  downloadText: { color: '#10b981', fontSize: 14, fontWeight: '600', flex: 1 },
  sectionTitle: {
    color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase',
    letterSpacing: 0.5, paddingHorizontal: 20, marginBottom: 10,
  },
  scanItem: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 14, marginBottom: 8,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#334155',
  },
  scanName: { color: '#f1f5f9', fontSize: 15, fontWeight: '600' },
  scanMeta: { color: '#64748b', fontSize: 12, marginTop: 2 },
  scanArrow: { color: '#64748b', fontSize: 18 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, paddingHorizontal: 20 },
});
