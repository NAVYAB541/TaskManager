import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TaskListScreen from './src/screens/TaskListScreen';
import AddTaskScreen from './src/screens/AddTaskScreen';
import TaskDetailsScreen from './src/screens/TaskDetailsScreen';
import LaunchMeScreen from './src/screens/LaunchMeScreen';
import FocusModeScreen from './src/screens/FocusModeScreen';
import AIPlannerScreen from './src/screens/AIPlannerScreen';
import { RootStackParamList } from './src/types';
import { requestNotificationPermission } from './src/utils/notifications';
import { ThemeProvider } from './src/context/ThemeContext';
import { Provider as PaperProvider } from 'react-native-paper';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  return (
    <PaperProvider>
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="TaskList" component={TaskListScreen} options={{ title: 'Tasks' }} />
          <Stack.Screen name="AddTask" component={AddTaskScreen} options={{ title: 'Add Task' }} />
          <Stack.Screen name="TaskDetails" component={TaskDetailsScreen} options={{ title: 'Task Details' }} />
          <Stack.Screen name="LaunchMe" component={LaunchMeScreen} options={{ title: 'Launch Me' }} />
          <Stack.Screen
            name="FocusMode"
            component={FocusModeScreen}
            options={{ title: 'Focus Mode', headerShown: false }}
          />
          <Stack.Screen
            name="AIPlanner"
            component={AIPlannerScreen}
            options={{ title: 'Plan with AI' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
    </PaperProvider>
  );
}
