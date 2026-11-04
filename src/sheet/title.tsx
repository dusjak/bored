import { createContext, useContext, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import type { HostInstance } from 'react-native';

const SheetTitleContext = createContext<((node: HostInstance | null) => void) | null>(null);

export function SheetTitleProvider({
  register,
  children,
}: {
  register: (node: HostInstance | null) => void;
  children: ReactNode;
}) {
  return <SheetTitleContext.Provider value={register}>{children}</SheetTitleContext.Provider>;
}

/** Registers the host that should take focus once the sheet has landed. */
export function useRegisterSheetTitle(): RefObject<HostInstance | null> {
  const ref = useRef<HostInstance | null>(null);
  const register = useContext(SheetTitleContext);
  useEffect(() => {
    if (!register) return;
    register(ref.current);
    return () => register(null);
  }, [register]);
  return ref;
}
