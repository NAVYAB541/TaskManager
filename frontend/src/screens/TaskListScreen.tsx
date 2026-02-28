import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Task } from '../types';
import { COLORS } from '../constants/Theme';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { cancelTaskReminder } from '../utils/notifications';

const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';

function Chip({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  const bg = selected ? (color ?? COLORS.primary) : '#f0f0f0';
  const textColor = selected ? 'white' : '#444';
  return (
    <TouchableOpacity
      style={[styles.chip, { backgroundColor: bg }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      <Text style={[styles.chipText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Sort modal ───────────────────────────────────────────────────────────────
const SORT_OPTIONS: { label: string; value: 'priority' | 'dueDate' | 'title' }[] = [
  { label: '📅  Due Date', value: 'dueDate' },
  { label: '🔥  Priority', value: 'priority' },
  { label: '🔤  Title (A–Z)', value: 'title' },
];

function SortModal({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (v: 'priority' | 'dueDate' | 'title') => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Sort tasks by</Text>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.modalRow, current === opt.value && styles.modalRowSelected]}
              onPress={() => { onSelect(opt.value); onClose(); }}
            >
              <Text style={[styles.modalRowText, current === opt.value && { color: COLORS.primary, fontWeight: '700' }]}>
                {opt.label}
              </Text>
              {current === opt.value && (
                <MaterialIcons name="check" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

// ─── Tag colours ──────────────────────────────────────────────────────────────
const TAG_PALETTE = ['#FF6B6B', '#4ECDC4', '#556270', '#C7F464', '#FFA500'];
function tagColor(tag: string) {
  const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return TAG_PALETTE[hash % TAG_PALETTE.length];
}

// ─── Priority colours ─────────────────────────────────────────────────────────
function priorityColor(p?: string) {
  if (p === 'high') return COLORS.danger;
  if (p === 'medium') return COLORS.primary;
  return COLORS.secondary;
}

// ─── Productivity ring ────────────────────────────────────────────────────────
function ProductivityBadge({ score }: { score: number }) {
  const emoji = score >= 80 ? '🚀' : score >= 50 ? '💪' : score > 0 ? '🌱' : '🧠';
  const ringColor = score >= 80 ? '#4CAF50' : score >= 50 ? COLORS.primary : '#FF9800';
  return (
    <View style={[styles.scoreCard, { borderColor: ringColor }]}>
      <Text style={styles.scoreEmoji}>{emoji}</Text>
      <View>
        <Text style={styles.scoreLabel}>Productivity Score</Text>
        <Text style={[styles.scoreValue, { color: ringColor }]}>{score}/100</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function TaskListScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'TaskList'>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'title'>('dueDate');
  const [allTags, setAllTags] = useState<string[]>([]);
  const [sortVisible, setSortVisible] = useState(false);

  const CATEGORIES = ['all', 'General', 'Work', 'Personal', 'Study'];

  const computeProductivityScore = (tasks: Task[]) => {
    if (!tasks.length) return 0;
    let score = 0;
    const max = tasks.reduce((acc, t) => acc + (t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1), 0);
    tasks.forEach(t => { if (t.completed) score += t.priority === 'high' ? 3 : t.priority === 'medium' ? 2 : 1; });
    return max ? Math.round((score / max) * 100) : 0;
  };

  const productivityScore = computeProductivityScore(tasks);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      let data: Task[] = await res.json();
      const tagsSet = new Set<string>();
      data.forEach(t => t.tags?.forEach(tag => tagsSet.add(tag)));
      setAllTags(Array.from(tagsSet).sort());
      if (filter === 'completed') data = data.filter(t => t.completed);
      if (filter === 'pending') data = data.filter(t => !t.completed);
      if (categoryFilter !== 'all') data = data.filter(t => t.category === categoryFilter);
      if (tagFilter !== 'all') data = data.filter(t => t.tags?.includes(tagFilter));
      data.sort((a, b) => {
        if (sortBy === 'priority') {
          const o = { high: 1, medium: 2, low: 3 };
          return (o[a.priority || 'medium'] || 2) - (o[b.priority || 'medium'] || 2);
        }
        if (sortBy === 'dueDate') return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        return a.title.localeCompare(b.title);
      });
      setTasks(data);
    } catch {
      Alert.alert('Error', 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { loadTasks(); }, [filter, sortBy, categoryFilter, tagFilter]));

  const toggleTask = async (task: Task) => {
    try {
      await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, completed: !task.completed }),
      });
      loadTasks();
    } catch { Alert.alert('Error', 'Could not update task'); }
  };

  const deleteTask = (task: Task) => {
    Alert.alert('Delete task', `Remove "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await cancelTaskReminder(task.id);
            await fetch(`${API_URL}/${task.id}`, { method: 'DELETE' });
            loadTasks();
          } catch { Alert.alert('Error', 'Could not delete task'); }
        },
      },
    ]);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const isOverdue = item.dueDate && !item.completed && dayjs(item.dueDate).isBefore(dayjs());
    const pColor = priorityColor(item.priority);
    return (
      <TouchableOpacity
        style={[styles.task, { borderLeftColor: pColor }, isOverdue && styles.overdueTask]}
        onPress={() => navigation.navigate('TaskDetails', { task: item })}
        accessibilityRole="button"
        accessibilityLabel={`Task: ${item.title}${isOverdue ? ', overdue' : ''}`}
      >
        <TouchableOpacity onPress={() => toggleTask(item)} style={styles.checkBtn} accessibilityRole="checkbox" accessibilityState={{ checked: item.completed }}>
          <MaterialIcons
            name={item.completed ? 'check-circle' : 'radio-button-unchecked'}
            size={26}
            color={item.completed ? '#4CAF50' : pColor}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={[styles.taskTitle, item.completed && styles.completedTitle]} numberOfLines={2}>
            {item.title}
          </Text>

          <View style={styles.metaRow}>
            {item.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: pColor + '22', borderColor: pColor }]}>
                <Text style={[styles.priorityText, { color: pColor }]}>
                  {item.priority.toUpperCase()}
                </Text>
              </View>
            )}
            {item.category && (
              <Text style={styles.categoryChip}>
                {item.category}
              </Text>
            )}
            {isOverdue && <Text style={styles.overdueBadge}>⚠ Overdue</Text>}
          </View>

          {(item.tags || []).length > 0 && (
            <View style={styles.tagRow}>
              {(item.tags || []).map(tag => (
                <View key={tag} style={[styles.tagBadge, { backgroundColor: tagColor(tag) }]}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          )}

          {item.dueDate && (
            <Text style={[styles.dueDate, isOverdue && { color: COLORS.danger }]}>
              📅 {dayjs(item.dueDate).format('DD MMM YYYY')}
            </Text>
          )}
        </View>

        <TouchableOpacity onPress={() => deleteTask(item)} style={styles.deleteBtn} accessibilityRole="button" accessibilityLabel="Delete task">
          <MaterialIcons name="delete-outline" size={22} color="#ccc" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const sortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort';

  return (
    <View style={styles.container}>
      <ProductivityBadge score={productivityScore} />

      {/* ── Filter section ── */}
      <View style={styles.filterSection}>
        {/* Row 1: status chips + sort button */}
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {(['all', 'pending', 'completed'] as const).map(f => (
              <Chip key={f} label={f.charAt(0).toUpperCase() + f.slice(1)} selected={filter === f} onPress={() => setFilter(f)} />
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.sortBtn} onPress={() => setSortVisible(true)}>
            <MaterialIcons name="sort" size={16} color={COLORS.primary} />
            <Text style={styles.sortBtnText} numberOfLines={1}>
              {sortLabel.split('  ')[1]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Row 2: category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {CATEGORIES.map(cat => (
            <Chip
              key={cat}
              label={cat === 'all' ? 'All Categories' : cat}
              selected={categoryFilter === cat}
              onPress={() => setCategoryFilter(cat)}
              color="#6C63FF"
            />
          ))}
        </ScrollView>

        {/* Row 3: tag chips (only if there are tags) */}
        {allTags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            <Chip label="All Tags" selected={tagFilter === 'all'} onPress={() => setTagFilter('all')} color="#FF6B6B" />
            {allTags.map(tag => (
              <Chip key={tag} label={tag} selected={tagFilter === tag} onPress={() => setTagFilter(tag)} color={tagColor(tag)} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── Add Task ── */}
      <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddTask')}>
        <MaterialIcons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>Add Task</Text>
      </TouchableOpacity>

      {/* ── Task list ── */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 32 }} />
      ) : tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyText}>No tasks here</Text>
          <Text style={styles.emptySubtext}>Try changing your filters or add a new task.</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={item => item.id}
          renderItem={renderTask}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      <SortModal visible={sortVisible} current={sortBy} onSelect={setSortBy} onClose={() => setSortVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f7f8fc' },

  // Productivity card
  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreEmoji: { fontSize: 28 },
  scoreLabel: { fontSize: 12, color: '#888', fontWeight: '500' },
  scoreValue: { fontSize: 22, fontWeight: '800' },

  // Filters
  filterSection: { gap: 6, marginBottom: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chipScroll: { paddingVertical: 2, paddingRight: 8, gap: 6, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginRight: 6,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: 'white',
    flexShrink: 0,
  },
  sortBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary, maxWidth: 70 },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    borderRadius: 12,
    marginBottom: 14,
  },
  addButtonText: { color: 'white', fontWeight: '700', fontSize: 16 },

  // Task card
  task: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 14,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 10,
  },
  overdueTask: { backgroundColor: '#fff5f5' },
  checkBtn: { paddingTop: 2 },
  deleteBtn: { paddingTop: 2 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  completedTitle: { textDecorationLine: 'line-through', color: '#aaa' },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 6 },
  priorityBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  categoryChip: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6C63FF',
    backgroundColor: '#ede9ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  overdueBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#e53935',
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  tagText: { color: 'white', fontSize: 11, fontWeight: '600' },
  dueDate: { fontSize: 12, color: '#888', marginTop: 2 },

  // Sort modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, color: '#1a1a1a' },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalRowSelected: { backgroundColor: '#f5f3ff', borderRadius: 10, paddingHorizontal: 10 },
  modalRowText: { fontSize: 15, color: '#333' },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#888', textAlign: 'center' },
});
