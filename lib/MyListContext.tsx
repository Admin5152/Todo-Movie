import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Item = {
  id: number;
  title?: string;
  name?: string;
  poster_path?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
};

interface MyListContextType {
  list: Item[];
  add: (item: Item) => void;
  remove: (id: number) => void;
  has: (id: number) => boolean;
}

const KEY = 'cineflow.mylist.v1';
const MyListContext = createContext<MyListContextType | undefined>(undefined);

export function MyListProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = useState<Item[]>([]);

  // Load from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          setList(JSON.parse(raw));
        }
      } catch (error) {
        console.error('Failed to load My List from storage:', error);
      }
    })();
  }, []);

  // Save to AsyncStorage when list changes
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
      } catch (error) {
        console.error('Failed to save My List to storage:', error);
      }
    })();
  }, [list]);

  const add = useCallback((item: Item) => {
    setList((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [item, ...prev];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setList((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const has = useCallback((id: number) => {
    return list.some((i) => i.id === id);
  }, [list]);

  return (
    <MyListContext.Provider value={{ list, add, remove, has }}>
      {children}
    </MyListContext.Provider>
  );
}

export function useMyListContext() {
  const context = useContext(MyListContext);
  if (context === undefined) {
    throw new Error('useMyListContext must be used within a MyListProvider');
  }
  return context;
}
