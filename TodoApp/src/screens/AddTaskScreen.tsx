import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import api from '../services/api';

export default function AddTaskScreen({ navigation }: any) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [category, setCategory] = useState('General');
  const [daysToDeadline, setDaysToDeadline] = useState('1');

  const handleCreate = async () => {
    if (!title || !description) {
      return Alert.alert('Error', 'Please fill in title and description');
    }

    const now = new Date();
    const deadline = new Date();
    deadline.setDate(now.getDate() + parseInt(daysToDeadline || '1', 10));

    try {
      await api.post('/tasks', {
        title,
        description,
        priority,
        category,
        dateTime: now,
        deadline
      });
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not save task');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Task Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="What needs to be done?" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, { height: 90, textAlignVertical: 'top' }]} value={description} onChangeText={setDescription} multiline placeholder="Add details..." placeholderTextColor="#64748b" />

      <Text style={styles.label}>Category / Tag</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Work, Personal, Study..." placeholderTextColor="#64748b" />

      <Text style={styles.label}>Deadline (Days from now)</Text>
      <TextInput style={styles.input} value={daysToDeadline} onChangeText={setDaysToDeadline} keyboardType="numeric" placeholderTextColor="#64748b" />

      <Text style={styles.label}>Priority Level</Text>
      <View style={styles.priorityContainer}>
        {(['High', 'Medium', 'Low'] as const).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.priorityBtn, priority === p && styles.priorityBtnActive]}
            onPress={() => setPriority(p)}
          >
            <Text style={{ color: priority === p ? '#fff' : '#94a3b8', fontWeight: 'bold' }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.submitBtn} onPress={handleCreate}>
        <Text style={styles.submitText}>Save Task</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 20 },
  label: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 16 },
  input: { backgroundColor: '#1e293b', color: '#f8fafc', padding: 14, borderRadius: 8, fontSize: 16 },
  priorityContainer: { flexDirection: 'row', gap: 10, marginTop: 5 },
  priorityBtn: { flex: 1, padding: 14, backgroundColor: '#1e293b', borderRadius: 8, alignItems: 'center' },
  priorityBtnActive: { backgroundColor: '#3b82f6' },
  submitBtn: { backgroundColor: '#10b981', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 35, marginBottom: 40 },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});