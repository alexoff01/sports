const read = () => {
  try {
    return !window.sessionStorage.getItem("mv_intro");
  } catch {
    return false;
  }
};

export const FIRST_VISIT = read();
export const HERO_DELAY = FIRST_VISIT ? 1.05 : 0.25;
