import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      headerStyle: { backgroundColor: '#1e293b' },
      headerTintColor: '#f1f5f9',
      tabBarStyle: { backgroundColor: '#1e293b', borderTopColor: '#334155' },
      tabBarActiveTintColor: '#3b82f6',
      tabBarInactiveTintColor: '#64748b',
    }}>
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🏠</Text> }} />
      <Tabs.Screen name="ergebnisse" options={{ title: 'Ergebnisse', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📊</Text> }} />
      <Tabs.Screen name="einstellungen" options={{ title: 'Einstellungen', tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>⚙️</Text> }} />
    </Tabs>
  );
}
