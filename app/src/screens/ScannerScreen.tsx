import { useEffect, useRef, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { uploadScan } from '../services/api';
import { parseQrContent } from '../services/qr-parser';

export function ScannerScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [scannedCount, setScannedCount] = useState(0);
  const [lastScanned, setLastScanned] = useState<{
    arbeitId: number;
    schuelerId: number;
    seitenNr: number;
  } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (processing) return;

    const parsed = parseQrContent(result.data);
    if (!parsed) return;

    setProcessing(true);
    setLastScanned(parsed);

    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.85,
        base64: false,
      });

      if (!photo?.uri) {
        throw new Error('Kein Bild aufgenommen.');
      }

      const formData = new FormData();
      formData.append('image', {
        uri: photo.uri,
        name: `scan_${parsed.arbeitId}_${parsed.schuelerId}_${parsed.seitenNr}.jpg`,
        type: 'image/jpeg',
      } as any);
      formData.append('schueler_id', String(parsed.schuelerId));
      formData.append('seiten_nr', String(parsed.seitenNr));

      await uploadScan(parsed.arbeitId, formData);

      setScannedCount((c) => c + 1);
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Upload fehlgeschlagen.';
      Alert.alert('Fehler', message);
    } finally {
      // Short cooldown to prevent re-scanning the same QR immediately
      setTimeout(() => setProcessing(false), 2000);
    }
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#3b82f6" size="large" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>
          Kamera-Zugriff wird benötigt, um QR-Codes zu scannen.
        </Text>
        <Pressable style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Zugriff erlauben</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={processing ? undefined : handleBarCodeScanned}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.closeButton} onPress={() => router.back()}>
          <Text style={styles.closeButtonText}>✕</Text>
        </Pressable>
        <Text style={styles.title}>Scannen</Text>
        <View style={styles.closeButton} />
      </View>

      {/* QR info banner */}
      {lastScanned && (
        <View style={styles.infoBanner}>
          {processing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.infoBannerDot}>✓</Text>
          )}
          <Text style={styles.infoBannerText}>
            Arbeit {lastScanned.arbeitId} · Schüler {lastScanned.schuelerId} ·
            Seite {lastScanned.seitenNr}
          </Text>
        </View>
      )}

      {/* Scan frame hint */}
      <View style={styles.frameHint} pointerEvents="none">
        <View style={styles.frame} />
      </View>

      {/* Bottom counter */}
      <View style={styles.bottomBar}>
        <Text style={styles.counterText}>
          {scannedCount === 0
            ? 'QR-Code in den Rahmen halten'
            : `${scannedCount} Seite${scannedCount !== 1 ? 'n' : ''} gescannt`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(22,163,74,0.85)',
    borderRadius: 10,
  },
  infoBannerDot: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  infoBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
  },
  frameHint: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 220,
    height: 220,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  bottomBar: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
  },
  counterText: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '500',
  },
});
