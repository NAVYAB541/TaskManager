import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, Task } from '../types';
import { COLORS } from '../constants/Theme';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { cancelTaskReminder, scheduleTaskReminder } from '../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetails'>;
const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';

const ESTIMATE_PRESETS = [5, 15, 30, 60] as const;
const ENERGY_OPTIONS: { label: string; value: 'high' | 'medium' | 'low' }[] = [
  { label: '⚡ High', value: 'high' },
  { label: '🌤 Medium', value: 'medium' },
  { label: '🌙 Low', value: 'low' },
];

export default function TaskDetailsScreen({ navigation, route }: Props) {
  const { task } = route.params;
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || '');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(task.priority || 'medium');
  const [dueDate, setDueDate] = useState<Date | null>(task.dueDate ? new Date(task.dueDate) : null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [completed, setCompleted] = useState(task.completed);
  const [tagsInput, setTagsInput] = useState(task.tags?.join(', ') ?? '');
  const [category, setCategory] = useState(task.category || 'General');
  const [estimateMinutes, setEstimateMinutes] = useState<number>(task.estimateMinutes ?? 30);
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low' | null>(task.energy ?? null);
  const [nextAction, setNextAction] = useState(task.nextAction ?? '');

  const updateTask = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Task title is required');

    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      await fetch(`${API_URL}/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate?.toISOString() || null,
          completed,
          category: category.trim() || 'General',
          tags: parsedTags,
          estimateMinutes,
          energy,
          nextAction: nextAction.trim(),
        }),
      });

      if (completed) {
        await cancelTaskReminder(task.id);
      } else if (dueDate) {
        await scheduleTaskReminder(task.id, title, dueDate.toISOString());
      }

      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not update task');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Task Title"
        style={styles.input}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Task Description"
        multiline
        style={[styles.input, { height: 80 }]}
      />

      {/* ── Estimate ── */}
      <Text style={styles.label}>Time Estimate</Text>
      <View style={styles.presetsRow}>
        {ESTIMATE_PRESETS.map(mins => (
          <TouchableOpacity
            key={mins}
            style={[styles.presetBtn, estimateMinutes === mins && styles.presetBtnActive]}
            onPress={() => setEstimateMinutes(mins)}
          >
            <Text style={[styles.presetBtnText, estimateMinutes === mins && styles.presetBtnTextActive]}>
              {mins} min
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Energy (optional) ── */}
      <Text style={styles.label}>Energy Required</Text>
      <View style={styles.energyRow}>
        {ENERGY_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.energyBtn, energy === opt.value && styles.energyBtnActive]}
            onPress={() => setEnergy(energy === opt.value ? null : opt.value)}
          >
            <Text style={[styles.energyBtnText, energy === opt.value && styles.energyBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Next Action (optional) ── */}
      <Text style={styles.label}>Next Action</Text>
      <TextInput
        value={nextAction}
        onChangeText={setNextAction}
        placeholder="First concrete step..."
        style={styles.input}
      />

      <Text style={styles.label}>Priority</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={priority}
          onValueChange={(v) => setPriority(v as any)}
          style={styles.picker}
        >
          <Picker.Item label="Low" value="low" />
          <Picker.Item label="Medium" value="medium" />
          <Picker.Item label="High" value="high" />
        </Picker>
      </View>

      <Text style={styles.label}>Category</Text>
      <View style={styles.pickerContainer}>
        <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
          <Picker.Item label="General" value="General" />
          <Picker.Item label="Work" value="Work" />
          <Picker.Item label="Personal" value="Personal" />
          <Picker.Item label="Study" value="Study" />
        </Picker>
      </View>

      <Text style={styles.label}>Tags (comma-separated)</Text>
      <TextInput
        value={tagsInput}
        onChangeText={setTagsInput}
        placeholder="e.g., Urgent, Shopping"
        style={styles.input}
      />

      <Text style={styles.label}>Due Date</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
        <MaterialIcons name="calendar-today" size={20} color="white" style={{ marginRight: 8 }} />
        <Text style={{ color: 'white' }}>
          {dueDate ? dayjs(dueDate).format('DD MMM YYYY') : 'Select Date'}
        </Text>
      </TouchableOpacity>

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(e, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setDueDate(date);
          }}
        />
      )}

      <View style={styles.switchRow}>
        <Text style={{ fontWeight: '600' }}>Completed</Text>
        <Switch
          value={completed}
          onValueChange={setCompleted}
          trackColor={{ true: COLORS.primary }}
        />
      </View>

      <TouchableOpacity style={styles.saveButton} onPress={updateTask}>
        <Text style={styles.saveButtonText}>Update Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  label: { fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  pickerContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: { width: '100%' },

  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  presetBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  presetBtnText: { fontSize: 13, fontWeight: '700', color: '#aaa' },
  presetBtnTextActive: { color: COLORS.primary },

  energyRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  energyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'white',
    alignItems: 'center',
  },
  energyBtnActive: { borderColor: COLORS.secondary, backgroundColor: COLORS.secondary + '15' },
  energyBtnText: { fontSize: 12, fontWeight: '700', color: '#aaa' },
  energyBtnTextActive: { color: COLORS.secondary },

  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
