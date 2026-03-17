import React, { useState } from 'react';
import { scheduleTaskReminder } from '../utils/notifications';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import {
  TextInput,
  Button,
  Chip,
  SegmentedButtons,
  Surface,
  Icon,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/Theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTask'>;
const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';

const ESTIMATE_PRESETS = [5, 15, 30, 60] as const;

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
  const [saving, setSaving] = useState(false);

  const inferredEnergy = inferEnergyFromTime();

  const addTask = async () => {
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      setSaving(true);
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
      // error handled silently — button re-enables
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Title */}
      <TextInput
        label="Title"
        value={title}
        onChangeText={setTitle}
        mode="outlined"
        style={styles.input}
        outlineColor="#ddd"
        activeOutlineColor={COLORS.primary}
      />

      {/* Description */}
      <TextInput
        label="Description"
        value={description}
        onChangeText={setDescription}
        mode="outlined"
        multiline
        numberOfLines={3}
        style={styles.input}
        outlineColor="#ddd"
        activeOutlineColor={COLORS.primary}
      />

      {/* Time estimate */}
      <Text style={styles.label}>Time Estimate</Text>
      <View style={styles.presetsRow}>
        {ESTIMATE_PRESETS.map(mins => (
          <Chip
            key={mins}
            selected={estimateMinutes === mins}
            onPress={() => setEstimateMinutes(mins)}
            selectedColor={COLORS.primary}
            style={styles.presetChip}
            showSelectedCheck={false}
          >
            {mins} min
          </Chip>
        ))}
      </View>

      {/* Energy */}
      <Text style={styles.label}>
        Energy Required
        <Text style={styles.labelHint}>  · inferred: {inferredEnergy} if skipped</Text>
      </Text>
      <SegmentedButtons
        value={energy ?? ''}
        onValueChange={v => setEnergy(v === energy ? null : v as any)}
        buttons={[
          { value: 'high',   label: 'High',   icon: 'lightning-bolt' },
          { value: 'medium', label: 'Medium', icon: 'weather-partly-cloudy' },
          { value: 'low',    label: 'Low',    icon: 'weather-night' },
        ]}
        style={styles.segmented}
      />

      {/* Next action */}
      <TextInput
        label="Next Action (optional)"
        value={nextAction}
        onChangeText={setNextAction}
        mode="outlined"
        placeholder="e.g. Open doc and write intro paragraph"
        style={styles.input}
        outlineColor="#ddd"
        activeOutlineColor={COLORS.primary}
        left={<TextInput.Icon icon="arrow-right-circle-outline" />}
      />

      {/* Priority */}
      <Text style={styles.label}>Priority</Text>
      <SegmentedButtons
        value={priority}
        onValueChange={v => setPriority(v as any)}
        buttons={[
          { value: 'low',    label: 'Low',    icon: 'chevron-down' },
          { value: 'medium', label: 'Medium', icon: 'minus' },
          { value: 'high',   label: 'High',   icon: 'chevron-up' },
        ]}
        style={styles.segmented}
      />

      {/* Category */}
      <Text style={styles.label}>Category</Text>
      <Surface style={styles.pickerSurface} elevation={0}>
        <Picker selectedValue={category} onValueChange={setCategory} style={styles.picker}>
          <Picker.Item label="General" value="General" />
          <Picker.Item label="Work"    value="Work" />
          <Picker.Item label="Personal" value="Personal" />
          <Picker.Item label="Study"  value="Study" />
        </Picker>
      </Surface>

      {/* Tags */}
      <TextInput
        label="Tags (comma-separated)"
        value={tagsInput}
        onChangeText={setTagsInput}
        mode="outlined"
        placeholder="e.g. Urgent, Shopping"
        style={styles.input}
        outlineColor="#ddd"
        activeOutlineColor={COLORS.primary}
        left={<TextInput.Icon icon="tag-multiple-outline" />}
      />

      {/* Due date */}
      <Text style={styles.label}>Due Date</Text>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={() => setShowDatePicker(true)}
        style={styles.dateButton}
        textColor={dueDate ? COLORS.primary : '#888'}
      >
        {dueDate ? dayjs(dueDate).format('DD MMM YYYY') : 'Select date'}
      </Button>
      {dueDate && (
        <Button
          mode="text"
          onPress={() => setDueDate(null)}
          textColor={COLORS.danger}
          compact
          style={{ alignSelf: 'flex-end', marginTop: -8 }}
        >
          Clear
        </Button>
      )}

      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) setDueDate(date);
          }}
        />
      )}

      {/* Save */}
      <Button
        mode="contained"
        onPress={addTask}
        loading={saving}
        disabled={!title.trim() || saving}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
        buttonColor={COLORS.primary}
      >
        Save Task
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 48 },

  input: { backgroundColor: 'white', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  labelHint: { fontSize: 12, fontWeight: '400', color: '#aaa' },

  presetsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  presetChip: { flex: 1, justifyContent: 'center' },

  segmented: { marginBottom: 16 },

  pickerSurface: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 16,
    overflow: 'hidden',
  },
  picker: { width: '100%' },

  dateButton: {
    borderColor: '#ddd',
    marginBottom: 8,
    justifyContent: 'flex-start',
  },

  saveButton: { borderRadius: 10, marginTop: 8 },
  saveButtonContent: { paddingVertical: 6 },
});
