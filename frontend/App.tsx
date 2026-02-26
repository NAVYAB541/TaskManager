import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from './src/screens/TaskListScreen';
import AddTaskScreen from './src/screens/AddTaskScreen';
import TaskDetailsScreen from './src/screens/TaskDetailsScreen';
import { RootStackParamList } from './src/types';
import { requestNotificationPermission } from './src/utils/notifications';
import { ThemeProvider } from './src/context/ThemeContext';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: 'Tasks' }} />
          <Stack.Screen name="AddTask" component={AddTaskScreen} options={{ title: 'Add Task' }} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ title: 'Task Details' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}