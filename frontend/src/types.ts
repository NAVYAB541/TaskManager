export type Task = {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
};

export type RootStackParamList = {
  TaskList: undefined;
  AddTask: undefined;
  TaskDetails: { task: Task };
};