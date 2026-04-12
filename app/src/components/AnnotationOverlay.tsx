import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KorrekturAufgabe } from '../types';

interface AnnotationOverlayProps {
  aufgaben: KorrekturAufgabe[];
  imageWidth: number;
  imageHeight: number;
}

export function AnnotationOverlay({
  aufgaben,
  imageWidth,
  imageHeight,
}: AnnotationOverlayProps) {
  return (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { width: imageWidth, height: imageHeight },
      ]}
      pointerEvents="none"
    >
      {aufgaben.map((aufgabe, index) => {
        const left = (aufgabe.position.x / 100) * imageWidth;
        const top = (aufgabe.position.y / 100) * imageHeight;
        const width = (aufgabe.position.w / 100) * imageWidth;
        const height = (aufgabe.position.h / 100) * imageHeight;

        const isRichtig = aufgabe.bewertung === 'richtig';
        const borderColor = isRichtig ? '#10b981' : '#ef4444';
        const badgeBg = isRichtig ? '#10b981' : '#ef4444';
        const badgeIcon = isRichtig ? '✓' : '✗';

        return (
          <View
            key={index}
            style={[
              styles.annotation,
              { left, top, width, height, borderColor },
            ]}
          >
            {/* Score badge */}
            <View style={[styles.badge, { backgroundColor: badgeBg }]}>
              <Text style={styles.badgeText}>
                {badgeIcon} {aufgabe.punkte}/{aufgabe.max_punkte}
              </Text>
            </View>

            {/* Feedback below wrong answers */}
            {!isRichtig && aufgabe.feedback ? (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackText} numberOfLines={2}>
                  {aufgabe.feedback}
                </Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  annotation: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -12,
    left: 0,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: -30,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(239,68,68,0.85)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  feedbackText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '500',
  },
});
