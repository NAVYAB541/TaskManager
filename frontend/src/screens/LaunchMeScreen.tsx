import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import {
  Button,
  Surface,
  Chip,
  Icon,
  ActivityIndicator,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Task } from '../types';
import { COLORS } from '../constants/Theme';
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

const ENERGY_META = {
  high:   { icon: 'lightning-bolt',         color: '#f59e0b', label: 'High energy' },
  medium: { icon: 'weather-partly-cloudy',  color: COLORS.primary, label: 'Medium energy' },
  low:    { icon: 'weather-night',          color: '#6366f1', label: 'Low energy' },
};

export default function LaunchMeScreen({ navigation }: Props) {
  const [window, setWindow] = useState<TimeWindow>(30);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}?completed=false`);
      let data: Task[] = await res.json();

      data = data.filter(t => (t.estimateMinutes ?? 30) <= window);

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
  const energyMeta = ENERGY_META[energyNow];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Energy banner */}
      <Surface style={styles.energyBanner} elevation={0}>
        <Icon source={energyMeta.icon} size={24} color={energyMeta.color} />
        <View>
          <Text style={styles.energyLabel}>Right now</Text>
          <Text style={[styles.energyValue, { color: energyMeta.color }]}>
            {energyMeta.label}
          </Text>
        </View>
      </Surface>

      {/* Time window picker */}
      <Text style={styles.sectionLabel}>I have...</Text>
      <View style={styles.windowRow}>
        {TIME_WINDOWS.map(w => (
          <Chip
            key={w}
            selected={window === w}
            onPress={() => setWindow(w)}
            selectedColor={COLORS.primary}
            style={styles.windowChip}
            showSelectedCheck={false}
          >
            {w} min
          </Chip>
        ))}
      </View>

      <Text style={styles.sectionLabel}>Best tasks for right now</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon source="check-all" size={56} color="#ddd" />
          <Text style={styles.emptyText}>No tasks fit in {window} min</Text>
          <Text style={styles.emptySubtext}>
            Try a longer window, or add tasks with shorter estimates.
          </Text>
        </View>
      ) : (
        tasks.map((item, index) => (
          <Surface key={item.id} style={styles.taskCard} elevation={1}>
            <View style={styles.taskRank}>
              <Text style={styles.taskRankText}>#{index + 1}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.taskTitle}>{item.title}</Text>

              {!!item.nextAction && (
                <View style={styles.nextActionRow}>
                  <Icon source="arrow-right" size={14} color="#888" />
                  <Text style={styles.nextActionText}>{item.nextAction}</Text>
                </View>
              )}

              <View style={styles.metaRow}>
                <Chip
                  compact
                  icon="timer-outline"
                  mode="flat"
                  style={styles.timeBadge}
                  textStyle={styles.timeBadgeText}
                >
                  {item.estimateMinutes ?? 30} min
                </Chip>

                {item.dueDate && (
                  <Chip
                    compact
                    icon="calendar"
                    mode="flat"
                    style={styles.dateBadge}
                    textStyle={styles.dateBadgeText}
                  >
                    {dayjs(item.dueDate).format('DD MMM')}
                  </Chip>
                )}
              </View>
            </View>

            <Button
              mode="contained"
              onPress={() => navigation.navigate('FocusMode', { task: item })}
              buttonColor={COLORS.primary}
              style={styles.startBtn}
              compact
            >
              Start
            </Button>
          </Surface>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 16, paddingBottom: 40 },

  energyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  energyLabel: { fontSize: 12, color: '#aaa', fontWeight: '500' },
  energyValue: { fontSize: 17, fontWeight: '700' },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  windowRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  windowChip: { flex: 1, justifyContent: 'center' },

  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  taskRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary + '18',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskRankText: { fontSize: 13, fontWeight: '800', color: COLORS.primary },
  taskTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 6 },

  nextActionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: 8 },
  nextActionText: { flex: 1, fontSize: 13, color: '#666', lineHeight: 18 },

  metaRow: { flexDirection: 'row', gap: 6 },
  timeBadge: { backgroundColor: COLORS.primary + '15', height: 26 },
  timeBadgeText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  dateBadge: { backgroundColor: '#f0f0f0', height: 26 },
  dateBadgeText: { fontSize: 12, color: '#555' },

  startBtn: { borderRadius: 10 },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 17, fontWeight: '700', color: '#333' },
  emptySubtext: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});
