import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { api } from '../api/client.js';
import { EVENTS, getSocket } from '../api/socket.js';
import { sortByOrder } from '../utils/format.js';

const PortfolioContext = createContext(null);

const initialState = { status: 'loading', error: null, data: null };

/** Applies a Socket.IO change event to the in-memory copy of the portfolio. */
function applyChange(data, { resource, action, item, id }) {
  if (!data) return data;
  if (resource === 'profile') return { ...data, profile: item };

  const list = data[resource];
  if (!Array.isArray(list)) return data;

  let next = list;
  if (action === 'deleted') {
    next = list.filter((x) => x.id !== id);
  } else if (item) {
    const without = list.filter((x) => x.id !== item.id);
    // Hidden items disappear from the public site immediately.
    next = item.visible === false ? without : sortByOrder([...without, item]);
  }
  return { ...data, [resource]: next };
}

function reducer(state, event) {
  switch (event.type) {
    case 'loaded':
      return { status: 'ready', error: null, data: event.data };
    case 'failed':
      return state.data ? state : { status: 'error', error: event.error, data: null };
    case 'change':
      return { ...state, data: applyChange(state.data, event.change) };
    default:
      return state;
  }
}

export function PortfolioProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [live, setLive] = useState({ connected: false, lastUpdate: null });

  const load = useCallback(async (signal) => {
    try {
      dispatch({ type: 'loaded', data: await api.portfolio({ signal }) });
    } catch (error) {
      if (error.name !== 'AbortError') dispatch({ type: 'failed', error });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);

    const socket = getSocket();
    let hasConnected = socket.connected;

    const onConnect = () => {
      setLive((l) => ({ ...l, connected: true }));
      // After a dropped connection we may have missed events — MongoDB is the source of truth, so refetch.
      if (hasConnected) load();
      hasConnected = true;
    };
    const onDisconnect = () => setLive((l) => ({ ...l, connected: false }));
    const onChange = (change) => {
      dispatch({ type: 'change', change });
      setLive((l) => ({ ...l, lastUpdate: change }));
    };

    if (socket.connected) setLive((l) => ({ ...l, connected: true }));
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(EVENTS.contentChanged, onChange);

    return () => {
      controller.abort();
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(EVENTS.contentChanged, onChange);
    };
  }, [load]);

  const value = useMemo(() => ({ ...state, live, reload: load }), [state, live, load]);
  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used inside <PortfolioProvider>');
  return ctx;
}
