import React, { useState } from 'react';
import { scheduleTaskReminder } from '../utils/notifications';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/Theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { MaterialIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTask'>;
const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';

const ESTIMATE_PRESETS = [5, 15, 30, 60] as const;
const ENERGY_OPTIONS: { label: string; value: 'high' | 'medium' | 'low' }[] = [
  { label: '⚡ High', value: 'high' },
  { label: '🌤 Medium', value: 'medium' },
  { label: '🌙 Low', value: 'low' },
];

function inferEnergyFromTime(): 'high' | 'medium' | 'low' {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'high';
  if (h >= 12 && h < 18) return 'medium';
  return 'low';
}

export default function AddTaskScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagsInput, setTagsInput] = useState('');
  const [category, setCategory] = useState<string>('General');
  const [estimateMinutes, setEstimateMinutes] = useState<number>(30);
  const [energy, setEnergy] = useState<'high' | 'medium' | 'low' | null>(null);
  const [nextAction, setNextAction] = useState('');

  const inferredEnergy = inferEnergyFromTime();

  const addTask = async () => {
    if (!title.trim()) return Alert.alert('Validation', 'Task title is required');

    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate?.toISOString(),
          completed: false,
          category: category.trim() || 'General',
          tags: parsedTags,
          estimateMinutes,
          energy: energy ?? inferredEnergy,
          nextAction: nextAction.trim(),
        }),
      });

      const newTask = await res.json();

      if (dueDate) {
        await scheduleTaskReminder(newTask.id, title, dueDate.toISOString());
      }

      navigation.goBack();
    } catch {
      Alert.alert('Error', 'Could not add task');
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.label}>Title</Text>
      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="Enter task title"
        style={styles.input}
        accessibilityLabel="Task title input"
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="Enter description"
        style={[styles.input, { height: 80 }]}
        multiline
        accessibilityLabel="Task description input"
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
      <Text style={styles.label}>
        Energy Required
        <Text style={styles.labelHint}>  (inferred: {inferredEnergy} if skipped)</Text>
      </Text>
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
      <Text style={styles.label}>
        Next Action
        <Text style={styles.labelHint}>  (optional — first concrete step)</Text>
      </Text>
      <TextInput
        value={nextAction}
        onChangeText={setNextAction}
        placeholder="e.g. Open doc and write intro paragraph"
        style={styles.input}
        accessibilityLabel="Next action input"
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
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
        accessibilityLabel="Select due date"
      >
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

      <TouchableOpacity style={styles.saveButton} onPress={addTask} accessibilityLabel="Save task">
        <Text style={styles.saveButtonText}>Save Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: COLORS.background },
  label: { fontWeight: '600', marginBottom: 6 },
  labelHint: { fontWeight: '400', color: '#999', fontSize: 12 },
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

  // Estimate presets
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

  // Energy selector
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
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});
