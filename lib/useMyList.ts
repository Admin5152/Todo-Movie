import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

type Item = { id: number; title?: string; name?: string; poster_path?: string; release_date?: string; first_air_date?: string; vote_average?: number };

const KEY = 'cineflow.mylist.v1';

export function useMyList() {
  const [list, setList] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setList(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
  }, [list]);

  const add = useCallback((item: Item) => {
    setList((prev) => (prev.some((i) => i.id === item.id) ? prev : [item, ...prev]));
  }, []);

  const remove = useCallback((id: number) => {
    setList((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const has = useCallback((id: number) => list.some((i) => i.id === id), [list]);

  return { list, add, remove, has };
}


