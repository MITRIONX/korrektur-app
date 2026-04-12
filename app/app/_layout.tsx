import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function RootLayout() {
  const { token, loadToken } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadToken().finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {token ? (
        <Stack.Screen name="(tabs)" />
      ) : (
        <Stack.Screen name="login" />
      )}
    </Stack>
  );
}
