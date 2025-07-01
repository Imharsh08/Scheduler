# ProSched Application Documentation

## 1. Introduction

ProSched is an advanced web application designed for industrial production scheduling, specifically for press-based manufacturing. It provides a highly interactive and intelligent interface for managers to load unscheduled jobs, assign them to specific presses and shifts, and optimize the production timeline. This document details the application's appearance, user workflow, and underlying technical architecture.

---

## 2. The Main Interface: A Visual Tour

Upon launching ProSched, the user is presented with a clean, organized, and data-rich interface divided into four main sections:

1.  **Header**: The top bar containing the application title, primary actions like saving the schedule, and a menu for settings and other features.
2.  **Press Workload Panel**: A horizontally-scrolling overview of each press, its current workload, and an option to auto-generate an ideal schedule.
3.  **Unscheduled Tasks Panel**: A vertical list on the left, displaying all jobs waiting to be scheduled.
4.  **Schedule Grid**: The main canvas on the right, representing the weekly or monthly timeline where tasks are placed.

The overall appearance is modern and professional, utilizing a clear font hierarchy (`Space Grotesk` for headlines, `Inter` for body text) and a consistent color scheme defined in `globals.css`. The use of `Card` components from ShadCN UI gives the interface a structured, modular feel with rounded corners and subtle shadows.

---

## 3. Core Workflow: Scheduling a Job from Start to Finish

This section follows the typical user journey for scheduling a production task.

### Step 1: Loading Initial Data

Before scheduling can begin, the necessary data must be loaded from Google Sheets.

1.  **Open Integrations**: Click the **Menu** icon in the header and select **Integrations**.
2.  **Provide Config URL**: In the dialog, paste the single Google Apps Script "Configuration URL". This URL points to a special script that provides the links to your other data sheets.
3.  **Load Links & Data**: Click **Load**. The application will fetch the URLs for tasks and production conditions and then automatically load all the data, showing toast notifications for success or failure. This proxy-based approach (using Next.js API routes) bypasses browser security restrictions.

### Step 2: Understanding the View

With data loaded, the panels populate with information.

-   **Press Workload Panel**: Each press gets a `PressWorkloadCard`.
    -   **Appearance**: Shows the press number, pending vs. in-process quantities, and a progress bar indicating how much of the total work for that press is scheduled.
    -   **Interaction**: Clicking a card selects that press, filtering the **Unscheduled Tasks** list to show only compatible jobs and displaying the press's schedule in the **Schedule Grid**. The selected card is highlighted with a primary color border.
-   **Unscheduled Tasks Panel**: Each unscheduled job is a draggable `TaskCard`.
    -   **Appearance**: Displays the Job Card number, item code, quantity, and material. Badges clearly indicate priority (`High` is red, `Normal` is blue, etc.) and available die numbers for that job. It also shows the delivery date and how long the task has been waiting.
    -   **Interaction**: The primary interaction is dragging these cards onto the **Schedule Grid**. A "Schedule" button with a dropdown is also available for click-based scheduling.

### Step 3: Placing a Task on the Schedule

This is the core drag-and-drop interaction.

1.  **Drag**: Click and drag a `TaskCard` from the list.
2.  **Drop**: Drop the card onto a `ShiftSlot` (e.g., "Monday Day") in the **Schedule Grid**. The slot will highlight to indicate it's a valid drop target.
3.  **Validation Dialog Appears**: This multi-step modal guides the user through the final scheduling details.
    -   **Die Selection**: The user selects a valid die for the job from a dropdown. If only one is possible, it's auto-selected. The application then performs a validation check.
    -   **Operation Selection**: If valid, the user selects the operation type (e.g., "One Side" or "Two Side"). The pieces-per-cycle for each option are clearly displayed.
    -   **Quantity & Confirmation**: The user confirms the quantity to schedule. The dialog shows a detailed calculation of the required time.
4.  **Task Appears on Grid**: Upon confirmation, a new `ScheduledTaskCard` appears in the target shift.
    -   **Appearance**: This card is more compact. It's color-coded based on the die number used (customizable in **Die Color Settings**). It displays the job number, quantity, material, and the calculated start/end times.
    -   **Shift Updates**: The progress bar and remaining time in the `ShiftSlot` update instantly.

### Step 4: Adjusting the Schedule

