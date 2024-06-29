import { useEffect } from "react";

const useDisableHoverOnMobile = () => {
  useEffect(() => {
    const handleTouchStart = () => {
      if ("ontouchstart" in window || navigator.maxTouchPoints) {
        document.body.classList.add("is-touch");
      }
      window.removeEventListener("touchstart", handleTouchStart);
    };

    window.addEventListener("touchstart", handleTouchStart);

    // Cleanup function to remove the class when the component unmounts
    return () => {
      document.body.classList.remove("is-touch");
      window.removeEventListener("touchstart", handleTouchStart);
    };
  }, []);
};

export default useDisableHoverOnMobile;
