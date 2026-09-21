import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ObservationLocation } from "../types";
import { loadSavedLocation, saveLocation } from "../lib/location";

interface LocationContextValue {
  location: ObservationLocation;
  setLocation: (location: ObservationLocation) => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState<ObservationLocation>(loadSavedLocation);
  useEffect(() => {
    saveLocation(location);
  }, [location]);
  const value = useMemo(() => ({ location, setLocation: setLocationState }), [location]);
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationContextValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
