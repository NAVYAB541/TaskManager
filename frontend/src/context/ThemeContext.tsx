import React, { createContext, useState, useContext } from 'react';

export type ThemeType = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeType;
  toggleTheme: () => void;
  colors: typeof lightColors;
}

const lightColors = {
  background: '#f2f2f2',
  card: '#ffffff',
  text: '#111',
  primary: '#4f46e5',
  danger: '#dc2626',
  secondary: '#10b981',
};

const darkColors = {
  background: '#121212',
  card: '#1e1e1e',
  text: '#ffffff',
  primary: '#6366f1',
  danger: '#ef4444',
  secondary: '#34d399',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeType>('light');

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const colors = theme === 'light' ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
};