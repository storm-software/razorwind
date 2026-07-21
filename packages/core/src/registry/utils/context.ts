/* -------------------------------------------------------------------

                       🗲 Storm Software - Windie

 This code was released as part of the Windie project. Windie
 is maintained by Storm Software under the Apache-2.0 license, and is
 free for commercial and private use. For more information, please visit
 our licensing page at https://stormsoftware.com/licenses/projects/windie.

 Website:                  https://stormsoftware.com
 Repository:               https://github.com/storm-software/windie
 Documentation:            https://docs.stormsoftware.com/projects/windie
 Contact:                  https://stormsoftware.com/contact

 SPDX-License-Identifier:  Apache-2.0

 ------------------------------------------------------------------- */

interface RegistryContext {
  headers: Record<string, Record<string, string>>;
}

const context: RegistryContext = {
  headers: {}
};

export function setRegistryHeaders(
  headers: Record<string, Record<string, string>>
) {
  // Merge new headers with existing ones to preserve headers for nested dependencies
  context.headers = { ...context.headers, ...headers };
}

export function getRegistryHeadersFromContext(
  url: string
): Record<string, string> {
  return context.headers[url] ?? {};
}

export function clearRegistryContext() {
  context.headers = {};
}
