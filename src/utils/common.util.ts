export const commonUtil = {
  /**
   * Generate a slug for a product
   * - Normalize text (remove accents, lower case, remove emoji, etc.)
   * - Replace spaces with "-"
   * - Check database for duplicates
   * - Append incremental number if slug already exists
   */
  async generateSlug(
    text: string,
    checkExists?: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    // Step 1: Normalize text
    let baseSlug = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/đ/g, 'd') // fix for Vietnamese "đ"
      .replace(/[^a-z0-9\s-]/g, '') // remove emoji & non-alphanumeric
      .replace(/\s+/g, '-') // replace spaces with "-"
      .replace(/^-+|-+$/g, ''); // trim hyphens

    if (!baseSlug) {
      baseSlug = 'product'; // fallback slug if text is empty
    }

    if (!checkExists) return baseSlug;

    // Step 2: Ensure uniqueness
    let uniqueSlug = baseSlug;
    let counter = 1;

    while (await checkExists(uniqueSlug)) {
      counter++;
      uniqueSlug = `${baseSlug}-${counter}`;
    }

    return uniqueSlug;
  },
};
