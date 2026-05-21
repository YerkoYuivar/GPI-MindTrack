import {
  useNavigation as useNavBase,
  useRoute as useRouteBase,
  NavigationProp,
  RouteProp,
} from '@react-navigation/native';
import type { JournalStackParamList, DiscoverStackParamList, ChatStackParamList } from './types';

// Helpers generics
export const useTypedNavigation = <T extends NavigationProp<any>>() => useNavBase<T>();
export const useTypedRoute = <T extends RouteProp<any>>() => useRouteBase<T>();

// Tipos concretos para stacks
export type JournalNav = NavigationProp<JournalStackParamList>;
export type DiscoverNav = NavigationProp<DiscoverStackParamList>;
export type ChatNav = NavigationProp<ChatStackParamList>;
