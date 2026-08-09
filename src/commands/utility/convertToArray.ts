export const convertToArray = (str: string): string[] => {
  return str.split(",").map((item) => item.trim());
};
