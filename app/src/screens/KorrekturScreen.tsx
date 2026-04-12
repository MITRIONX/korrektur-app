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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getKorrektur, bestaetigeKorrektur } from '../services/api';
import { Korrektur } from '../types';
import { AnnotationOverlay } from '../components/AnnotationOverlay';

export function KorrekturScreen() {
  const router = useRouter();
  const { scanId, bildUri } = useLocalSearchParams<{
    scanId: string;
    bildUri: string;
  }>();
  const { width: screenWidth } = useWindowDimensions();

  const [korrektur, setKorrektur] = useState<Korrektur | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);

  // Load correction data on mount
  useEffect(() => {
    if (!scanId) return;

    getKorrektur(Number(scanId))
      .then((data) => setKorrektur(data))
      .catch((err) => {
        const message =
          err?.response?.data?.message ||
          err?.message ||
          'Korrektur konnte nicht geladen werden.';
        Alert.alert('Fehler', message);
      })
      .finally(() => setLoading(false));
  }, [scanId]);

  // Get image dimensions and scale to screen width
  useEffect(() => {
    if (!bildUri) return;

    Image.getSize(
      bildUri,
      (w, h) => {
        const scaledHeight = (h / w) * screenWidth;
        setImageHeight(scaledHeight);
      },
      () => {
        // Fallback height if image size cannot be determined
        setImageHeight(screenWidth * 1.414);
      }
    );
  }, [bildUri, screenWidth]);

  const handleConfirm = async () => {
    if (!korrektur) return;

    setConfirming(true);
    try {
      await bestaetigeKorrektur(korrektur.id);
      router.back();
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Bestätigung fehlgeschlagen.';
      Alert.alert('Fehler', message);
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.back()}>
          <Text style={styles.iconButtonText}>←</Text>
        </Pressable>

        {korrektur ? (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>
              {korrektur.punkte} / {korrektur.max_punkte} Pkt.
            </Text>
          </View>
        ) : (
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreText}>– / –</Text>
          </View>
        )}

        <Pressable
          style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
          onPress={handleConfirm}
          disabled={confirming || !korrektur}
        >
          {confirming ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.confirmButtonText}>Bestätigen</Text>
          )}
        </Pressable>
      </View>

      {/* Scrollable image with annotation overlay */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
      >
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
            <Text style={styles.noImageText}>Kein Bild verfügbar</Text>
          </View>
        )}

        {/* Overall feedback */}
        {korrektur?.feedback ? (
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackLabel}>Gesamt-Feedback</Text>
            <Text style={styles.feedbackContent}>{korrektur.feedback}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonText: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 22,
  },
  scoreBadge: {
    backgroundColor: '#059669',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  scoreText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    minWidth: 96,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  noImageContainer: {
    width: '100%',
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noImageText: {
    color: '#64748b',
    fontSize: 15,
  },
  feedbackBox: {
    width: '100%',
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  feedbackLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  feedbackContent: {
    color: '#e2e8f0',
    fontSize: 14,
    lineHeight: 20,
  },
});
