import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export async function setupNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permission not granted');
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function scheduleTaskReminder(taskName: string, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();
  const trigger = new Date();
  trigger.setHours(hours, minutes, 0, 0);

  if (trigger <= now) {
    trigger.setDate(trigger.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '⏰ 每日提醒',
      body: taskName,
      sound: true,
    },
    trigger: { date: trigger },
  });
}

export async function scheduleDailyReflection() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '📝 每日反思',
      body: '今天的收获是什么？哪些需要改进？',
      sound: true,
    },
    trigger: { hour: 21, minute: 0, repeats: true },
  });
}

export async function scheduleMorningBriefing() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '☀️ 今日早报',
      body: '查看今日待办和学习计划',
      sound: true,
    },
    trigger: { hour: 9, minute: 0, repeats: true },
  });
}

export async function scheduleEveningReport() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 今日晚报',
      body: '查看今日完成情况和学习数据',
      sound: true,
    },
    trigger: { hour: 20, minute: 0, repeats: true },
  });
}

export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
