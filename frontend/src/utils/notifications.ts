import * as Notifications from 'expo-notifications';

export async function requestNotificationPermission() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    alert('Permission for notifications not granted');
  }
}

export async function scheduleTaskReminder(
  taskId: string,
  title: string,
  dueDate: string
) {
  const triggerDate = new Date(dueDate);

  // Set reminder 1 day before
  triggerDate.setDate(triggerDate.getDate() - 1);

  // Don't schedule if past
  if (triggerDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    identifier: taskId,
    content: {
      title: 'Upcoming Task Reminder ⏰',
      body: `"${title}" is due tomorrow`,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });
}

export async function cancelTaskReminder(taskId: string) {
  await Notifications.cancelScheduledNotificationAsync(taskId);
}