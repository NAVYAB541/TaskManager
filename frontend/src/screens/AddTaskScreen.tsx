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
  SegmentedButtons,
  Surface,
  Icon,
  IconButton,
} from 'react-native-paper';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { COLORS } from '../constants/Theme';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import dayjs from 'dayjs';

type Props = NativeStackScreenProps<RootStackParamList, 'AddTask'>;
const API_URL = 'https://taskmanager-pn0w.onrender.com/tasks';

type SubtaskDraft = { title: string; description: string; estimateMinutes: string };

function inferEnergyFromTime(): 'high' | 'medium' | 'low' {
  const h = new Date().getHours();
  if (h >= 6 && h < 12) return 'high';
  if (h >= 12 && h < 18) return 'medium';
  return 'low';
}

export default function AddTaskScreen({ navigation }: Props) {
  const [title, setTitle]               = useState('');
  const [description, setDescription]   = useState('');
  const [priority, setPriority]         = useState<'low' | 'medium' | 'high'>('medium');
  const [dueDate, setDueDate]           = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagsInput, setTagsInput]       = useState('');
  const [category, setCategory]         = useState<string>('General');
  const [estimateMinutes, setEstimateMinutes] = useState('30');
  const [energy, setEnergy]             = useState<'high' | 'medium' | 'low' | null>(null);
  const [saving, setSaving]             = useState(false);

  // Subtasks
  const [subtaskDrafts, setSubtaskDrafts]     = useState<SubtaskDraft[]>([]);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [newSubTitle, setNewSubTitle]         = useState('');
  const [newSubDesc, setNewSubDesc]           = useState('');
  const [newSubEst, setNewSubEst]             = useState('30');

  const inferredEnergy = inferEnergyFromTime();

  const addSubtask = () => {
    if (!newSubTitle.trim()) return;
    setSubtaskDrafts(prev => [...prev, {
      title: newSubTitle.trim(),
      description: newSubDesc.trim(),
      estimateMinutes: newSubEst,
    }]);
    setNewSubTitle('');
    setNewSubDesc('');
    setNewSubEst('30');
    setShowSubtaskForm(false);
  };

  const removeSubtask = (index: number) => {
    setSubtaskDrafts(prev => prev.filter((_, i) => i !== index));
  };

  const addTask = async () => {
    if (!title.trim()) return;
    const parsedTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

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
          estimateMinutes: parseInt(estimateMinutes) || 30,
          energy: energy ?? inferredEnergy,
        }),
      });

      const newTask = await res.json();

      if (subtaskDrafts.length > 0) {
        await fetch(`${API_URL.replace('/tasks', '')}/tasks/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tasks: subtaskDrafts.map(s => ({
              title:           s.title,
              description:     s.description,
              category,
              priority,
              dueDate:         dueDate?.toISOString() ?? null,
              estimateMinutes: parseInt(s.estimateMinutes) || 30,
              energy:          energy ?? inferredEnergy,
              parentTaskId:    newTask.id,
            })),
          }),
        });
      }

      if (dueDate) await scheduleTaskReminder(newTask.id, title, dueDate.toISOString());
      navigation.goBack();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      <TextInput label="Title" value={title} onChangeText={setTitle}
        mode="outlined" style={styles.input} outlineColor="#ddd" activeOutlineColor={COLORS.primary} />

      <TextInput label="Description" value={description} onChangeText={setDescription}
        mode="outlined" multiline numberOfLines={3} style={styles.input}
        outlineColor="#ddd" activeOutlineColor={COLORS.primary} />

      {/* Time estimate — free input */}
      <TextInput
        label="Time estimate (minutes)"
        value={estimateMinutes}
        onChangeText={setEstimateMinutes}
        mode="outlined"
        keyboardType="number-pad"
        style={styles.input}
        outlineColor="#ddd"
        activeOutlineColor={COLORS.primary}
        left={<TextInput.Icon icon="timer-outline" />}
      />

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
      <TextInput label="Tags (comma-separated)" value={tagsInput} onChangeText={setTagsInput}
        mode="outlined" placeholder="e.g. Urgent, Shopping" style={styles.input}
        outlineColor="#ddd" activeOutlineColor={COLORS.primary}
        left={<TextInput.Icon icon="tag-multiple-outline" />} />

      {/* Due date */}
      <Text style={styles.label}>Due Date</Text>
      <Button mode="outlined" icon="calendar" onPress={() => setShowDatePicker(true)}
        style={styles.dateButton} textColor={dueDate ? COLORS.primary : '#888'}>
        {dueDate ? dayjs(dueDate).format('DD MMM YYYY') : 'Select date'}
      </Button>
      {dueDate && (
        <Button mode="text" onPress={() => setDueDate(null)} textColor={COLORS.danger}
          compact style={{ alignSelf: 'flex-end', marginTop: -8 }}>Clear</Button>
      )}
      {showDatePicker && (
        <DateTimePicker value={dueDate || new Date()} mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, date) => { setShowDatePicker(Platform.OS === 'ios'); if (date) setDueDate(date); }} />
      )}

      {/* ── Subtasks ── */}
      <View style={styles.subtasksHeader}>
        <Text style={styles.label}>Subtasks</Text>
        <Button mode="text" compact icon="plus" textColor={COLORS.primary}
          onPress={() => setShowSubtaskForm(v => !v)}>
          Add
        </Button>
      </View>

      {subtaskDrafts.map((s, i) => (
        <Surface key={i} style={styles.subtaskChip} elevation={0}>
          <View style={styles.subtaskChipIndex}>
            <Text style={styles.subtaskChipIndexText}>{i + 1}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.subtaskChipTitle}>{s.title}</Text>
            {!!s.description && <Text style={styles.subtaskChipDesc} numberOfLines={1}>{s.description}</Text>}
            <Text style={styles.subtaskChipEst}>{s.estimateMinutes} min</Text>
          </View>
          <IconButton icon="close" size={18} iconColor="#ccc" onPress={() => removeSubtask(i)} />
        </Surface>
      ))}

      {showSubtaskForm && (
        <Surface style={styles.subtaskForm} elevation={0}>
          <TextInput label="Subtask title" value={newSubTitle} onChangeText={setNewSubTitle}
            mode="outlined" style={styles.subInput} outlineColor="#ddd" activeOutlineColor={COLORS.primary} dense />
          <TextInput label="Description (optional)" value={newSubDesc} onChangeText={setNewSubDesc}
            mode="outlined" style={styles.subInput} outlineColor="#ddd" activeOutlineColor={COLORS.primary} dense />
          <TextInput label="Estimate (minutes)" value={newSubEst} onChangeText={setNewSubEst}
            mode="outlined" keyboardType="number-pad" style={styles.subInput}
            outlineColor="#ddd" activeOutlineColor={COLORS.primary} dense />
          <View style={styles.subFormActions}>
            <Button mode="text" textColor="#aaa" compact onPress={() => setShowSubtaskForm(false)}>Cancel</Button>
            <Button mode="contained" buttonColor={COLORS.primary} compact onPress={addSubtask}
              disabled={!newSubTitle.trim()}>Add subtask</Button>
          </View>
        </Surface>
      )}

      {/* AI planner prompt */}
      {title.trim().length > 0 && (
        <Surface style={styles.aiPromptCard} elevation={0}>
          <Icon source="head-cog-outline" size={22} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.aiPromptTitle}>Feeling overwhelmed?</Text>
            <Text style={styles.aiPromptSub}>Let AI break it into bite-sized steps.</Text>
          </View>
          <Button mode="contained" compact buttonColor={COLORS.primary}
            onPress={() => navigation.navigate('AIPlanner', {
              title: title.trim(), description, category, priority,
              dueDate: dueDate?.toISOString() ?? null,
            })}>
            Plan it
          </Button>
        </Surface>
      )}

      <Button mode="contained" onPress={addTask} loading={saving}
        disabled={!title.trim() || saving} style={styles.saveButton}
        contentStyle={styles.saveButtonContent} buttonColor={COLORS.primary}>
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
  segmented: { marginBottom: 16 },

  pickerSurface: { backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 16, overflow: 'hidden' },
  picker: { width: '100%' },
  dateButton: { borderColor: '#ddd', marginBottom: 8, justifyContent: 'flex-start' },

  subtasksHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },

  subtaskChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'white', borderRadius: 10, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: '#eee',
  },
  subtaskChipIndex: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary + '18', alignItems: 'center', justifyContent: 'center' },
  subtaskChipIndexText: { fontSize: 11, fontWeight: '800', color: COLORS.primary },
  subtaskChipTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  subtaskChipDesc: { fontSize: 12, color: '#888', marginTop: 1 },
  subtaskChipEst: { fontSize: 11, color: COLORS.primary, marginTop: 2 },

  subtaskForm: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  subInput: { backgroundColor: 'white', marginBottom: 8 },
  subFormActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },

  aiPromptCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.primary + '10', borderRadius: 12, padding: 14, marginBottom: 14,
  },
  aiPromptTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 2 },
  aiPromptSub: { fontSize: 12, color: '#888' },

  saveButton: { borderRadius: 10, marginTop: 4 },
  saveButtonContent: { paddingVertical: 6 },
});
