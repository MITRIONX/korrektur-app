import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/auth';
import { getArbeiten, getKlassen } from '../../src/services/api';
import { Arbeit, Klasse } from '../../src/types';
import ArbeitCard from '../../src/components/ArbeitCard';

export default function DashboardScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [arbeiten, setArbeiten] = useState<Arbeit[]>([]);
  const [klassen, setKlassen] = useState<Klasse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [arbeitenData, klassenData] = await Promise.all([
        getArbeiten(),
        getKlassen(),
      ]);
      setArbeiten(arbeitenData);
      setKlassen(klassenData);
    } catch (err) {
      console.error('Fehler beim Laden der Daten:', err);
    }
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const greeting = user?.name ? `Hallo, ${user.name}` : 'Willkommen';

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={arbeiten}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          <ArbeitCard
            arbeit={item}
            onPress={() => router.push(`/arbeit/${item.id}` as any)}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.subtitle}>
              {klassen.length} {klassen.length === 1 ? 'Klasse' : 'Klassen'} · {arbeiten.length} {arbeiten.length === 1 ? 'Arbeit' : 'Arbeiten'}
            </Text>

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => router.push('/scanner')}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonPrimaryText}>Scannen</Text>
              </TouchableOpacity>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary, styles.actionButtonHalf]}
                  onPress={() => router.push('/arbeit-erstellen')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonSecondaryText}>Neue Arbeit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary, styles.actionButtonHalf]}
                  onPress={() => router.push('/klassen')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.actionButtonSecondaryText}>Klassen</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Letzte Arbeiten</Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Noch keine Arbeiten vorhanden.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  greeting: {
    color: '#f1f5f9',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 24,
  },
  actionsContainer: {
    marginBottom: 28,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  actionButtonSecondary: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  actionButtonHalf: {
    flex: 1,
  },
  actionButtonSecondaryText: {
    color: '#f1f5f9',
    fontSize: 15,
    fontWeight: '600',
  },
  sectionTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 24,
  },
});
