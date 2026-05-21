import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export function useOnline() {
  const [online, setOnline] = useState<boolean>(true);
  useEffect(() => {
    const sub = NetInfo.addEventListener((s) => setOnline(Boolean(s.isInternetReachable ?? s.isConnected)));
    NetInfo.fetch().then((s) => setOnline(Boolean(s.isInternetReachable ?? s.isConnected)));
    return () => sub();
  }, []);
  return online;
}
