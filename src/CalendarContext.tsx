import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CalendarContextType {
  isCalendarOpen: boolean;
  openCalendar: () => void;
  closeCalendar: () => void;
  toggleCalendar: () => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export const CalendarProvider = ({ children }: { children: ReactNode }) => {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const openCalendar = () => setIsCalendarOpen(true);
  const closeCalendar = () => setIsCalendarOpen(false);
  const toggleCalendar = () => setIsCalendarOpen((prev) => !prev);

  return (
    <CalendarContext.Provider value={{ isCalendarOpen, openCalendar, closeCalendar, toggleCalendar }}>
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
