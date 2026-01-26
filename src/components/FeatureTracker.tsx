import { useFeatureTracking } from "@/hooks/useFeatureTracking";

/**
 * Component that initializes feature tracking for the app.
 * This tracks which pages/features users visit for analytics purposes.
 * Should be placed inside the Router context but renders nothing.
 */
const FeatureTracker = () => {
  useFeatureTracking();
  return null;
};

export default FeatureTracker;
