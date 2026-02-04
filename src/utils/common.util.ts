/**
 * Common utility functions for everyday operations.
 * Provides helper methods for string manipulation, object operations, and other common tasks.
 *
 * @example
 * ```typescript
 * // Generate a unique slug
 * const slug = await commonUtil.generateSlug('My Product Title', async (s) => {
 *   const exists = await productService.findBySlug(s);
 *   return !!exists;
 * });
 * ```
 */
export const commonUtil = {
  /**
   * Generate a URL-friendly slug from text.
   * Normalizes the text by removing accents, converting to lowercase,
   * replacing spaces with hyphens, and ensuring uniqueness.
   *
   * @param text - The input text to convert to a slug
   * @param checkExists - Optional async function to check if slug already exists
   * @returns Promise<string> - A unique slug
   *
   * @example
   * ```typescript
   * // Simple slug generation
   * const slug = await commonUtil.generateSlug('My Awesome Product');
   * // Result: 'my-awesome-product'
   *
   * // With uniqueness check
   * const slug = await commonUtil.generateSlug('Product', async (slug) => {
   *   const existing = await productRepository.findOne({ where: { slug } });
   *   return !!existing;
   * });
   * // Result: 'product' or 'product-2', 'product-3', etc.
   * ```
   */
  async generateSlug(
    text: string,
    checkExists?: (slug: string) => Promise<boolean>,
  ): Promise<string> {
    // Step 1: Normalize text
    let baseSlug = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/đ/g, "d") // fix for Vietnamese "đ"
      .replace(/[^a-z0-9\s-]/g, "") // remove emoji & non-alphanumeric
      .replace(/\s+/g, "-") // replace spaces with "-"
      .replace(/^-+|-+$/g, ""); // trim hyphens

    if (!baseSlug) {
      baseSlug = "product"; // fallback slug if text is empty
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
