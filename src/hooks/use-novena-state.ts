import { useState, useEffect } from "react";

export interface NovenaState {
  currentDay: number;
  completedDays: number[];
  lastPrayerDate: string | null;
  reminderTime: string | null;
  isCompleted: boolean;
}

export const useNovenaState = (novenaId: string) => {
  const [state, setState] = useState<NovenaState>(() => {
    const saved = localStorage.getItem(`novena_state_${novenaId}`);
    return saved ? JSON.parse(saved) : {
      currentDay: 1,
      completedDays: [],
      lastPrayerDate: null,
      reminderTime: null,
      isCompleted: false
    };
  });

  useEffect(() => {
    localStorage.setItem(`novena_state_${novenaId}`, JSON.stringify(state));
  }, [state, novenaId]);

  const updateProgress = (day: number) => {
    setState(prev => {
      const newCompleted = prev.completedDays.includes(day) 
        ? prev.completedDays 
        : [...prev.completedDays, day].sort((a, b) => a - b);
      
      const isFinished = day === 9;
      
      return {
        ...prev,
        completedDays: newCompleted,
        currentDay: day < 9 ? day + 1 : 9,
        lastPrayerDate: new Date().toISOString(),
        isCompleted: isFinished || prev.isCompleted
      };
    });
  };

  const setReminder = (time: string) => {
    setState(prev => ({ ...prev, reminderTime: time }));
  };

  const restartNovena = () => {
    setState({
      currentDay: 1,
      completedDays: [],
      lastPrayerDate: null,
      reminderTime: null,
      isCompleted: false
    });
  };

  return {
    state,
    updateProgress,
    setReminder,
    restartNovena
  };
};
