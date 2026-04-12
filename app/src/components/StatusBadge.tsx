import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Arbeit } from '../types';

type Status = Arbeit['status'];

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { bg: string; text: string; label: string }> = {
  entwurf:    { bg: '#334155', text: '#f1f5f9', label: 'Entwurf' },
  scannen:    { bg: '#3b82f6', text: '#ffffff', label: 'Scannen' },
  korrigieren:{ bg: '#f59e0b', text: '#1c1917', label: 'Korrigieren' },
  pruefen:    { bg: '#f59e0b', text: '#1c1917', label: 'Prüfen' },
  fertig:     { bg: '#10b981', text: '#ffffff', label: 'Fertig' },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.entwurf;

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
});