-   **Moving Tasks**: A `ScheduledTaskCard` can be dragged from one shift and dropped onto another. The system validates if the new shift has enough capacity. If valid, the task moves, and the start/end times for all tasks in both the source and destination shifts are automatically recalculated to keep the schedule compact.
-   **Editing Tasks**: Hovering over a scheduled task reveals a pencil icon. Clicking it opens a dialog to adjust the scheduled quantity or other parameters.
-   **Removing Tasks**: A cross icon also appears on hover. Clicking it brings up a confirmation dialog to prevent accidental removal. If confirmed, the task is removed from the schedule, and its quantity is returned to the unscheduled task list.

### Step 5: Handling Large Jobs (Multi-Shift Scheduling)

If a user tries to schedule a quantity that requires more time than is available in a single shift:
1.  The "Confirm" button in the validation dialog changes to **"Schedule Across Multiple Shifts"**.
2.  Clicking this opens a new view showing a proposed plan, breaking the job down into smaller chunks across consecutive available shifts.
3.  The user can review this plan and confirm, at which point the application populates the schedule grid with all the planned chunks.

---

## 4. Advanced Views and Features

-   **Ideal Schedule Generation**: On each `PressWorkloadCard`, a "Ideal Schedule" button (`<Zap>` icon) allows the user to automatically generate an optimized schedule for that press. The underlying algorithm (`/lib/scheduler.ts`) sorts all compatible tasks by priority and delivery date and then fills the shifts chronologically with the most efficient production conditions.
-   **Gantt Chart View**: Accessible from the header menu, this view transforms the schedule grid into a horizontal bar chart. Each bar represents a task or a block of vacant time, providing a clear visual timeline of production for the selected press. Task bars are color-coded by die number.
-   **View All Tasks**: A dialog that shows a master table of every single task scheduled across all presses, sorted by press and time. This is useful for a high-level overview.
-   **PDF Download**: Users can download a PDF summary of the schedule for a single press or all presses. The PDF is a clean, tabular report of the data from the "View All Tasks" dialog.

---

## 5. Visual Design, Styling, and CSS

The application's professional appearance is achieved through a combination of Tailwind CSS and ShadCN UI.

-   **Component Library (ShadCN UI)**: Core UI elements like `Button`, `Card`, `Dialog`, `Input`, etc., are from ShadCN UI. These are not just imported components but pre-built, fully customizable code recipes that live inside the `src/components/ui/` directory, ensuring a consistent look and feel.
-   **Utility-First Styling (Tailwind CSS)**: All custom styling is done by applying Tailwind's utility classes (e.g., `p-4`, `flex`, `text-lg`). This allows for rapid development without writing custom CSS files.
-   **Theming and Colors**: The entire color scheme is controlled by CSS variables in `src/app/globals.css`. Variables like `--primary`, `--secondary`, and `--background` are defined for both light and dark modes using HSL values. This makes it trivial to change the application's theme by editing a few lines in one file.
-   **Typography**: The app uses two custom fonts from Google Fonts: `Inter` for body text and `Space Grotesk` for headlines. These are configured in `tailwind.config.ts` and applied globally.
-   **`cn` Utility**: A helper function in `src/lib/utils.ts` merges `clsx` and `tailwind-merge`. It is used extensively to conditionally apply Tailwind classes, making component code cleaner and preventing style conflicts.

---

## 6. Accessibility (a11y)

Accessibility is a key consideration to ensure the app is usable for everyone.
-   **Semantic HTML**: Using elements like `<header>`, `<main>`, `<button>`, and `<table>` provides inherent meaning for screen readers.
-   **Keyboard Navigation**: All interactive elements are focusable and operable via the keyboard, including dialogs and dropdowns. This is largely provided by the accessible Radix UI primitives that ShadCN components are built on.
-   **Focus Management**: Dialogs properly trap keyboard focus, and when closed, focus is returned to the element that opened them.
-   **ARIA Attributes**: `aria-label` is used for icon-only buttons to provide text descriptions for assistive technologies.
-   **Color Contrast**: The default color theme is designed to meet WCAG AA contrast standards.

---

## 7. Technical Architecture Overview

-   **Framework**: Next.js with the App Router and TypeScript.
-   **State Management**: Relies solely on React's built-in `useState` and `useEffect` hooks. State is managed centrally in `page.tsx` and passed down as props. All state updates follow immutable patterns to ensure predictable re-renders.
-   **Data Integration**: Uses a proxy pattern for fetching data from Google Sheets. The frontend calls a Next.js API route (`/api/tasks`), which in turn calls the Google Apps Script URL on the server. This avoids browser CORS issues.
-   **AI Validation**: Uses **Genkit** for its AI flow structure, even though the current validation logic is a simple JavaScript check for performance and reliability. The flow (`/ai/flows/validate-press-die-combination.ts`) is designed to be easily upgradable to use a true LLM in the future without changing the frontend code.
