import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function RecordsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>生活记录</Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, styles.tabActive]}>
          <Text style={[styles.tabText, styles.tabTextActive]}>📊 记录</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>✅ 习惯</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <Text style={styles.icon}>📊</Text>
        <Text style={styles.title}>生活记录</Text>
        <Text style={styles.desc}>记录体重、体脂、步数等数据</Text>
        <TouchableOpacity style={styles.btn}>
          <Text style={styles.btnText}>+ 添加记录</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, gap: 4, borderBottomWidth: 1, borderBottomColor: '#2a2a4a' },
  tab: { paddingHorizontal: 20, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: '#6C5CE7' },
  tabText: { fontSize: 14, color: '#94a3b8' },
  tabTextActive: { color: '#6C5CE7', fontWeight: '600' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  desc: { fontSize: 14, color: '#94a3b8', marginBottom: 24 },
  btn: { backgroundColor: '#6C5CE7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
