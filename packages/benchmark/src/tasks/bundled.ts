/*
 * Adapted from open-design-system-bench by Christoph Hellmuth.
 * Source: https://github.com/christophhdesign/open-design-system-bench
 * Revision: e258a12dff8d483746e9a9ebfa655fa827301e13
 * License: MIT (see NOTICE).
 */

import type { BenchmarkTask } from "../types";

export const BUNDLED_TASKS: BenchmarkTask[] = [
  {
    id: "cancel-plan-action-hierarchy",
    title: "Action hierarchy for the subscription closing section",
    prompt:
      "Create the closing area of the subscription screen: users can keep their current plan, move to a cheaper plan, or cancel their subscription entirely. Make the choices clear without pushing users toward cancelling.",
    rubrics: [
      {
        id: "three-emphasis-levels",
        description:
          "The three actions use distinct and correct emphasis levels from the system's action hierarchy",
        weight: 0.45,
        critical: true
      },
      {
        id: "cancel-not-primary",
        description:
          "Cancelling is styled as the quiet/destructive option per system convention, never the visually primary one",
        weight: 0.35
      },
      {
        id: "order-supports",
        description: "Visual order and grouping support the intended hierarchy",
        weight: 0.2
      }
    ]
  },
  {
    id: "confirm-account-deletion",
    title: "Confirmation before account deletion",
    prompt:
      "In the account settings screen, users can delete their account. Deletion is permanent. Add a step that makes sure users don't delete their account by accident, following our design system.",
    rubrics: [
      {
        id: "uses-confirmation-pattern",
        description:
          "Reaches for the design system's confirmation dialog pattern rather than a generic overlay, browser confirm(), or inline warning",
        weight: 0.4,
        critical: true
      },
      {
        id: "destructive-not-default",
        description:
          "The destructive action is visually distinct (destructive emphasis) and is NOT the default-focused or visually primary action",
        weight: 0.35
      },
      {
        id: "easy-backout",
        description:
          "The user can easily back out, and the copy states the permanent consequence plainly",
        weight: 0.25
      }
    ]
  },
  {
    id: "connection-status-indicator",
    title: "Sync and integration health status indicators",
    prompt:
      "At the top of the app, show whether background sync is online, reconnecting, or offline. In the integrations list, show each integration's health: operational, degraded, or down.",
    rubrics: [
      {
        id: "system-status-components",
        description:
          "Uses the system's status/label components with semantic token colors, not hand-colored dots or custom CSS",
        weight: 0.45
      },
      {
        id: "not-color-only",
        description:
          "States are distinguishable by more than color alone (text or icon)",
        weight: 0.3
      },
      {
        id: "system-typography",
        description: "Status text uses system typography utilities",
        weight: 0.25
      }
    ]
  },
  {
    id: "empty-state-devices",
    title: "Empty state for the linked devices screen",
    prompt:
      "The 'linked devices' screen can be empty for new users. Design what they see before any device is linked, including a way to link their first device.",
    rubrics: [
      {
        id: "empty-state-composition",
        description:
          "Uses an empty-state composition (explanatory heading/description and a clear call to action), not a bare 'no data' string",
        weight: 0.5
      },
      {
        id: "cta-hierarchy",
        description:
          "The call to action uses the system's action hierarchy correctly",
        weight: 0.3
      },
      {
        id: "value-copy",
        description:
          "Copy explains the value of linking a device, not just the absence of data",
        weight: 0.2
      }
    ]
  },
  {
    id: "form-validation-errors",
    title: "Field-level validation errors on the invite form",
    prompt:
      "Build the 'invite a team member' form: it collects an email address and a role. When submission fails validation, users need to understand what went wrong and where.",
    rubrics: [
      {
        id: "inline-field-errors",
        description:
          "Errors surface inline at the field level using the system's form field pattern, not as one generic error blob",
        weight: 0.4
      },
      {
        id: "labels-associated",
        description:
          "Fields are properly labelled and error messages are programmatically associated with their inputs",
        weight: 0.35
      },
      {
        id: "submit-state",
        description:
          "The submit control communicates state appropriately (disabled/loading/enabled)",
        weight: 0.25
      }
    ]
  },
  {
    id: "onboarding-flow",
    title: "First-run setup flow with progress",
    prompt:
      "Build the first-run setup flow with three stages: choose a plan, connect your calendar, and import your contacts. Users should see where they are in the flow and be able to move forward and back.",
    rubrics: [
      {
        id: "progress-pattern",
        description:
          "Uses the design system's multi-step progress pattern to show position in the flow",
        weight: 0.4
      },
      {
        id: "system-primitives",
        description:
          "Stage content is composed with system primitives (headings, actions, layout), placeholders acceptable",
        weight: 0.3
      },
      {
        id: "nav-hierarchy",
        description:
          "Forward/back controls follow the action hierarchy with correct disabled states at the edges",
        weight: 0.3
      }
    ]
  },
  {
    id: "paginated-activity-log",
    title: "Paginated security activity log",
    prompt:
      "Show the account's security activity log with columns for event, device, location, and time. There can be thousands of entries; users need to move through them in manageable chunks.",
    rubrics: [
      {
        id: "system-pagination",
        description:
          "Uses the design system's page-navigation pattern wired to the data list",
        weight: 0.4
      },
      {
        id: "page-state",
        description:
          "Current position is indicated and edge states (first/last page) are handled sensibly",
        weight: 0.3
      },
      {
        id: "accessible-table",
        description:
          "Row and column semantics are accessible (proper table/list semantics, headers)",
        weight: 0.3
      }
    ]
  },
  {
    id: "password-visibility",
    title: "Reveal typed password before submitting",
    prompt:
      "On the login screen, users often mistype their password. Let them check what they've typed before submitting.",
    rubrics: [
      {
        id: "builtin-affordance",
        description:
          "Builds the password field on the design system's input component, using its built-in slots for the visibility control, rather than hand-rolling a bare input element with a separate button bolted on",
        weight: 0.5,
        critical: true
      },
      {
        id: "accessible-toggle",
        description:
          "The visibility control is accessible: its accessible name reflects the current state",
        weight: 0.3
      },
      {
        id: "no-leak",
        description:
          "The password value is never logged or echoed elsewhere in the UI",
        weight: 0.2
      }
    ]
  },
  {
    id: "settings-toggle-section",
    title: "Notification preferences settings section",
    prompt:
      "Create the 'Notification preferences' area of the settings screen with three settings: email digests, push alerts, and product announcements. Each can be turned on or off independently and takes effect immediately.",
    rubrics: [
      {
        id: "switch-not-checkbox",
        description:
          "Uses the system's on/off switch control (immediate-effect settings), not checkboxes or buttons",
        weight: 0.4
      },
      {
        id: "label-description",
        description:
          "Each setting has a title and supporting description following the system's settings-row pattern",
        weight: 0.35
      },
      {
        id: "system-layout",
        description:
          "The section is grouped with system layout primitives rather than ad-hoc spacing",
        weight: 0.25
      }
    ]
  },
  {
    id: "success-feedback",
    title: "Transient feedback after saving notification preferences",
    prompt:
      "After a user saves their notification preferences, give them brief, non-blocking feedback that the save worked.",
    rubrics: [
      {
        id: "transient-pattern",
        description:
          "Uses the design system's transient feedback pattern, not an inline div, alert dialog, or blocking overlay",
        weight: 0.5,
        critical: true
      },
      {
        id: "non-intrusive",
        description:
          "Feedback does not steal focus and announces politely to assistive tech",
        weight: 0.3
      },
      {
        id: "concise-copy",
        description:
          "The message copy is concise and specific about what succeeded",
        weight: 0.2
      }
    ]
  }
];
