import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { checkForUpdate } from '../src/lib/updater';

export default function RootLayout() {
  const { loadToken } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken().finally(() => setLoading(false));
    checkForUpdate();
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="klassen" />
      <Stack.Screen name="arbeit-erstellen" />
      <Stack.Screen name="scanner" />
      <Stack.Screen name="korrektur" />
      <Stack.Screen name="arbeit/[id]" />
    </Stack>
  );
}
