import React, { useState } from 'react';
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
  Switch,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/Theme';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import dayjs from 'dayjs';
import { cancelTaskReminder, scheduleTaskReminder } from '../utils/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskDetails'>;
const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';

const ESTIMATE_PRESETS = [5, 15, 30, 60] as const;

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
  const [saving, setSaving] = useState(false);

  const updateTask = async () => {
    if (!title.trim()) return;

    const parsedTags = tagsInput
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    try {
      setSaving(true);
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
      // error handled silently
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
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
      <Text style={styles.label}>Energy Required</Text>
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
        label="Next Action"
        value={nextAction}
        onChangeText={setNextAction}
        mode="outlined"
        placeholder="First concrete step..."
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
          <Picker.Item label="General"  value="General" />
          <Picker.Item label="Work"     value="Work" />
          <Picker.Item label="Personal" value="Personal" />
          <Picker.Item label="Study"    value="Study" />
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

      {/* Completed toggle */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Mark as Completed</Text>
        <Switch
          value={completed}
          onValueChange={setCompleted}
          color={COLORS.primary}
        />
      </View>

      {/* Save */}
      <Button
        mode="contained"
        onPress={updateTask}
        loading={saving}
        disabled={!title.trim() || saving}
        style={styles.saveButton}
        contentStyle={styles.saveButtonContent}
        buttonColor={COLORS.primary}
      >
        Update Task
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 48 },

  input: { backgroundColor: 'white', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },

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

  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  switchLabel: { fontSize: 15, fontWeight: '600', color: '#333' },

  saveButton: { borderRadius: 10, marginTop: 4 },
  saveButtonContent: { paddingVertical: 6 },
});
