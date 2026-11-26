import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
export type Role = "traveler" | "mate";
type Context = {
  role: Role | null;
  ready: boolean;
  chooseRole: (role: Role) => Promise<void>;
};
const RoleContext = createContext<Context | null>(null);
const KEY = "seoulmate.role";
export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(KEY)
      .then((value) => {
        if (mounted && (value === "traveler" || value === "mate"))
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
    setRole(value);
  };
  return (
    <RoleContext.Provider value={{ role, ready, chooseRole }}>
      {children}
    </RoleContext.Provider>
  );
}
export function useRole() {
  const value = useContext(RoleContext);
  if (!value) throw new Error("RoleProvider missing");
  return value;
}
