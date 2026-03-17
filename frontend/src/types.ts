export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  tags?: string[];
  category?: string;
  estimateMinutes?: number;
  energy?: 'high' | 'medium' | 'low' | null;
  nextAction?: string;
};

export type RootStackParamList = {
  TaskList: undefined;
  AddTask: undefined;
  TaskDetails: { task: Task };
  LaunchMe: undefined;
  FocusMode: { task: Task };
};
