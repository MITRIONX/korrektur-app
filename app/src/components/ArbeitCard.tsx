import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Arbeit } from '../types';
import StatusBadge from './StatusBadge';

interface ArbeitCardProps {
  arbeit: Arbeit;
  onPress: () => void;
}

function formatGermanDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ArbeitCard({ arbeit, onPress }: ArbeitCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.fach}>{arbeit.fach}</Text>
          <Text style={styles.titel}>{arbeit.titel}</Text>
          <Text style={styles.datum}>{formatGermanDate(arbeit.datum)}</Text>
        </View>
        <View style={styles.right}>
          <StatusBadge status={arbeit.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    marginRight: 12,
  },
  right: {
    alignItems: 'flex-end',
  },
  fach: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titel: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  datum: {
    color: '#64748b',
    fontSize: 13,
  },
});
