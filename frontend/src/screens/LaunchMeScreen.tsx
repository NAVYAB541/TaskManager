import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Task } from '../types';
import { COLORS } from '../constants/Theme';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';
const TIME_WINDOWS = [15, 30, 60] as const;
type TimeWindow = typeof TIME_WINDOWS[number];

type Props = NativeStackScreenProps<RootStackParamList, 'LaunchMe'>;

function inferEnergy(): 'high' | 'medium' | 'low' {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'high';
  if (h >= 12 && h < 18) return 'medium';
  return 'low';
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default function LaunchMeScreen({ navigation }: Props) {
  const [window, setWindow] = useState<TimeWindow>(30);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?completed=false`);
      let data: Task[] = await res.json();

      // Only tasks that fit in the selected window
      data = data.filter(t => (t.estimateMinutes ?? 30) <= window);

      // Sort: overdue first → soonest due date → highest priority
      data.sort((a, b) => {
        const aOverdue = a.dueDate && dayjs(a.dueDate).isBefore(dayjs()) ? 0 : 1;
        const bOverdue = b.dueDate && dayjs(b.dueDate).isBefore(dayjs()) ? 0 : 1;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        if (a.dueDate && b.dueDate) return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return (PRIORITY_ORDER[a.priority ?? 'medium']) - (PRIORITY_ORDER[b.priority ?? 'medium']);
      });

      setTasks(data.slice(0, 3));
    } catch {
      Alert.alert('Error', 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  }, [window]);

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  const energyNow = inferEnergy();
  const energyEmoji = energyNow === 'high' ? '⚡' : energyNow === 'medium' ? '🌤' : '🌙';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Launch Me</Text>
        <Text style={styles.subtitle}>
          {energyEmoji} Your energy right now:{' '}
          <Text style={styles.energyHighlight}>{energyNow}</Text>
        </Text>
      </View>

      <Text style={styles.sectionLabel}>I have...</Text>
      <View style={styles.windowRow}>
        {TIME_WINDOWS.map(w => (
          <TouchableOpacity
            key={w}
            style={[styles.windowBtn, window === w && styles.windowBtnActive]}
            onPress={() => setWindow(w)}
          >
            <Text style={[styles.windowBtnText, window === w && styles.windowBtnTextActive]}>
              {w} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Best tasks for right now:</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyText}>No tasks fit in {window} min</Text>
          <Text style={styles.emptySubtext}>
            Try a longer window, or add tasks with shorter estimates.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item, index }) => (
            <View style={styles.taskCard}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{item.title}</Text>
                {!!item.nextAction && (
                  <Text style={styles.nextAction}>→ {item.nextAction}</Text>
                )}
                <View style={styles.metaRow}>
                  <View style={styles.timeBadge}>
                    <MaterialIcons name="timer" size={12} color={COLORS.primary} />
                    <Text style={styles.timeBadgeText}>{item.estimateMinutes ?? 30} min</Text>
                  </View>
                  {item.dueDate && (
                    <Text style={styles.dueDateText}>
                      📅 {dayjs(item.dueDate).format('DD MMM')}
                    </Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => navigation.navigate('FocusMode', { task: item })}
              >
                <Text style={styles.startBtnText}>Start</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f8fc' },

  header: { marginTop: 8, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#666' },
  energyHighlight: { fontWeight: '700', color: COLORS.primary },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  windowRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  windowBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  windowBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  windowBtnText: { fontSize: 15, fontWeight: '700', color: '#bbb' },
  windowBtnTextActive: { color: COLORS.primary },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  nextAction: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  metaRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  timeBadgeText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  dueDateText: { fontSize: 12, color: '#888' },
  startBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startBtnText: { color: 'white', fontWeight: '700', fontSize: 14 },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#888', textAlign: 'center' },
});
