import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Task, Todo } from '../../src/types';
import { loadTasks, addTask, updateTask, deleteTask, loadTodos, addTodo, updateTodo, deleteTodo } from '../../src/services/storage';

const PRIORITY_COLORS: Record<string, string> = {
  urgent_important: '#ef4444',
  important: '#f59e0b',
  urgent: '#f97316',
  normal: '#94a3b8',
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent_important: '紧急重要',
  important: '重要',
  urgent: '紧急',
  normal: '普通',
};

export default function HomeScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showAddTodo, setShowAddTodo] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskPriority, setNewTaskPriority] = useState('normal');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [view, setView] = useState<'tasks' | 'todos'>('tasks');

  const loadData = useCallback(async () => {
    const [t, td] = await Promise.all([loadTasks(), loadTodos()]);
    setTasks(t);
    setTodos(td);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;
    await addTask({ name: newTaskName.trim(), time: newTaskTime, priority: newTaskPriority as Task['priority'] });
    setNewTaskName('');
    setShowAddTask(false);
    await loadData();
  };

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;
    await addTodo(newTodoTitle.trim());
    setNewTodoTitle('');
    setShowAddTodo(false);
    await loadData();
  };

  const handleToggleTask = async (task: Task) => {
    await updateTask(task.id, { done: !task.done });
    await loadData();
  };

  const handleToggleTodo = async (todo: Todo) => {
    await updateTodo(todo.id, { status: todo.status === 'done' ? 'todo' : 'done' });
    await loadData();
  };

  const handleDeleteTask = (id: string) => {
    Alert.alert('删除', '确定删除这个任务？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { await deleteTask(id); await loadData(); } },
    ]);
  };

  const handleDeleteTodo = (id: string) => {
    Alert.alert('删除', '确定删除这个待做事项？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: async () => { await deleteTodo(id); await loadData(); } },
    ]);
  };

  const pendingTasks = tasks.filter(t => !t.done);
  const activeTodos = todos.filter(t => t.status !== 'done');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>每日提醒</Text>
        <Text style={styles.headerDate}>
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: '#6C5CE7' }]}>
          <Text style={styles.statValue}>{pendingTasks.length}</Text>
          <Text style={styles.statLabel}>待办任务</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#00b894' }]}>
          <Text style={styles.statValue}>{activeTodos.length}</Text>
          <Text style={styles.statLabel}>待做事项</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#fdcb6e' }]}>
          <Text style={styles.statValue}>{tasks.filter(t => t.done).length}</Text>
          <Text style={styles.statLabel}>今日完成</Text>
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'tasks' && styles.toggleActive]}
          onPress={() => setView('tasks')}
        >
          <Text style={[styles.toggleText, view === 'tasks' && styles.toggleTextActive]}>任务</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, view === 'todos' && styles.toggleActive]}
          onPress={() => setView('todos')}
        >
          <Text style={[styles.toggleText, view === 'todos' && styles.toggleTextActive]}>待做事项</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => view === 'tasks' ? setShowAddTask(true) : setShowAddTodo(true)}
        >
          <Text style={styles.addBtnText}>+ 添加</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {view === 'tasks' ? (
          tasks.length === 0 ? (
            <Text style={styles.empty}>暂无任务，点击上方添加</Text>
          ) : (
            tasks.map(task => (
              <TouchableOpacity
                key={task.id}
                style={styles.item}
                onPress={() => handleToggleTask(task)}
                onLongPress={() => handleDeleteTask(task.id)}
              >
                <View style={[styles.checkbox, task.done && styles.checked]}>
                  {task.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, task.done && styles.itemDone]}>{task.name}</Text>
                  <View style={styles.itemMeta}>
                    {task.time ? <Text style={styles.metaText}>⏰ {task.time}</Text> : null}
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] || '#94a3b8' }]} />
                    <Text style={styles.metaText}>{PRIORITY_LABELS[task.priority] || '普通'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        ) : (
          todos.length === 0 ? (
            <Text style={styles.empty}>暂无待做事项，点击上方添加</Text>
          ) : (
            todos.map(todo => (
              <TouchableOpacity
                key={todo.id}
                style={styles.item}
                onPress={() => handleToggleTodo(todo)}
                onLongPress={() => handleDeleteTodo(todo.id)}
              >
                <View style={[styles.checkbox, todo.status === 'done' && styles.checked]}>
                  {todo.status === 'done' && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, todo.status === 'done' && styles.itemDone]}>{todo.title}</Text>
                  <View style={styles.itemMeta}>
                    <View style={[styles.statusBadge, { backgroundColor: todo.status === 'in_progress' ? '#6C5CE720' : '#94a3b820' }]}>
                      <Text style={[styles.statusText, { color: todo.status === 'in_progress' ? '#6C5CE7' : '#94a3b8' }]}>
                        {todo.status === 'in_progress' ? '进行中' : '待做'}
                      </Text>
                    </View>
                    {todo.category ? (
                      <View style={[styles.statusBadge, { backgroundColor: '#00b89420' }]}>
                        <Text style={[styles.statusText, { color: '#00b894' }]}>{todo.category}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )
        )}
      </ScrollView>

      {/* Add Task Modal */}
      <Modal visible={showAddTask} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>添加任务</Text>
            <TextInput
              style={styles.input}
              placeholder="任务名称"
              placeholderTextColor="#94a3b8"
              value={newTaskName}
              onChangeText={setNewTaskName}
            />
            <TextInput
              style={styles.input}
              placeholder="时间 (如 09:00)"
              placeholderTextColor="#94a3b8"
              value={newTaskTime}
              onChangeText={setNewTaskTime}
            />
            <View style={styles.priorityRow}>
              {['normal', 'important', 'urgent', 'urgent_important'].map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, newTaskPriority === p && styles.priorityActive]}
                  onPress={() => setNewTaskPriority(p)}
                >
                  <Text style={styles.priorityText}>{PRIORITY_LABELS[p]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddTask(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTask}>
                <Text style={styles.saveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Todo Modal */}
      <Modal visible={showAddTodo} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>添加待做事项</Text>
            <TextInput
              style={styles.input}
              placeholder="要做什么..."
              placeholderTextColor="#94a3b8"
              value={newTodoTitle}
              onChangeText={setNewTodoTitle}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddTodo(false)}>
                <Text style={styles.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAddTodo}>
                <Text style={styles.saveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  headerDate: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    borderLeftWidth: 3,
  },
  statValue: { fontSize: 28, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12, gap: 8 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1a1a2e' },
  toggleActive: { backgroundColor: '#6C5CE7' },
  toggleText: { fontSize: 13, color: '#94a3b8' },
  toggleTextActive: { color: '#fff', fontWeight: '600' },
  addBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#6C5CE7' },
  addBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  list: { flex: 1, paddingHorizontal: 16 },
  empty: { textAlign: 'center', color: '#94a3b8', padding: 40, fontSize: 14 },
  item: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e',
    borderRadius: 12, padding: 14, marginBottom: 8,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#94a3b8',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  checked: { backgroundColor: '#6C5CE7', borderColor: '#6C5CE7' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, color: '#fff', fontWeight: '500' },
  itemDone: { textDecorationLine: 'line-through', color: '#94a3b8' },
  itemMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  metaText: { fontSize: 11, color: '#94a3b8' },
  priorityDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  input: {
    backgroundColor: '#2a2a4a', borderRadius: 10, padding: 12, color: '#fff',
    fontSize: 14, marginBottom: 12, borderWidth: 1, borderColor: '#3a3a5a',
  },
  priorityRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  priorityBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#2a2a4a' },
  priorityActive: { backgroundColor: '#6C5CE7' },
  priorityText: { fontSize: 12, color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  cancelText: { color: '#94a3b8', fontSize: 14 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#6C5CE7' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
