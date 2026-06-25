import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    home: '🏠',
    learn: '📚',
    records: '📊',
    settings: '⚙️',
  };
  return (
    <View style={styles.tabIcon}>
      <Text style={[styles.icon, focused && styles.iconActive]}>
        {icons[name] || '📱'}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#6C5CE7',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: '学习',
          tabBarIcon: ({ focused }) => <TabIcon name="learn" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="records"
        options={{
          title: '记录',
          tabBarIcon: ({ focused }) => <TabIcon name="records" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: '设置',
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a2e',
    borderTopColor: '#2a2a4a',
    height: 60,
    paddingBottom: 8,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
});
