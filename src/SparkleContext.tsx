import { createContext, useContext, useState, useCallback, ReactNode, useRef, RefObject } from "react";

interface SparkleContextType {
  triggerSparkle: (containerRef?: RefObject<HTMLElement>) => void;
  sparkleContainerRef: RefObject<HTMLElement> | null;
  isSparkleActive: boolean;
  handleComplete: () => void;
}

const SparkleContext = createContext<SparkleContextType | undefined>(undefined);

export const SparkleProvider = ({ children }: { children: ReactNode }) => {
  const [isSparkleActive, setIsSparkleActive] = useState(false);
  const [sparkleContainerRef, setSparkleContainerRef] = useState<RefObject<HTMLElement> | null>(null);

  const triggerSparkle = useCallback((containerRef?: RefObject<HTMLElement>) => {
    setSparkleContainerRef(containerRef || null);
    setIsSparkleActive(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsSparkleActive(false);
    setSparkleContainerRef(null);
  }, []);

  return (
    <SparkleContext.Provider value={{ triggerSparkle, sparkleContainerRef, isSparkleActive, handleComplete }}>
      {children}
    </SparkleContext.Provider>
  );
};

export const useSparkle = () => {
  const context = useContext(SparkleContext);
  if (!context) {
    throw new Error("useSparkle must be used within a SparkleProvider");
  }
  return context;
};
