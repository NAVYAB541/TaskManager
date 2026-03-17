import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/Theme';
import { MaterialIcons } from '@expo/vector-icons';

const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';
type Props = NativeStackScreenProps<RootStackParamList, 'FocusMode'>;
type FeelingRating = 'easy' | 'okay' | 'hard';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const RATINGS: { value: FeelingRating; emoji: string; label: string }[] = [
  { value: 'easy', emoji: '😊', label: 'Easy' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'hard', emoji: '😓', label: 'Hard' },
];

export default function FocusModeScreen({ navigation, route }: Props) {
  const { task } = route.params;
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  const handleFinish = () => {
    setRunning(false);
    setShowRating(true);
  };

  const handleRating = async (rating: FeelingRating) => {
    setSubmitting(true);
    setShowRating(false);
    try {
      const actualMinutes = Math.max(1, Math.round(seconds / 60));
      const res = await fetch(`${API_URL}/${task.id}/complete-focus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actualMinutes, feelingRating: rating }),
      });
      if (!res.ok) throw new Error('Failed');
      navigation.navigate('TaskList');
    } catch {
      Alert.alert('Error', 'Could not save session');
      setSubmitting(false);
    }
  };

  const estimateSecs = (task.estimateMinutes ?? 30) * 60;
  const isOverTime = seconds > estimateSecs;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.focusLabel}>FOCUS MODE</Text>
        <Text style={styles.taskTitle}>{task.title}</Text>
        {!!task.nextAction && (
          <View style={styles.nextActionBox}>
            <MaterialIcons name="arrow-forward" size={16} color="#a78bfa" />
            <Text style={styles.nextActionText}>{task.nextAction}</Text>
          </View>
        )}
      </View>

      {/* Timer */}
      <View style={styles.timerSection}>
        <View style={[styles.timerRing, isOverTime && styles.timerRingOver]}>
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
          <Text style={styles.timerSub}>Est: {task.estimateMinutes ?? 30} min</Text>
        </View>
        {isOverTime && (
          <View style={styles.overTimeBadge}>
            <Text style={styles.overTimeText}>Over estimate — you're still making progress!</Text>
          </View>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, running ? styles.pauseBtn : styles.resumeBtn]}
          onPress={() => setRunning(r => !r)}
        >
          <MaterialIcons name={running ? 'pause' : 'play-arrow'} size={26} color="white" />
          <Text style={styles.controlBtnText}>{running ? 'Pause' : 'Resume'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.controlBtn, styles.finishBtn]} onPress={handleFinish}>
          <MaterialIcons name="check" size={26} color="white" />
          <Text style={styles.controlBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Feeling rating modal */}
      <Modal visible={showRating} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => {}}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>How'd that feel?</Text>
            <Text style={styles.modalSub}>
              You focused for {formatTime(seconds)}
              {task.estimateMinutes ? ` (estimated ${task.estimateMinutes} min)` : ''}
            </Text>
            <View style={styles.ratingRow}>
              {RATINGS.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={styles.ratingBtn}
                  onPress={() => handleRating(r.value)}
                  disabled={submitting}
                >
                  <Text style={styles.ratingEmoji}>{r.emoji}</Text>
                  <Text style={styles.ratingLabel}>{r.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0c29', padding: 24 },

  header: { marginTop: 40, marginBottom: 40 },
  focusLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: 3,
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: 'white',
    marginBottom: 16,
    lineHeight: 32,
  },
  nextActionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(79,70,229,0.2)',
    borderRadius: 10,
    padding: 12,
  },
  nextActionText: { flex: 1, fontSize: 15, color: '#c4b5fd', lineHeight: 22 },

  timerSection: { alignItems: 'center', marginBottom: 52 },
  timerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,70,229,0.1)',
  },
  timerRingOver: { borderColor: '#f59e0b' },
  timerText: { fontSize: 44, fontWeight: '800', color: 'white' },
  timerSub: { fontSize: 13, color: '#666', marginTop: 4 },
  overTimeBadge: {
    marginTop: 16,
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  overTimeText: { color: '#f59e0b', fontWeight: '600', fontSize: 13, textAlign: 'center' },

  controls: { flexDirection: 'row', gap: 12 },
  controlBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  pauseBtn: { backgroundColor: '#374151' },
  resumeBtn: { backgroundColor: COLORS.secondary },
  finishBtn: { backgroundColor: COLORS.primary },
  controlBtnText: { color: 'white', fontWeight: '700', fontSize: 16 },

  // Rating modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 28,
    paddingBottom: 48,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSub: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 28 },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-around' },
  ratingBtn: { alignItems: 'center', padding: 16 },
  ratingEmoji: { fontSize: 42, marginBottom: 8 },
  ratingLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
});
