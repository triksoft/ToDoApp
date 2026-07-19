import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Switch,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// ==========================================
// TYPESCRIPT INTERFACES & TYPES
// ==========================================
type PriorityLevel = 'High' | 'Medium' | 'Low';
type FilterType = 'ALL' | 'ACTIVE' | 'COMPLETED';
type UrgencyStatus = 'OVERDUE' | 'NEARING' | 'NORMAL';

interface Task {
  _id: string;
  title: string;
  description?: string;
  deadline?: string;
  dateTime?: string;
  priority: PriorityLevel;
  completed: boolean;
}

export default function TaskList({ navigation }: any) {
  // Application State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<FilterType>('ALL');
  
  // Modal & Form State
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  
  // Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('Medium');

  // Master Schedule Switch
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  // DOB-Style Date Selector State
  const [month, setMonth] = useState('Jul');
  const [day, setDay] = useState('18');
  const [year, setYear] = useState('2026');

  // DOB-Style Time Selector State
  const [hour, setHour] = useState('10');
  const [minute, setMinute] = useState('00');
  const [ampm, setAmpm] = useState('AM');

  // Selector Data Arrays
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const days = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
  const years = ['2026', '2027', '2028', '2029', '2030'];
  const hours = ['00', ...Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))];
  const minutes = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
  const ampmList = ['AM', 'PM'];

  useEffect(() => {
    fetchTasks();
  }, []);

  // ==========================================
  // API & STATE MANAGERS
  // ==========================================
  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (err: any) {
      console.error('Error fetching tasks:', err.message);
      Alert.alert('Connection Error', 'Unable to retrieve tasks from the server.');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setPriority('Medium');
    setScheduleEnabled(false);
    setMonth('Jul');
    setDay('18');
    setYear('2026');
    setHour('10');
    setMinute('00');
    setAmpm('AM');
    setModalVisible(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTaskId(task._id);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'Medium');

    const hasSchedule = task.deadline && task.deadline !== 'No Deadline' && task.deadline !== 'N/A';
    setScheduleEnabled(!!hasSchedule);

    if (hasSchedule && task.deadline) {
      const parts = task.deadline.replace(',', '').split(' ');
      if (parts.length === 3) {
        if (months.includes(parts[0])) setMonth(parts[0]);
        if (days.includes(parts[1])) setDay(parts[1]);
        if (years.includes(parts[2])) setYear(parts[2]);
      }
    }

    if (task.dateTime && task.dateTime !== 'Unscheduled' && task.dateTime !== 'Date Only (No Time)') {
      const timeParts = task.dateTime.split(' ');
      if (timeParts.length === 2) {
        const [h, m] = timeParts[0].split(':');
        if (hours.includes(h)) setHour(h);
        if (minutes.includes(m)) setMinute(m);
        if (ampmList.includes(timeParts[1])) setAmpm(timeParts[1]);
      }
    }

    setModalVisible(true);
  };

  const handleSaveTask = async () => {
    if (!title.trim()) {
      return Alert.alert('Validation Error', 'Please enter a task title.');
    }

    setSubmitting(true);
    try {
      const formattedDeadline = scheduleEnabled ? `${month} ${day}, ${year}` : 'No Deadline';
      const formattedTime = scheduleEnabled ? `${hour}:${minute} ${ampm}` : 'Unscheduled';

      const payload = {
        title: title.trim(),
        description: description.trim() || 'No description provided.',
        deadline: formattedDeadline,
        dateTime: formattedTime,
        priority: priority,
      };

      if (editingTaskId) {
        await api.put(`/tasks/${editingTaskId}`, payload);
      } else {
        await api.post('/tasks', payload);
      }

      await fetchTasks();
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to save task to database.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setTasks(tasks.map(t => (t._id === id ? { ...t, completed: !currentStatus } : t)));

    try {
      await api.put(`/tasks/${id}`, { completed: !currentStatus });
    } catch (err) {
      setTasks(tasks.map(t => (t._id === id ? { ...t, completed: currentStatus } : t)));
      Alert.alert('Sync Error', 'Failed to update task status on the server.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    const previousTasks = [...tasks];
    setTasks(tasks.filter(t => t._id !== id));

    try {
      await api.delete(`/tasks/${id}`);
    } catch (err) {
      setTasks(previousTasks);
      Alert.alert('Error', 'Could not delete task.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to exit your workspace?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await AsyncStorage.removeItem('token');
            await AsyncStorage.removeItem('user');
            delete api.defaults.headers.common['Authorization'];

            // ⚡️ FIXED: Changed 'AuthScreen' to 'Auth' to match App.tsx exactly
            navigation.reset({
              index: 0,
              routes: [{ name: 'Auth' }], 
            });
          } catch (err) {
            console.error('Logout failed:', err);
            navigation.navigate('Auth');
          }
        },
      },
    ]);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'ACTIVE') return !task.completed;
    if (filter === 'COMPLETED') return task.completed;
    return true;
  });

  // ==========================================
  // HELPER LOGIC: ANDROID-PROOF URGENCY ENGINE
  // ==========================================
  const getUrgencyStatus = (deadline?: string, dateTime?: string, completed?: boolean): UrgencyStatus => {
    if (completed) return 'NORMAL';
    if (!deadline || deadline === 'No Deadline' || !dateTime || dateTime === 'Unscheduled') return 'NORMAL';
    
    try {
      // 1. Manually parse "Jul 18, 2026" into numerical primitives
      const cleanDeadline = deadline.replace(',', ''); // "Jul 18 2026"
      const [mStr, dStr, yStr] = cleanDeadline.split(' ');
      const monthIdx = months.indexOf(mStr);
      const dayVal = parseInt(dStr, 10);
      const yearVal = parseInt(yStr, 10);

      if (monthIdx === -1 || isNaN(dayVal) || isNaN(yearVal)) return 'NORMAL';

      // 2. Default to end of day (23:59) if no specific time was set
      let hourVal = 23;
      let minuteVal = 59;

      // 3. Manually parse "10:00 AM" into 24-hour military integers
      if (dateTime && dateTime !== 'Unscheduled' && dateTime !== 'Date Only (No Time)') {
        const timeParts = dateTime.split(' ');
        if (timeParts.length === 2) {
          const [hStr, minStr] = timeParts[0].split(':');
          let h = parseInt(hStr, 10);
          const m = parseInt(minStr, 10);
          if (!isNaN(h) && !isNaN(m)) {
            if (timeParts[1] === 'PM' && h < 12) h += 12;
            if (timeParts[1] === 'AM' && h === 12) h = 0;
            hourVal = h;
            minuteVal = m;
          }
        }
      }

      // 4. Build exact integer Date object (Never fails on Android Hermes)
      const taskDate = new Date(yearVal, monthIdx, dayVal, hourVal, minuteVal);
      const now = new Date();
      const diffInMilliseconds = taskDate.getTime() - now.getTime();
      const diffInHours = diffInMilliseconds / (1000 * 60 * 60);

      if (diffInMilliseconds < 0) return 'OVERDUE';
      if (diffInHours <= 24) return 'NEARING';
      return 'NORMAL';
    } catch (err) {
      return 'NORMAL';
    }
  };

  const getPriorityBadgeStyle = (level: PriorityLevel) => {
    switch (level) {
      case 'High': return { bg: '#fef2f2', text: '#ef4444', border: '#fecaca' };
      case 'Medium': return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
      case 'Low': return { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' };
      default: return { bg: '#f8fafc', text: '#64748b', border: '#e2e8f0' };
    }
  };

  // ==========================================
  // RENDER HELPERS
  // ==========================================
  const renderTaskCard = ({ item }: { item: Task }) => {
    const urgency = getUrgencyStatus(item.deadline, item.dateTime, item.completed);
    const priorityStyle = getPriorityBadgeStyle(item.priority);

    // Apply specific border and background styling based on urgency state
    let cardStyle: any = styles.card;
    if (item.completed) {
      cardStyle = [styles.card, styles.cardCompleted];
    } else if (urgency === 'OVERDUE') {
      cardStyle = [styles.card, styles.cardOverdue];
    } else if (urgency === 'NEARING') {
      cardStyle = [styles.card, styles.cardNearing];
    }

    return (
      <View style={cardStyle}>
        <View style={styles.cardHeader}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => handleToggleStatus(item._id, item.completed)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, item.completed && styles.checkboxChecked]}>
              {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cardBodyTouchable}
            onPress={() => openEditModal(item)}
            activeOpacity={0.6}
          >
            <Text style={[styles.cardTitle, item.completed && styles.textCompleted]}>
              {item.title}
            </Text>
            <Text style={styles.editHint}>✎ Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => handleDeleteTask(item._id)} style={styles.deleteBtn}>
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => openEditModal(item)} activeOpacity={0.8}>
          <Text style={[styles.cardDescription, item.completed && styles.textCompleted]} numberOfLines={2}>
            {item.description || 'No description provided.'}
          </Text>

          <View style={styles.cardFooter}>
            {/* 🚨 Overdue Warning Badge */}
            {urgency === 'OVERDUE' && (
              <View style={styles.overdueBadge}>
                <Text style={styles.overdueText}>🚨 OVERDUE</Text>
              </View>
            )}

            {/* ⏳ Nearing (Due Soon) Warning Badge */}
            {urgency === 'NEARING' && (
              <View style={styles.nearingBadge}>
                <Text style={styles.nearingText}>⏳ DUE SOON</Text>
              </View>
            )}

            <View style={[styles.metaBadge, { backgroundColor: priorityStyle.bg, borderColor: priorityStyle.border }]}>
              <Text style={[styles.metaValue, { color: priorityStyle.text, fontWeight: '700' }]}>
                ⚡ {item.priority || 'Medium'}
              </Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>📅 </Text>
              <Text style={styles.metaValue}>{item.deadline || 'No Deadline'}</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaLabel}>🕒 </Text>
              <Text style={styles.metaValue}>{item.dateTime || 'Unscheduled'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />

      {/* Hardware-Protected Navigation Bar */}
      <View style={styles.navbar}>
        <View>
          <Text style={styles.navTitle}>Task Dashboard</Text>
          <Text style={styles.navSubtitle}>
            {tasks.filter(t => !t.completed).length} active • {tasks.length} total
          </Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>

      {/* Toolbar with Filtering Tabs & Creation Trigger */}
      <View style={styles.toolbar}>
        <View style={styles.tabs}>
          {(['ALL', 'ACTIVE', 'COMPLETED'] as FilterType[]).map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, filter === tab && styles.tabActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab.charAt(0) + tab.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={openCreateModal}>
          <Text style={styles.createBtnText}>+ New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Main Task List Display */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading workspace data...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTasks}
          keyExtractor={item => item._id}
          renderItem={renderTaskCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No tasks found</Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'ALL'
                  ? 'Click "+ New Task" above to create your first structured assignment.'
                  : `You have no ${filter.toLowerCase()} tasks at this time.`}
              </Text>
            </View>
          }
        />
      )}

      {/* ========================================== */}
      {/* UNIFIED CREATE / EDIT DETAILS MODAL        */}
      {/* ========================================== */}
      <Modal visible={modalVisible} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editingTaskId ? 'Edit Task Details' : 'Create New Task'}
            </Text>
            <Text style={styles.modalSubtitle}>
              {editingTaskId ? 'Modify your assignment settings below.' : 'Select assignment details below.'}
            </Text>

            <ScrollView 
              style={styles.formScroll} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Task Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Deploy Q3 Database Migration"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />

              {/* Priority Selection Pills */}
              <Text style={styles.label}>Priority Level</Text>
              <View style={styles.pillRow}>
                {(['High', 'Medium', 'Low'] as PriorityLevel[]).map(level => {
                  const isActive = priority === level;
                  const activeStyle = getPriorityBadgeStyle(level);
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[
                        styles.pillBtn,
                        isActive && { backgroundColor: activeStyle.bg, borderColor: activeStyle.text, borderWidth: 1.5 }
                      ]}
                      onPress={() => setPriority(level)}
                    >
                      <Text style={[styles.pillBtnText, isActive && { color: activeStyle.text, fontWeight: '700' }]}>
                        {level}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Master Schedule Switch */}
              <View style={styles.switchRow}>
                <View>
                  <Text style={styles.switchLabel}>Schedule Task (Date & Time)</Text>
                  <Text style={styles.switchSublabel}>
                    {scheduleEnabled ? 'Date & Time scheduling enabled' : 'Unscheduled (No due date or time)'}
                  </Text>
                </View>
                <Switch
                  value={scheduleEnabled}
                  onValueChange={setScheduleEnabled}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={scheduleEnabled ? '#2563eb' : '#f1f5f9'}
                />
              </View>

              {/* Only reveals when Master Schedule Switch is ON */}
              {scheduleEnabled && (
                <View>
                  {/* DOB-STYLE DATE SELECTOR (Month | Day | Year) */}
                  <Text style={styles.label}>Due Date (MM / DD / YYYY)</Text>
                  <View style={styles.dobContainer}>
                    <View style={styles.dobColumn}>
                      <Text style={styles.dobHeader}>Month</Text>
                      <ScrollView style={styles.dobScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                        {months.map(item => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dobItem, month === item && styles.dobItemActive]}
                            onPress={() => setMonth(item)}
                          >
                            <Text style={[styles.dobItemText, month === item && styles.dobTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.dobColumn}>
                      <Text style={styles.dobHeader}>Day</Text>
                      <ScrollView style={styles.dobScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                        {days.map(item => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dobItem, day === item && styles.dobItemActive]}
                            onPress={() => setDay(item)}
                          >
                            <Text style={[styles.dobItemText, day === item && styles.dobTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.dobColumn}>
                      <Text style={styles.dobHeader}>Year</Text>
                      <ScrollView style={styles.dobScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                        {years.map(item => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dobItem, year === item && styles.dobItemActive]}
                            onPress={() => setYear(item)}
                          >
                            <Text style={[styles.dobItemText, year === item && styles.dobTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>

                  {/* DOB-STYLE TIME SELECTOR (Hour | Min | AM/PM) */}
                  <Text style={styles.label}>Schedule Time (HH : MM : AM/PM)</Text>
                  <View style={styles.dobContainer}>
                    <View style={styles.dobColumn}>
                      <Text style={styles.dobHeader}>Hour (00-12)</Text>
                      <ScrollView style={styles.dobScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                        {hours.map(item => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dobItem, hour === item && styles.dobItemActive]}
                            onPress={() => setHour(item)}
                          >
                            <Text style={[styles.dobItemText, hour === item && styles.dobTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.dobColumn}>
                      <Text style={styles.dobHeader}>Minute</Text>
                      <ScrollView style={styles.dobScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                        {minutes.map(item => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dobItem, minute === item && styles.dobItemActive]}
                            onPress={() => setMinute(item)}
                          >
                            <Text style={[styles.dobItemText, minute === item && styles.dobTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>

                    <View style={styles.dobColumn}>
                      <Text style={styles.dobHeader}>Period</Text>
                      <ScrollView style={styles.dobScroll} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
                        {ampmList.map(item => (
                          <TouchableOpacity
                            key={item}
                            style={[styles.dobItem, ampm === item && styles.dobItemActive]}
                            onPress={() => setAmpm(item)}
                          >
                            <Text style={[styles.dobItemText, ampm === item && styles.dobTextActive]}>{item}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  </View>
                </View>
              )}

              <Text style={styles.label}>Description & Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add technical requirements or links..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={description}
                onChangeText={setDescription}
              />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={submitting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.btnDisabled]}
                onPress={handleSaveTask}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>
                    {editingTaskId ? 'Update Task' : 'Save Task'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ==========================================
// STYLES & HARDWARE DESIGN TOKENS
// ==========================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 54,
    paddingBottom: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  navTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  navSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f1f5f9',
  },
  logoutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#0f172a',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  createBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  listContainer: {
    padding: 20,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardCompleted: {
    backgroundColor: '#f8fafc',
    borderColor: '#f1f5f9',
  },
  // 🚨 OVERDUE: Bold 2px Red border and subtle pinkish background tint
  cardOverdue: {
    borderWidth: 2,
    borderColor: '#ef4444',
    backgroundColor: '#fffcfc',
  },
  // ⏳ NEARING: Bold 2px Orange/Amber border and subtle warm cream tint
  cardNearing: {
    borderWidth: 2,
    borderColor: '#f97316',
    backgroundColor: '#fffaf5',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkboxContainer: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  checkmark: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: 'bold',
  },
  cardBodyTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    flex: 1,
  },
  editHint: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginLeft: 6,
  },
  cardDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
    paddingLeft: 32,
  },
  textCompleted: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
  },
  deleteBtn: {
    paddingLeft: 10,
    paddingVertical: 4,
  },
  deleteIcon: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingLeft: 32,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  // 🚨 Overdue Warning Badge
  overdueBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ef4444',
  },
  // ⏳ Nearing Warning Badge
  nearingBadge: {
    backgroundColor: '#ffedd5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  nearingText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ea580c',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  metaValue: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  // Modal & Form Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxHeight: '88%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  formScroll: {
    maxHeight: 400,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0f172a',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  // DOB-Style Grid Pickers
  dobContainer: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 8,
    marginTop: 4,
  },
  dobColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dobHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dobScroll: {
    height: 100,
    width: '100%',
  },
  dobItem: {
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
    marginVertical: 1,
  },
  dobItemActive: {
    backgroundColor: '#2563eb',
  },
  dobItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '500',
  },
  dobTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  // Schedule Switch Row
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 14,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  switchSublabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
    fontSize: 14,
  },
  submitBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#2563eb',
    minWidth: 100,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
});