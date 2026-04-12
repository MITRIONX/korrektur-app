import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getKorrektur, bestaetigeKorrektur, triggerKorrektur } from '../services/api';
import { Korrektur } from '../types';
import { AnnotationOverlay } from '../components/AnnotationOverlay';

export function KorrekturScreen() {
  const router = useRouter();
  const { scanId, bildUri } = useLocalSearchParams<{ scanId: string; bildUri: string }>();
  const { width: screenWidth } = useWindowDimensions();

  const [korrektur, setKorrektur] = useState<Korrektur | null>(null);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);

  useEffect(() => {
    if (!scanId) return;
    getKorrektur(Number(scanId))
      .then(setKorrektur)
      .catch(() => {
        // 404 = no correction yet, that's fine
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  useEffect(() => {
    if (!bildUri) return;
    Image.getSize(bildUri, (w, h) => {
      setImageHeight((h / w) * screenWidth);
    }, () => setImageHeight(screenWidth * 1.414));
  }, [bildUri, screenWidth]);

  const handleKorrigieren = async () => {
    if (!scanId) return;
    setCorrecting(true);
    try {
      await triggerKorrektur(Number(scanId));
      // Reload correction
      const data = await getKorrektur(Number(scanId));
      setKorrektur(data);
      Alert.alert('Fertig', 'KI-Korrektur abgeschlossen!');
    } catch (err: any) {
      Alert.alert('Fehler', err?.response?.data?.error || err?.message || 'Korrektur fehlgeschlagen');
    } finally {
      setCorrecting(false);
    }
  };

  const handleConfirm = async () => {
    if (!korrektur) return;
    setConfirming(true);
    try {
      await bestaetigeKorrektur(korrektur.id);
      router.back();
    } catch (err: any) {
      Alert.alert('Fehler', err?.response?.data?.error || err?.message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return <SafeAreaView style={styles.centered}><ActivityIndicator color="#3b82f6" size="large" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Text style={styles.iconButtonText}>←</Text>
        </Pressable>

        {korrektur ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>{korrektur.punkte} / {korrektur.max_punkte}</Text>
          </View>
        ) : (
          <Text style={styles.noScoreText}>Noch nicht korrigiert</Text>
        )}

        {korrektur ? (
          <Pressable style={styles.confirmButton} onPress={handleConfirm} disabled={confirming}>
            {confirming ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={styles.confirmButtonText}>Bestaetigen</Text>}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.korrigierenButton, correcting && { opacity: 0.6 }]}
            onPress={handleKorrigieren}
            disabled={correcting}
          >
            {correcting ? <ActivityIndicator color="#fff" size="small" /> :
              <Text style={styles.confirmButtonText}>KI Korrigieren</Text>}
          </Pressable>
        )}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ alignItems: 'center' }}>
        {bildUri ? (
          <View style={{ width: screenWidth, height: imageHeight || screenWidth * 1.414 }}>
            <Image
              source={{ uri: bildUri }}
              style={{ width: screenWidth, height: imageHeight || screenWidth * 1.414 }}
              resizeMode="contain"
            />
            {korrektur && imageHeight > 0 && (
              <AnnotationOverlay
                aufgaben={korrektur.annotationen}
                imageWidth={screenWidth}
                imageHeight={imageHeight}
              />
            )}
          </View>
        ) : (
          <View style={styles.noImageContainer}>
            <Text style={styles.noImageText}>Kein Bild verfuegbar</Text>
            {!korrektur && (
              <Pressable
                style={[styles.korrigierenBig, correcting && { opacity: 0.6 }]}
                onPress={handleKorrigieren}
                disabled={correcting}
              >
                {correcting ? (
                  <>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.korrigierenBigText}>KI analysiert...</Text>
                  </>
                ) : (
                  <>
                    <Text style={{ fontSize: 28 }}>🧠</Text>
                    <Text style={styles.korrigierenBigText}>Jetzt KI korrigieren</Text>
                  </>
                )}
              </Pressable>
            )}
          </View>
        )}

        {korrektur?.feedback && (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackLabel}>Feedback</Text>
            <Text style={styles.feedbackContent}>{korrektur.feedback}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centered: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#1e293b',
    borderBottomWidth: 1, borderBottomColor: '#334155',
  },
  iconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  iconButtonText: { color: '#f1f5f9', fontSize: 18, fontWeight: '600' },
  scoreBadge: { backgroundColor: '#059669', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  scoreText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  noScoreText: { color: '#94a3b8', fontSize: 13 },
  confirmButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  korrigierenButton: { backgroundColor: '#f59e0b', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  noImageContainer: { width: '100%', flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noImageText: { color: '#64748b', fontSize: 15, marginBottom: 24 },
  korrigierenBig: {
    backgroundColor: '#f59e0b', borderRadius: 16, paddingVertical: 20, paddingHorizontal: 32,
    alignItems: 'center', gap: 8,
  },
  korrigierenBigText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  feedbackBox: { width: '100%', padding: 16, backgroundColor: '#1e293b', borderTopWidth: 1, borderTopColor: '#334155' },
  feedbackLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 6 },
  feedbackContent: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
});
