import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { checkForUpdate } from '../src/lib/updater';

export default function RootLayout() {
  const { token, loadToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadToken().finally(() => setLoading(false));
    checkForUpdate();
  }, []);

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === 'login';
    if (!token && !inAuth) {
      router.replace('/login');
    } else if (token && inAuth) {
      router.replace('/');
    }
  }, [token, loading, segments]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="klassen" options={{ title: 'Klassen' }} />
      <Stack.Screen name="arbeit-erstellen" options={{ title: 'Arbeit erstellen' }} />
      <Stack.Screen name="scanner" options={{ title: 'Scanner' }} />
      <Stack.Screen name="korrektur" options={{ title: 'Korrektur' }} />
    </Stack>
  );
}
