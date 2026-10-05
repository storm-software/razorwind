/* -------------------------------------------------------------------

                    🗲 Storm Software - Razorwind

 This code was released as part of the Razorwind project. Razorwind
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/razorwind.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/razorwind
 Documentation:            https://docs.stormsoftware.com/projects/razorwind
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

import { resolveSchemaIdentity } from "@razorwind/core/utils";
import type { CommandConfig, Context } from "@shell-shock/core";
import type { McpPluginContext } from "@shell-shock/plugin-mcp";
import { plugin as mcp } from "@shell-shock/plugin-mcp";
import { plugin as theme } from "@shell-shock/plugin-theme";
import type { ThemePluginContext } from "@shell-shock/plugin-theme/types/plugin";
import { joinPaths } from "@stryke/path/join";
import { defu } from "defu";
import { isAbsolute } from "node:path";
import type { Plugin } from "powerlines";
import {
  renderSnapshotModule,
  selectCommands,
  SHARED_DIRECTORY,
  SNAPSHOT_MODULE
} from "./commands";
import { loadDesignSystem } from "./load";
import type { DesignSystemSnapshot } from "./runtime/records";
import { inferPalette, resolveTheme } from "./theme";
import type {
  ShellShockDesignSystemPluginOptions,
  ThemeUserConfig
} from "./types";

export {
  DESIGN_SYSTEM_COMMANDS,
  renderSnapshotModule,
  selectCommands
} from "./commands";
export {
  extractSpec,
  loadDesignSystem,
  loadGuidelines,
  parseGuidelineMarkdown
} from "./load";
export type { ShellShockDesignSystemPluginOptions } from "./types";

/**
 * Context available to the design-system plugin hooks: the Shell Shock
 * context extended by the theme and MCP child plugins.
 */
export type ShellShockDesignSystemPluginContext = Context &
  ThemePluginContext &
  McpPluginContext;

/**
 * Resolve the CLI theme for a design system: the consumer's `mapTheme` (or
 * heuristic inference), with explicit `theme` values layered on top.
 */
export function resolveDesignSystemTheme(
  snapshot: DesignSystemSnapshot,
  options: Pick<
    ShellShockDesignSystemPluginOptions,
    "mapTheme" | "theme" | "themeId"
  >
): ThemeUserConfig {
  const mapped = resolveTheme(
    options.mapTheme
      ? options.mapTheme(snapshot.spec)
      : inferPalette(snapshot.spec, options.themeId)
  );

  return options.theme ? defu(options.theme, mapped) : mapped;
}

/**
 * Shell Shock plugin that exposes a Razorwind design system through the CLI.
 *
 * - Themes the CLI from the design tokens via `@shell-shock/plugin-theme`
 * - Adds design-system commands (`search-tokens`, `list-components`, `plan`,
 *   `guidelines`, `analyze-a11y`, …) whose responses are built from the
 *   extracted spec
 * - Exposes those commands as MCP tools via `@shell-shock/plugin-mcp`
 *
 * The design system is loaded once at build time from `spec`, `specFile`
 * (a `design-system.json` written by `@razorwind/shell-shock`) or the
 * project's `razorwind.config.*`, and baked into the generated CLI.
 *
 * @example
 * ```ts
 * import { defineConfig } from "@shell-shock/core/config";
 * import preset from "@shell-shock/preset-cli";
 * import razorwind from "@razorwind/shell-shock/plugin";
 *
 * export default defineConfig({
 *   name: "acme",
 *   input: "src/commands",
 *   plugins: [preset(), razorwind({ specFile: "./shell-shock/design-system.json" })]
 * });
 * ```
 */
export const plugin = <
  TContext extends ShellShockDesignSystemPluginContext =
    ShellShockDesignSystemPluginContext
>(
  options: ShellShockDesignSystemPluginOptions = {}
): Plugin<TContext>[] => {
  let loaded: Promise<DesignSystemSnapshot> | undefined;
  const load = async (context: { options: { root: string; cwd?: string } }) => {
    // Powerlines reports a workspace-relative project root; anchor it to the
    // execution cwd so design-system paths resolve from the CLI project.
    const root = isAbsolute(context.options.root)
      ? context.options.root
      : joinPaths(context.options.cwd ?? process.cwd(), context.options.root);

    loaded ??= loadDesignSystem(options, root);
    return loaded;
  };

  const plugins: Plugin<TContext>[] = [];

  if (options.theme !== false) {
    plugins.push(...theme<TContext>());
  }

  plugins.push({
    name: "razorwind/shell-shock",
    async config() {
      const snapshot = await load(this);
      if (options.theme === false) {
        return {};
      }

      this.debug(
        "Deriving the Shell Shock theme from the Razorwind design system tokens."
      );

      return {
        theme: resolveDesignSystemTheme(snapshot, options)
      };
    },
    async configResolved() {
      const snapshot = await load(this);
      const title =
        resolveSchemaIdentity(snapshot.spec).title ?? "design system";
      const commands = selectCommands(options.commands);

      this.debug(
        `Adding ${commands.length} design-system commands to the application context.`
      );

      await this.fs.write(
        joinPaths(this.entryPath, SHARED_DIRECTORY, `${SNAPSHOT_MODULE}.ts`),
        renderSnapshotModule(snapshot)
      );

      this.inputs ??= [];

      for (const command of commands) {
        const name = options.prefix
          ? `${options.prefix}-${command.id}`
          : command.id;

        if (this.inputs.some(input => input.id === name)) {
          this.info(
            `The \`${name}\` command already exists in the commands list. If you would like it to be managed by the \`@razorwind/shell-shock\` package, please remove or rename the existing command.`
          );
          continue;
        }

        await this.fs.write(
          joinPaths(this.entryPath, name, "command.ts"),
          command.render({
            snapshotImport: `../${SHARED_DIRECTORY}/${SNAPSHOT_MODULE}`,
            title
          })
        );

        const input: CommandConfig = {
          id: name,
          name,
          path: name,
          segments: [name],
          title: command.title,
          description: command.description,
          icon: command.icon,
          alias: command.alias ?? [],
          tags: command.tags,
          virtual: false,
          entry: {
            file: joinPaths(this.entryPath, name, "index.ts"),
            input: {
              file: joinPaths(this.entryPath, name, "command.ts")
            }
          }
        };
        this.inputs.push(input);
      }
    }
  });

  if (options.mcp !== false) {
    plugins.push(mcp<TContext>(options.mcp ?? {}));
  }

  return plugins;
};

export default plugin;
