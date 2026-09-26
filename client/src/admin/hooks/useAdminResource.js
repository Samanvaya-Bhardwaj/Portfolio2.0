import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { EVENTS, getSocket } from '../../api/socket.js';
import { sortByOrder } from '../../utils/format.js';

const upsert = (list, item) => sortByOrder([...list.filter((x) => x.id !== item.id), item]);

/**
 * Loads a collection (including hidden items) and keeps it in sync with changes made
 * from any other admin tab via Socket.IO.
 */
export default function useAdminResource(resource) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setItems(await api.list(resource));
      setStatus('ready');
    } catch (err) {
      setError(err);
      setStatus('error');
    }
  }, [resource]);

  useEffect(() => {
    load();
    const socket = getSocket();
    const onChange = (change) => {
      if (change.resource !== resource) return;
      if (change.action === 'deleted') setItems((list) => list.filter((x) => x.id !== change.id));
      else if (change.item) setItems((list) => upsert(list, change.item));
    };
    socket.on(EVENTS.contentChanged, onChange);
    return () => socket.off(EVENTS.contentChanged, onChange);
  }, [resource, load]);

  const create = useCallback(
    async (body) => {
      const item = await api.create(resource, body);
      setItems((list) => upsert(list, item));
      return item;
    },
    [resource],
  );

  const update = useCallback(
    async (id, body) => {
      const item = await api.update(resource, id, body);
      setItems((list) => upsert(list, item));
      return item;
    },
    [resource],
  );

  const remove = useCallback(
    async (id) => {
      await api.remove(resource, id);
      setItems((list) => list.filter((x) => x.id !== id));
    },
    [resource],
  );

  return { items, status, error, reload: load, create, update, remove };
}
