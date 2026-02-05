import { useOrgNavigation } from "@/hooks/useOrgNavigation";

const HeaderLogo = () => {
  const { navigate, getOrgPath } = useOrgNavigation();

  return (
    <img
      alt="Bosplan"
      className="hidden md:block h-8 w-auto cursor-pointer transition-transform duration-200 hover:scale-105"
      onClick={() => navigate(getOrgPath(""))}
      src="/lovable-uploads/df46293f-eed7-4703-b275-003427891304.png"
    />
  );
};

export default HeaderLogo;
