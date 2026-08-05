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

import type { Tree } from "@nx/devkit";
import {
  createProjectGraphAsync,
  joinPathFragments,
  readNxJson
} from "@nx/devkit";
import type { GeneratedDocument } from "@power-plant/core";
import { execute } from "@power-plant/core";
import noop from "@power-plant/noop-output";
import type { Options } from "@razorwind/core";
import { generator } from "@razorwind/core";
import type { Schema } from "@razorwind/core/schema";
import { isAbsolute, relative } from "node:path";
import type { SyncGeneratorResult } from "nx/src/utils/sync-generators";
import {
  CONFIG_FILE_NAMES,
  GENERATE_EXECUTOR,
  GENERATOR_NAME
} from "../../helpers/constants";
import type { SyncGeneratorSchema } from "./schema";

const DEFAULT_OUT_OF_SYNC_MESSAGE =
  "Razorwind generated files are out of sync. Run `nx sync` to regenerate.";

function resolveConfigFileToken(
  configFile: string,
  workspaceRoot: string,
  projectRoot: string
): string {
  return configFile
    .replaceAll("{workspaceRoot}", workspaceRoot)
    .replaceAll("{projectRoot}", projectRoot);
}

function findDefaultConfigFile(
  tree: Tree,
  projectRoot: string
): string | undefined {
  return CONFIG_FILE_NAMES.map(name =>
    joinPathFragments(projectRoot, name)
  ).find(path => tree.exists(path));
}

function getDocumentContent(document: GeneratedDocument): string {
  return (document.chunks ?? []).map(chunk => chunk.content ?? "").join("");
}

function toWorkspaceRelativePath(tree: Tree, filePath: string): string {
  if (isAbsolute(filePath)) {
    return relative(tree.root, filePath).split(/[/\\]/).join("/");
  }

  // Relative paths match the generate executor: resolved against workspace cwd.
  return filePath;
}

function writeDocumentIfChanged(
  tree: Tree,
  document: GeneratedDocument
): string | undefined {
  const path = toWorkspaceRelativePath(tree, document.path);
  const content = getDocumentContent(document);

  if (tree.exists(path) && tree.read(path, "utf-8") === content) {
    return undefined;
  }

  tree.write(path, content);
  return path;
}

async function generateForProject(
  tree: Tree,
  options: {
    configFile: string;
    mode: "development" | "production";
    componentsPath?: string | string[];
    tokensPath?: string | string[];
  }
): Promise<string[]> {
  const documents = await execute<
    Schema,
    Options,
    Record<string, GeneratedDocument>
  >(generator, {
    configFile: options.configFile,
    mode: options.mode,
    componentsPath: options.componentsPath,
    tokensPath: options.tokensPath,
    cwd: tree.root,
    output: noop
  });

  const changed: string[] = [];
  for (const document of Object.values(documents ?? {})) {
    const path = writeDocumentIfChanged(tree, document);
    if (path) {
      changed.push(path);
    }
  }

  return changed;
}

export async function syncGenerator(tree: Tree): Promise<SyncGeneratorResult> {
  const nxJson = readNxJson(tree);
  const generatorOptions =
    (nxJson?.sync?.generatorOptions?.[GENERATOR_NAME] as
      SyncGeneratorSchema | undefined) ?? {};

  const defaultMode =
    (generatorOptions.mode as "development" | "production" | undefined) ??
    "production";
  const targetName = generatorOptions.targetName ?? "generate";
  const outOfSyncMessage =
    generatorOptions.outOfSyncMessage ?? DEFAULT_OUT_OF_SYNC_MESSAGE;

  const projectGraph = await createProjectGraphAsync();
  const outOfSyncDetails: string[] = [];
  const processedConfigFiles = new Set<string>();

  if (generatorOptions.configFile) {
    const configFile = resolveConfigFileToken(
      generatorOptions.configFile,
      tree.root,
      tree.root
    );
    if (tree.exists(configFile)) {
      processedConfigFiles.add(configFile);
    }

    const changed = await generateForProject(tree, {
      configFile,
      mode: defaultMode,
      componentsPath: undefined,
      tokensPath: undefined
    });
    outOfSyncDetails.push(...changed);
  } else {
    const workspaceConfigFile = findDefaultConfigFile(tree, tree.root);
    if (workspaceConfigFile && tree.exists(workspaceConfigFile)) {
      processedConfigFiles.add(workspaceConfigFile);

      const changed = await generateForProject(tree, {
        configFile: workspaceConfigFile,
        mode: defaultMode,
        componentsPath: undefined,
        tokensPath: undefined
      });
      outOfSyncDetails.push(...changed);
    }

    for (const project of Object.values(projectGraph.nodes)) {
      const projectRoot = project.data.root;
      const generateTarget =
        project.data.targets?.[targetName] ??
        Object.values(project.data.targets ?? {}).find(
          target => target.executor === GENERATE_EXECUTOR
        );

      let configFile: string | undefined;
      let mode = defaultMode;
      let componentsPath: string | string[] | undefined;
      let tokensPath: string | string[] | undefined;

      if (generateTarget?.executor === GENERATE_EXECUTOR) {
        const targetMode =
          generateTarget.configurations?.[
            generateTarget.defaultConfiguration ?? "production"
          ]?.mode ?? generateTarget.options?.mode;

        mode =
          (targetMode as "development" | "production" | undefined) ??
          defaultMode;
        componentsPath = generateTarget.options?.componentsPath;
        tokensPath = generateTarget.options?.tokensPath;

        const configured = generateTarget.options?.configFile
          ? resolveConfigFileToken(
              generateTarget.options.configFile as string,
              tree.root,
              projectRoot
            )
          : undefined;

        configFile =
          configured && tree.exists(configured)
            ? configured
            : findDefaultConfigFile(tree, projectRoot);
      } else {
        configFile = findDefaultConfigFile(tree, projectRoot);
      }

      if (!configFile || processedConfigFiles.has(configFile)) {
        continue;
      }

      processedConfigFiles.add(configFile);

      const changed = await generateForProject(tree, {
        configFile,
        mode,
        componentsPath,
        tokensPath
      });
      outOfSyncDetails.push(...changed);
    }
  }

  return {
    outOfSyncMessage,
    outOfSyncDetails
  };
}

export default syncGenerator;
