export interface TailwindPluginOptions {
  /**
   * Optional CSS entry override (registry `tailwind.css` / explicit path).
   */
  cssPath?: string | null;

  /**
   * When true, skip entries that carry only the DEFAULT theme option bit.
   *
   * @defaultValue false
   */
  omitDefaults?: boolean;
}
