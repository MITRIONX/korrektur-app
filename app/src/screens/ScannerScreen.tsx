import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BarcodeScanningResult,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { uploadScan } from '../services/api';
import { parseQrContent } from '../services/qr-parser';

type ScanPhase = 'scanning' | 'photographing' | 'uploading';

export function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCount, setScannedCount] = useState(0);
  const [phase, setPhase] = useState<ScanPhase>('scanning');
  const [currentInfo, setCurrentInfo] = useState<string | null>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = useCallback(async (result: BarcodeScanningResult) => {
    if (processingRef.current) return;

    const parsed = parseQrContent(result.data);
    if (!parsed) return;

    processingRef.current = true;
    setCurrentInfo(`Arbeit ${parsed.arbeitId} · Schueler ${parsed.schuelerId} · Seite ${parsed.seitenNr}`);
    setPhase('photographing');

    try {
      // Use ImagePicker to take a photo - more reliable than CameraView.takePictureAsync
      const photo = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: false,
      });

      if (photo.canceled || !photo.assets?.[0]?.uri) {
        // User cancelled - go back to scanning
        setPhase('scanning');
        processingRef.current = false;
        return;
      }

      setPhase('uploading');

      const formData = new FormData();
      formData.append('bild', {
        uri: photo.assets[0].uri,
        name: `scan_${parsed.arbeitId}_${parsed.schuelerId}_${parsed.seitenNr}.jpg`,
        type: 'image/jpeg',
      } as any);
      formData.append('schueler_id', String(parsed.schuelerId));
      formData.append('seiten_nr', String(parsed.seitenNr));

      await uploadScan(parsed.arbeitId, formData);
      setScannedCount((c) => c + 1);
      setCurrentInfo(null);
      setPhase('scanning');
    } catch (err: any) {
      Alert.alert('Fehler', err?.response?.data?.error || err?.message || 'Upload fehlgeschlagen');
      setPhase('scanning');
    } finally {
      // Cooldown before next scan
      setTimeout(() => {
        processingRef.current = false;
      }, 1500);
    }
  }, []);

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator color="#3b82f6" size="large" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Kamera-Zugriff wird benoetigt.</Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Zugriff erlauben</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={phase === 'scanning' ? handleBarCodeScanned : undefined}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Scannen</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Info banner */}
      {currentInfo && (
        <View style={styles.infoBanner}>
          {phase === 'uploading' && <ActivityIndicator color="#fff" size="small" />}
          <Text style={styles.infoBannerText}>
            {phase === 'uploading' ? `Lade hoch: ${currentInfo}` : currentInfo}
          </Text>
        </View>
      )}

      {/* Center */}
      <View style={styles.centerArea} pointerEvents="none">
        {phase === 'scanning' && <View style={styles.frame} />}
        {phase === 'uploading' && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        )}
      </View>

      {/* Bottom */}
      <View style={styles.bottomBar}>
        <Text style={styles.counterText}>
          {phase === 'scanning'
            ? scannedCount === 0
              ? 'QR-Code auf dem Arbeitsblatt scannen'
              : `${scannedCount} Seite${scannedCount !== 1 ? 'n' : ''} gescannt - weiter scannen`
            : phase === 'photographing'
              ? 'Arbeitsblatt fotografieren...'
              : 'Wird hochgeladen...'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: {
    flex: 1, backgroundColor: '#0f172a', alignItems: 'center',
    justifyContent: 'center', paddingHorizontal: 32, gap: 16,
  },
  permissionText: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
  permissionButton: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 24 },
  permissionButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 12, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  closeButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  title: { color: '#fff', fontSize: 17, fontWeight: '600' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 16, marginTop: 12, paddingVertical: 10, paddingHorizontal: 16,
    backgroundColor: 'rgba(22,163,74,0.85)', borderRadius: 10,
  },
  infoBannerText: { color: '#fff', fontSize: 14, fontWeight: '500', flexShrink: 1 },
  centerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 240, height: 240, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  loadingBox: { alignItems: 'center', gap: 12 },
  bottomBar: {
    paddingVertical: 24, paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center',
  },
  counterText: { color: '#e2e8f0', fontSize: 14, fontWeight: '500' },
});
