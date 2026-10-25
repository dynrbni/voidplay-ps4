import { useEffect, useState } from 'react';
import { collectionKey, emptyCollections, parseCollections, toggleCollection } from './collections.ts';
import type { CollectionName, Collections } from './collections.ts';

function readStorage() {
  try { return { data: parseCollections(localStorage.getItem(collectionKey)), warning: '' }; }
  catch { return { data: emptyCollections, warning: 'Saved collections could not be read. Changes will be kept for this session until storage is available.' }; }
}

export function useCollections() {
  const [state, setState] = useState(readStorage);
  useEffect(() => {
    function sync(event: StorageEvent) {
      if (event.key === collectionKey || event.key === null) setState(readStorage());
    }
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  function save(data: Collections) {
    try {
      localStorage.setItem(collectionKey, JSON.stringify(data));
      setState({ data, warning: '' });
    } catch {
      setState({ data, warning: 'Browser storage is unavailable. Your changes are saved for this session only.' });
    }
  }
  return {
    ...state,
    toggle: (name: CollectionName, id: string) => save(toggleCollection(state.data, name, id)),
    setReduceMotion: (value: boolean) => save({ ...state.data, reduceMotion: value })
  };
}
