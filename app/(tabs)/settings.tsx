import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { loadConfig, saveConfig } from '../../src/services/storage';
import { AppConfig } from '../../src/types';

export default function SettingsScreen() {
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    loadConfig().then(setConfig);
  }, []);

  const updateConfig = async (key: keyof AppConfig, value: any) => {
    if (!config) return;
    const updated = { ...config, [key]: value };
    setConfig(updated);
    await saveConfig({ [key]: value });
  };

  if (!config) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* AI 设置 */}
        <Text style={styles.sectionTitle}>🤖 AI 设置</Text>
        <View style={styles.card}>
          <Text style={styles.label}>API Key</Text>
          <TextInput
            style={styles.input}
            value={config.claude_api_key}
            onChangeText={v => updateConfig('claude_api_key', v)}
            placeholder="sk-..."
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
          <Text style={styles.label}>API 地址</Text>
          <TextInput
            style={styles.input}
            value={config.claude_base_url}
            onChangeText={v => updateConfig('claude_base_url', v)}
            placeholder="https://api.anthropic.com"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.label}>出题模型</Text>
          <TextInput
            style={styles.input}
            value={config.claude_sonnet_model}
            onChangeText={v => updateConfig('claude_sonnet_model', v)}
            placeholder="claude-sonnet-4-6"
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* 飞书设置 */}
        <Text style={styles.sectionTitle}>📋 飞书同步</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>启用飞书同步</Text>
            <Switch
              value={config.feishu_sync_enabled}
              onValueChange={v => updateConfig('feishu_sync_enabled', v)}
              trackColor={{ true: '#6C5CE7' }}
            />
          </View>
          <Text style={styles.label}>App ID</Text>
          <TextInput
            style={styles.input}
            value={config.feishu_app_id}
            onChangeText={v => updateConfig('feishu_app_id', v)}
            placeholder="cli_xxx"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.label}>App Secret</Text>
          <TextInput
            style={styles.input}
            value={config.feishu_app_secret}
            onChangeText={v => updateConfig('feishu_app_secret', v)}
            placeholder="xxx"
            placeholderTextColor="#94a3b8"
            secureTextEntry
          />
        </View>

        {/* 关于 */}
        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.card}>
          <Text style={styles.about}>DailyReminder v1.0</Text>
          <Text style={styles.aboutSub}>任务管理 · 学习测验 · 模拟面试 · 费曼学习</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f23' },
  header: { padding: 20, paddingTop: 50 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  content: { flex: 1, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#94a3b8', marginTop: 20, marginBottom: 10 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 8 },
  label: { fontSize: 12, color: '#94a3b8', marginBottom: 4, marginTop: 8 },
  input: {
    backgroundColor: '#2a2a4a', borderRadius: 8, padding: 10, color: '#fff',
    fontSize: 13, marginBottom: 4, borderWidth: 1, borderColor: '#3a3a5a',
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  switchLabel: { fontSize: 14, color: '#fff' },
  about: { fontSize: 16, fontWeight: '600', color: '#fff', marginBottom: 4 },
  aboutSub: { fontSize: 12, color: '#94a3b8' },
});
