import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

async function checkForUpdates() {
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert(
        '更新可用',
        '发现新版本，是否立即更新？',
        [
          { text: '稍后', style: 'cancel' },
          {
            text: '更新',
            onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                Alert.alert('更新失败', e.message);
              }
            },
          },
        ]
      );
    }
  } catch (e) {
    console.log('Update check failed:', e);
  }
}

export default function RootLayout() {
  useEffect(() => {
    checkForUpdates();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
