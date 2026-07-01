import { loadJSON, saveJSON } from './storage';
import { callAI, extractJSON } from './ai';

const REFLECTIONS_KEY = 'reflections_data';
const HABITS_KEY = 'habits_data';

interface Reflection {
  id: string;
  date: string;
  harvest: string;
  improvement: string;
  plan: string;
  ai_suggestions: string[];
  created_at: string;
}

interface ReflectionData { reflections: Reflection[] }

async function loadData(): Promise<ReflectionData> {
  return loadJSON(REFLECTIONS_KEY, { reflections: [] });
}

async function saveData(data: ReflectionData): Promise<void> {
  await saveJSON(REFLECTIONS_KEY, data);
}

export async function getReflectionList(): Promise<Reflection[]> {
  const data = await loadData();
  return data.reflections || [];
}

export async function getTodayReflection(): Promise<Reflection | null> {
  const today = new Date().toISOString().slice(0, 10);
  const list = await getReflectionList();
  return list.find(r => r.date === today) || null;
}

export async function saveReflection(harvest: string, improvement: string, plan: string): Promise<void> {
  const data = await loadData();
  const today = new Date().toISOString().slice(0, 10);
  const existing = data.reflections.find(r => r.date === today);

  if (existing) {
    existing.harvest = harvest;
    existing.improvement = improvement;
    existing.plan = plan;
  } else {
    data.reflections.unshift({
      id: Math.random().toString(36).slice(2, 10),
      date: today,
      harvest, improvement, plan,
      ai_suggestions: [],
      created_at: new Date().toISOString(),
    });
  }
  await saveData(data);
}

export async function getAISuggestions(harvest: string, improvement: string, plan: string): Promise<string[]> {
  try {
    const prompt = `用户今日反思：\n收获：${harvest}\n不足：${improvement}\n计划：${plan}\n\n给出2-3条具体建议。返回JSON：{"suggestions":["建议1","建议2","建议3"]}`;
    const text = await callAI('你是学习教练。只返回JSON。', prompt, 512);
    const result = extractJSON<{ suggestions: string[] }>(text);
    return result?.suggestions || [];
  } catch { return []; }
}

export async function getReflectionStats() {
  const list = await getReflectionList();
  const dates = new Set(list.map(r => r.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) streak++;
    else break;
  }
  const avgLen = list.length ? Math.round(list.reduce((s, r) => s + (r.harvest?.length || 0), 0) / list.length) : 0;
  const complete = list.filter(r => r.harvest && r.improvement && r.plan).length;
  return { streak, total: list.length, avgLen, completionRate: list.length ? Math.round(complete / list.length * 100) : 0 };
}

// ===== Habits =====

interface HabitsData { [date: string]: string[] }

async function loadHabits(): Promise<HabitsData> {
  return loadJSON(HABITS_KEY, {});
}

export async function toggleHabit(typeName: string, dateStr?: string): Promise<boolean> {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const data = await loadHabits();
  if (!data[date]) data[date] = [];
  const idx = data[date].indexOf(typeName);
  if (idx >= 0) {
    data[date].splice(idx, 1);
  } else {
    data[date].push(typeName);
  }
  await saveJSON(HABITS_KEY, data);
  return data[date].includes(typeName);
}

export async function isHabitDone(typeName: string, dateStr?: string): Promise<boolean> {
  const date = dateStr || new Date().toISOString().slice(0, 10);
  const data = await loadHabits();
  return data[date]?.includes(typeName) || false;
}
