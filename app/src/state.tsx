import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
export type Role = "traveler" | "mate";
type Context = {
  role: Role | null;
  ready: boolean;
  chooseRole: (role: Role) => Promise<void>;
  syncServerRole: (role: Role) => void;
};
const RoleContext = createContext<Context | null>(null);
const KEY = "seoulmate.role";
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  const roleChanged = useRef(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((value) => {
        if (
          mounted &&
          !roleChanged.current &&
          (value === "traveler" || value === "mate")
        )
          setRole(value);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const chooseRole = async (value: Role) => {
    await AsyncStorage.setItem(KEY, value);
    roleChanged.current = true;
    setRole(value);
  };
  const syncServerRole = useCallback((value: Role) => {
    roleChanged.current = true;
    setRole(value);
    void AsyncStorage.setItem(KEY, value).catch(() => {});
  }, []);
  return (
    <RoleContext.Provider value={{ role, ready, chooseRole, syncServerRole }}>
      {children}
    </RoleContext.Provider>
  );
}
export function useRole() {
  const value = useContext(RoleContext);
  if (!value) throw new Error("RoleProvider missing");
  return value;
}
