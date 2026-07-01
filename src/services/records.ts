import { loadJSON, saveJSON } from './storage';
import { RecordItem, RecordType } from '../types';

const RECORDS_KEY = 'records_data';

const DEFAULT_TYPES: RecordType[] = [
  { name: '体重', unit: 'kg', category: 'record' },
  { name: '体脂', unit: '%', category: 'record' },
  { name: '步数', unit: '步', category: 'record' },
  { name: '写日记', unit: '', category: 'habit' },
  { name: '运动', unit: '', category: 'habit' },
];

interface RecordsData {
  records: RecordItem[];
  types: RecordType[];
}

async function loadData(): Promise<RecordsData> {
  return getJSON(RECORDS_KEY, { records: [], types: DEFAULT_TYPES });
}

async function saveData(data: RecordsData): Promise<void> {
  await saveJSON(RECORDS_KEY, data);
}

async function getRecords(): Promise<RecordItem[]> {
  const data = await loadData();
  return data.records || [];
}

async function getRecordTypes(): Promise<RecordType[]> {
  const data = await loadData();
  return data.types || DEFAULT_TYPES;
}

export async function addRecord(type: string, value: number, date: string, note: string): Promise<RecordItem> {
  const data = await loadData();
  const record: RecordItem = {
    id: Math.random().toString(36).slice(2, 10),
    type,
    value,
    date: date || new Date().toISOString().slice(0, 10),
    note: note || '',
    created: new Date().toISOString(),
  };
  data.records.unshift(record);
  await saveData(data);
  return record;
}

export async function deleteRecord(id: string): Promise<void> {
  const data = await loadData();
  data.records = data.records.filter(r => r.id !== id);
  await saveData(data);
}

export async function addRecordType(name: string, unit: string, category: string): Promise<RecordType> {
  const data = await loadData();
  const type: RecordType = { name, unit, category };
  data.types.push(type);
  await saveData(data);
  return type;
}

export async function deleteRecordType(name: string): Promise<void> {
  const data = await loadData();
  data.types = data.types.filter(t => t.name !== name);
  await saveData(data);
}

export async function getRecordsByType(typeName: string): Promise<RecordItem[]> {
  const records = await getRecords();
  return records.filter(r => r.type === typeName);
}

export async function getRecordTrend(typeName: string, days = 7): Promise<{ date: string; value: number }[]> {
  const records = await getRecords();
  const filtered = records.filter(r => r.type === typeName);
  const today = new Date();
  const trend: { date: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const r = filtered.find(x => x.date === ds);
    trend.push({ date: ds.slice(5), value: r?.value || 0 });
  }
  return trend;
}

export { loadData as _loadRecordsData, getRecords, getRecordTypes };
