import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList, Task } from '../types';
import { COLORS } from '../constants/Theme';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

const API_URL = 'https://taskmanagerbackend-n5g5.onrender.com/tasks';

export default function TaskListScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'TaskList'>) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'dueDate' | 'title'>('dueDate');

  // Load tasks with client-side filter + sort
  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      let data: Task[] = await res.json();

      // Apply filter locally
      if (filter === 'completed') data = data.filter((t) => t.completed);
      if (filter === 'pending') data = data.filter((t) => !t.completed);

      // Apply sorting locally
      data.sort((a, b) => {
        if (sortBy === 'priority') {
          const order = { high: 1, medium: 2, low: 3 };
          return (order[a.priority || 'medium'] || 2) - (order[b.priority || 'medium'] || 2);
        }
        if (sortBy === 'dueDate') {
          return new Date(a.dueDate || 0).getTime() - new Date(b.dueDate || 0).getTime();
        }
        return a.title.localeCompare(b.title);
      });

      setTasks(data);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not load tasks');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [filter, sortBy])
  );

  const toggleTask = async (task: Task) => {
    try {
      await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...task, completed: !task.completed }),
      });
      loadTasks();
    } catch {
      Alert.alert('Error', 'Could not update task');
    }
  };

  const deleteTask = (task: Task) => {
    Alert.alert('Confirm Delete', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await fetch(`${API_URL}/${task.id}`, { method: 'DELETE' });
            loadTasks();
          } catch {
            Alert.alert('Error', 'Could not delete task');
          }
        },
      },
    ]);
  };

  const renderTask = ({ item }: { item: Task }) => {
    const isOverdue = item.dueDate && !item.completed && dayjs(item.dueDate).isBefore(dayjs());
    const priorityColor =
      item.priority === 'high'
        ? COLORS.danger
        : item.priority === 'medium'
        ? COLORS.primary
        : COLORS.secondary;

    return (
      <TouchableOpacity
        style={[
          styles.task,
          { borderLeftColor: priorityColor },
          isOverdue && { backgroundColor: '#ffe6e6' },
        ]}
        onPress={() => navigation.navigate('TaskDetails', { task: item })}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.taskTitle,
              item.completed && { textDecorationLine: 'line-through', color: '#888' },
            ]}
          >
            {item.title}
          </Text>
          {item.dueDate && (
            <Text style={styles.dueDate}>
              Due: {dayjs(item.dueDate).format('DD MMM YYYY')}
              {isOverdue && ' ⚠ Overdue'}
            </Text>
          )}
        </View>

        <View style={styles.icons}>
          <MaterialIcons
            name={item.completed ? 'check-circle' : 'radio-button-unchecked'}
            size={28}
            color={priorityColor}
            onPress={() => toggleTask(item)}
          />
          <MaterialIcons
            name="delete"
            size={28}
            color={COLORS.danger}
            onPress={() => deleteTask(item)}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Add Task Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('AddTask')}
      >
        <Text style={styles.addButtonText}>+ Add Task</Text>
      </TouchableOpacity>

      {/* Filters and Sort */}
      <View style={styles.filterSortRow}>
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Filter</Text>
          <Picker
            selectedValue={filter}
            onValueChange={(v) => setFilter(v as any)}
            style={styles.picker}
          >
            <Picker.Item label="All" value="all" />
            <Picker.Item label="Completed" value="completed" />
            <Picker.Item label="Pending" value="pending" />
          </Picker>
        </View>

        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Sort By</Text>
          <Picker
            selectedValue={sortBy}
            onValueChange={(v) => setSortBy(v as any)}
            style={styles.picker}
          >
            <Picker.Item label="Due Date" value="dueDate" />
            <Picker.Item label="Priority" value="priority" />
            <Picker.Item label="Title" value="title" />
          </Picker>
        </View>
      </View>

      {/* Loading */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={{ paddingBottom: 50 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  addButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },

  filterSortRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },

  pickerWrapper: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    overflow: 'hidden',
  },
  pickerLabel: { fontWeight: '600', paddingHorizontal: 10, paddingTop: 5 },
  picker: { width: '100%' },

  task: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: { fontSize: 16, fontWeight: '600' },
  dueDate: { fontSize: 12, color: '#555', marginTop: 2 },

  icons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});