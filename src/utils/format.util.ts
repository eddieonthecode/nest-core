export const formatUtil = {
  /**
   * Camel to snake case
   */
  camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  },
};
