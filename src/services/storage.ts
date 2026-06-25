import AsyncStorage from '@react-native-async-storage/async-storage';
import { Task, Todo, AppConfig } from '../types';

// ============ Generic helpers ============

async function getJSON<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

// ============ Tasks ============

const TASKS_KEY = 'daily_tasks';

export async function loadTasks(): Promise<Task[]> {
  return getJSON<Task[]>(TASKS_KEY, []);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await setJSON(TASKS_KEY, tasks);
}

export async function addTask(task: Partial<Task>): Promise<Task> {
  const tasks = await loadTasks();
  const newTask: Task = {
    id: Math.random().toString(36).slice(2, 10),
    name: task.name || '',
    time: task.time || '',
    repeat: task.repeat || '每天',
    done: false,
    status: '未进行',
    note: task.note || '',
    priority: task.priority || 'normal',
    group: task.group || '默认',
    deadline: task.deadline || '',
    start_date: task.start_date || new Date().toISOString().slice(0, 10),
    created: new Date().toISOString(),
    completed_at: null,
    parent_id: task.parent_id || '',
  };
  tasks.unshift(newTask);
  await saveTasks(tasks);
  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const tasks = await loadTasks();
  const idx = tasks.findIndex(t => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...updates };
  if (updates.done === true) {
    tasks[idx].status = '已完成';
    tasks[idx].completed_at = new Date().toISOString();
  } else if (updates.done === false) {
    tasks[idx].status = '未进行';
    tasks[idx].completed_at = null;
  }
  await saveTasks(tasks);
  return tasks[idx];
}

export async function deleteTask(id: string): Promise<void> {
  let tasks = await loadTasks();
  tasks = tasks.filter(t => t.id !== id && t.parent_id !== id);
  await saveTasks(tasks);
}

// ============ Todos ============

const TODOS_KEY = 'daily_todos';

export async function loadTodos(): Promise<Todo[]> {
  return getJSON<Todo[]>(TODOS_KEY, []);
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await setJSON(TODOS_KEY, todos);
}

export async function addTodo(title: string, description = '', priority = 'normal', category = '学习'): Promise<Todo> {
  const todos = await loadTodos();
  const todo: Todo = {
    id: Math.random().toString(36).slice(2, 10),
    title,
    description,
    status: 'todo',
    priority: priority as Todo['priority'],
    category,
    created_at: new Date().toISOString(),
    completed_at: null,
    subtasks: [],
  };
  todos.unshift(todo);
  await saveTodos(todos);
  return todo;
}

export async function updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
  const todos = await loadTodos();
  const idx = todos.findIndex(t => t.id === id);
  if (idx === -1) return;
  todos[idx] = { ...todos[idx], ...updates };
  if (updates.status === 'done') {
    todos[idx].completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== 'done') {
    todos[idx].completed_at = null;
  }
  await saveTodos(todos);
}

export async function deleteTodo(id: string): Promise<void> {
  let todos = await loadTodos();
  todos = todos.filter(t => t.id !== id);
  await saveTodos(todos);
}

// ============ Config ============

const CONFIG_KEY = 'app_config';

const DEFAULT_CONFIG: AppConfig = {
  claude_api_key: '',
  claude_base_url: 'http://model.mify.ai.srv/anthropic',
  claude_sonnet_model: 'xiaomi/mimo-v2.5-pro',
  claude_haiku_model: 'xiaomi/mimo-v2.5',
  feishu_app_id: '',
  feishu_app_secret: '',
  feishu_wiki_node_token: '',
  feishu_sync_enabled: false,
  feishu_doc_daily: '',
  feishu_doc_quiz: '',
  feishu_doc_interview: '',
  feishu_doc_feynman: '',
  feishu_doc_review: '',
  sound_enabled: true,
  remind_interval_minutes: 10,
  tongyi_url: 'https://www.tongyi.com/',
  external_app_path: '',
};

export async function loadConfig(): Promise<AppConfig> {
  return getJSON<AppConfig>(CONFIG_KEY, { ...DEFAULT_CONFIG });
}

export async function saveConfig(config: Partial<AppConfig>): Promise<void> {
  const current = await loadConfig();
  await setJSON(CONFIG_KEY, { ...current, ...config });
}

// ============ Generic JSON storage ============

export async function loadJSON<T>(key: string, defaultValue: T): Promise<T> {
  return getJSON<T>(key, defaultValue);
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  await setJSON(key, value);
}
