import { Platform, Linking, Alert } from 'react-native';
import * as Updates from 'expo-updates';

const GITHUB_REPO = 'qiye0827/DailyReminderApp';
const CURRENT_VERSION = '1.0.0';

export interface UpdateInfo {
  available: boolean;
  version: string;
  downloadUrl: string;
  releaseNotes: string;
}

export async function checkForAPKUpdate(): Promise<UpdateInfo> {
  try {
    const resp = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { 'User-Agent': 'DailyReminderApp' } }
    );

    if (!resp.ok) {
      return { available: false, version: '', downloadUrl: '', releaseNotes: '' };
    }

    const release = await resp.json();
    const latestVersion = release.tag_name?.replace('v', '') || '0.0.0';
    const apkAsset = release.assets?.find((a: any) =>
      a.name.endsWith('.apk') || a.name.includes('APK')
    );

    return {
      available: latestVersion !== CURRENT_VERSION,
      version: latestVersion,
      downloadUrl: apkAsset?.browser_download_url || '',
      releaseNotes: release.body || '',
    };
  } catch {
    return { available: false, version: '', downloadUrl: '', releaseNotes: '' };
  }
}

export async function promptForUpdate(): Promise<void> {
  // First check OTA updates
  try {
    const update = await Updates.checkForUpdateAsync();
    if (update.isAvailable) {
      Alert.alert(
        '发现新版本 (OTA)',
        '发现 JS/资源更新，是否立即更新？',
        [
          { text: '稍后', style: 'cancel' },
          {
            text: '立即更新',
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
      return;
    }
  } catch {}

  // Then check APK update
  const info = await checkForAPKUpdate();
  if (info.available && info.downloadUrl) {
    Alert.alert(
      `发现新版本 v${info.version}`,
      info.releaseNotes ? `更新内容：\n${info.releaseNotes.slice(0, 200)}` : '是否前往下载？',
      [
        { text: '稍后', style: 'cancel' },
        {
          text: '前往下载',
          onPress: () => Linking.openURL(info.downloadUrl),
        },
      ]
    );
  }
}

export function getUpdateBadge(): string {
  // Check localStorage for pending update
  try {
    // This is synchronous - just check version
    return CURRENT_VERSION;
  } catch {
    return CURRENT_VERSION;
  }
}
