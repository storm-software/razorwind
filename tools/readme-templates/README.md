# Razorwind - README Templates

Shared README framing used by the Razorwind workspace formatter.

## Quick Features

- Provides the shared `README.header.md` and `README.footer.md` fragments.
- Supplies the branding and repository-wide footer content used by the root
  README formatting workflow.

## Installation

This is an internal workspace package, not a published dependency. Clone the
repository and install its dependencies from the root:

```sh
pnpm install
```

## Usage

The root formatting workflow passes this directory to `storm-git readme`.
Run the workspace formatter when the templates should be applied to the root
README:

```sh
pnpm format
```

## Development

Edit the header or footer fragment directly, preserving their HTML and Markdown
structure. The formatter can update the root README, so review its diff before
keeping the result.
