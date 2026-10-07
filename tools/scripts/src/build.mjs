#!/usr/bin/env zx
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

import { $, argv, chalk, echo } from "zx";

try {
  const isPlayground = argv.playground;
  let configuration = argv.configuration;
  if (!configuration) {
    if (argv.prod) {
      configuration = "production";
    } else if (argv.dev) {
      configuration = "development";
    } else if (!isPlayground) {
      configuration = "production";
    }
  }

  const buildTarget = isPlayground ? "playground" : configuration;
  echo`${chalk.whiteBright(`🏗️  Building in ${buildTarget} mode...`)}`;

  let proc = $`pnpm bootstrap`.timeout(`${1 * 60}s`);
  proc.stdout.on("data", data => {
    echo`${data}`;
  });
  let result = await proc;
  if (result.exitCode !== 0) {
    throw new Error(
      `An error occurred while bootstrapping the monorepo: \n\n${
        result.message
      }\n`
    );
  }

  const nxFilter = isPlayground ? "--filter=@playground" : "--exclude=monorepo";
  const configFlag = configuration ? `--configuration=${configuration}` : "";
  proc =
    $`pnpm nx run-many --target=build ${nxFilter} ${configFlag} --outputStyle=dynamic-legacy --parallel=5`.timeout(
      `${45 * 60}s`
    );
  proc.stdout.on("data", data => {
    echo`${data}`;
  });
  result = await proc;
  if (result.exitCode !== 0) {
    throw new Error(
      `An error occurred while building the ${buildTarget} mode: \n\n${result.message}\n`
    );
  }

  echo`${chalk.green(`✔ Successfully built the ${buildTarget} mode!`)}\n`;
} catch (error) {
  echo`${chalk.red(error?.message ? error.message : "A failure occurred while building the monorepo")}`;

  process.exit(1);
}
