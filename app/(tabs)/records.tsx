import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Alert, Dimensions,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as RecordsService from '../../src/services/records';
import { RecordItem, RecordType } from '../../src/types';

type RecordTab = 'data' | 'habit';

export default function RecordsScreen() {
  const [tab, setTab] = useState<RecordTab>('data');
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [types, setTypes] = useState<RecordType[]>([]);
  const [selectedType, setSelectedType] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  const loadData = useCallback(async () => {
    const [r, t] = await Promise.all([RecordsService.getRecords(), RecordsService.getRecordTypes()]);
    setRecords(r);
    setTypes(t);
    if (!selectedType && t.length > 0) setSelectedType(t[0].name);
  }, []);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const filteredRecords = records.filter(r => r.type === selectedType);
  const habitTypes = types.filter(t => t.category === 'habit');
  const recordTypes = types.filter(t => t.category === 'record');

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>生活记录</Text>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === 'data' && s.tabActive]} onPress={() => setTab('data')}>
          <Text style={[s.tabText, tab === 'data' && s.tabTextActive]}>📊 数据</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'habit' && s.tabActive]} onPress={() => setTab('habit')}>
          <Text style={[s.tabText, tab === 'habit' && s.tabTextActive]}>✅ 习惯</Text>
        </TouchableOpacity>
      </View>

      {tab === 'data' ? (
        <ScrollView style={s.content}>
          {/* Type selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.typeRow}>
            {recordTypes.map(t => (
              <TouchableOpacity
                key={t.name}
                style={[s.typeBtn, selectedType === t.name && s.typeBtnActive]}
                onPress={() => setSelectedType(t.name)}
              >
                <Text style={[s.typeBtnText, selectedType === t.name && s.typeBtnTextActive]}>{t.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.typeBtn} onPress={() => setShowTypeModal(true)}>
              <Text style={s.typeBtnText}>+</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Trend chart */}
          {selectedType && (
            <View style={s.chartCard}>
              <Text style={s.chartTitle}>近7天趋势</Text>
              <TrendChart typeName={selectedType} records={records} />
            </View>
          )}

          {/* Record list */}
          <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={s.addBtnText}>+ 添加记录</Text>
          </TouchableOpacity>
          {filteredRecords.length === 0 ? (
            <Text style={s.empty}>暂无记录</Text>
          ) : (
            filteredRecords.slice(0, 20).map(r => (
              <View key={r.id} style={s.recordItem}>
                <View style={s.recordInfo}>
                  <Text style={s.recordType}>{r.type}</Text>
                  <Text style={s.recordDate}>{r.date}</Text>
                </View>
                <Text style={s.recordValue}>{r.value}{recordTypes.find(t => t.name === r.type)?.unit || ''}</Text>
              </View>
            ))
          )}
        </ScrollView>
      ) : (
        <ScrollView style={s.content}>
          <Text style={s.sectionTitle}>今日习惯</Text>
          {habitTypes.map(t => {
            const today = new Date().toISOString().slice(0, 10);
            const done = records.some(r => r.type === t.name && r.date === today);
            return (
              <TouchableOpacity
                key={t.name}
                style={[s.habitItem, done && s.habitDone]}
                onPress={async () => {
                  if (done) {
                    const r = records.find(x => x.type === t.name && x.date === today);
                    if (r) await RecordsService.deleteRecord(r.id);
                  } else {
                    await RecordsService.addRecord(t.name, 1, today, '');
                  }
                  loadData();
                }}
              >
                <Text style={[s.habitIcon, done && s.habitIconDone]}>{done ? '✅' : '⬜'}</Text>
                <Text style={[s.habitName, done && s.habitDone]}>{t.name}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Add Record Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>添加记录</Text>
            <Text style={s.label}>类型</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {recordTypes.map(t => (
                <TouchableOpacity
                  key={t.name}
                  style={[s.typeBtn, selectedType === t.name && s.typeBtnActive]}
                  onPress={() => setSelectedType(t.name)}
                >
                  <Text style={[s.typeBtnText, selectedType === t.name && s.typeBtnTextActive]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={s.label}>数值</Text>
            <TextInput
              style={s.input}
              placeholder="输入数值"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
            />
            <Text style={s.label}>日期</Text>
            <TextInput
              style={s.input}
              placeholder="YYYY-MM-DD（默认今天）"
              placeholderTextColor="#94a3b8"
            />
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowAddModal(false)}>
                <Text style={s.cancelText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={() => { setShowAddModal(false); loadData(); }}>
                <Text style={s.saveText}>保存</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Simple trend chart using View
function TrendChart({ typeName, records }: { typeName: string; records: RecordItem[] }) {
  const today = new Date();
  const days = 7;
  const data: number[] = [];
  const labels: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const r = records.find(x => x.type === typeName && x.date === ds);
    data.push(r?.value || 0);
    labels.push(ds.slice(5));
  }
  const max = Math.max(...data, 1);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 100, gap: 4, paddingTop: 10 }}>
      {data.map((v, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center' }}>
          <View style={{
            width: '80%', height: Math.max(4, (v / max) * 70),
            backgroundColor: v > 0 ? '#6C5CE7' : '#2a2a4a',
            borderRadius: 4,
          }} />
          <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  tab: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6C5CE7' },
  tabText: { fontSize: 14, color: '#94a3b8' },
  tabTextActive: { color: '#6C5CE7', fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  typeRow: { marginBottom: 16 },
  typeBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1a1a2e', marginRight: 8 },
  typeBtnActive: { backgroundColor: '#6C5CE7' },
  typeBtnText: { fontSize: 12, color: '#94a3b8' },
  typeBtnTextActive: { color: '#fff', fontWeight: '600' },
  chartCard: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 16 },
  chartTitle: { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginBottom: 12 },
  addBtn: { backgroundColor: '#6C5CE7', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  empty: { textAlign: 'center', color: '#94a3b8', padding: 30 },
  recordItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14, marginBottom: 8 },
  recordInfo: { flexDirection: 'column' },
  recordType: { fontSize: 14, fontWeight: '600', color: '#fff' },
  recordDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  recordValue: { fontSize: 18, fontWeight: '700', color: '#6C5CE7' },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginBottom: 12 },
  habitItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 8, gap: 12 },
  habitDone: { opacity: 0.6 },
  habitIcon: { fontSize: 24 },
  habitIconDone: {},
  habitName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#2a2a4a', borderRadius: 8, padding: 10, color: '#fff',
    fontSize: 13, marginBottom: 4, borderWidth: 1, borderColor: '#3a3a5a',
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
  cancelText: { color: '#94a3b8', fontSize: 14 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, backgroundColor: '#6C5CE7' },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
