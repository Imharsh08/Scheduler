
# ProSched Application Documentation

## 1. Introduction

ProSched is an advanced web application designed for industrial production scheduling, specifically for press-based manufacturing. It provides a highly interactive and intelligent interface for managers to load unscheduled jobs, assign them to specific presses and shifts, and optimize the production timeline. The application is built with a modern web stack and integrates with Google Sheets for data input and output, and it uses AI for process validation.

---

## 2. Core Features

- **Task Management**: Load unscheduled tasks directly from a Google Sheet. Tasks have properties like priority, quantity, and delivery dates.
- **Press Workload Visualization**: See an at-a-glance overview of the total workload (pending vs. scheduled) for each press.
- **Interactive Scheduling**:
    - **Drag & Drop**: Drag tasks from the unscheduled list directly onto a shift slot.
    - **Click-to-Schedule**: Use a dropdown menu on a task card to quickly assign it to a specific shift.
- **AI-Powered Validation**: Before a task is scheduled, the system validates if the chosen Press and Die combination is valid for the task's item and material, preventing impossible production runs.
- **Ideal Schedule Generation**: For any given press, click a button to have the application automatically generate an optimized schedule based on task priority and delivery dates.
- **Gantt Chart View**: Visualize the schedule for a selected press in a Gantt chart format, showing task timelines and vacant periods.
- **Data Integration**:
    - Load all necessary data (Tasks, Production Conditions) from different Google Sheets using a centralized configuration.
    - Save the final, completed schedule back to a Google Sheet.
- **Customization**:
    - **Die Colors**: Assign unique colors to different dies for easy visual identification on the schedule grid.
- **Reporting**:
    - **View All Tasks**: See a master list of every scheduled task across all presses.
    - **PDF Download**: Generate and download a PDF summary of the schedule for all presses or a single press.

---

## 3. Component Breakdown

The application is built with React and Next.js. Here are the key components in `src/components/`:

- **`page.tsx`**: The main application component. It holds and manages all the primary state for the application (tasks, schedules, shifts, etc.) and passes data and functions down to child components.
- **`Header.tsx`**: The top navigation bar. It contains primary actions like "Save Schedule," "Download PDF," and a menu for accessing settings, integrations, and view modes.
- **`PressWorkloadPanel.tsx`**: Displays a horizontally scrolling list of `PressWorkloadCard` components. It calculates the workload for each press and allows the user to select a press, which filters the rest of the UI.
- **`TaskList.tsx`**: The panel that displays the list of `TaskCard` components for unscheduled jobs. It includes functionality to load tasks from the Google Sheet and sorts them by priority and delivery date.
- **`ScheduleGrid.tsx`**: The main scheduling area. It displays a 7-day week, with columns for each day containing `ShiftSlot` components. This is the drop target for scheduling tasks.
- **`ShiftSlot.tsx`**: Represents a single shift (e.g., Monday Day). It displays its capacity, progress, and a list of `ScheduledTaskCard`s that have been assigned to it.
- **`ScheduledTaskCard.tsx`**: A compact card representing a task that has been placed on the schedule. It shows key details and is color-coded by its die number. It includes buttons to edit or remove the task.
- **`TaskCard.tsx`**: A card representing an unscheduled task in the `TaskList`. It displays all job details and provides the drag handle and the click-to-schedule menu.
- **`ValidationDialog.tsx`**: A multi-step modal that appears when a user tries to schedule a task. It handles die selection, operation type selection, quantity adjustment, and both single-shift and multi-shift planning.
- **`GanttChartView.tsx`**: An alternative view to the `ScheduleGrid`. It uses the `recharts` library to display a Gantt chart for the selected press, including bars for vacant time.
- **Dialogs**:
    - `IntegrationDialog.tsx`: Manages the Google Sheet URLs.
    - `ColorSettingsDialog.tsx`: Allows users to assign colors to dies.
    - `ProductionConditionsDialog.tsx`: A read-only view of all loaded manufacturing conditions.
    - `AllScheduledTasksDialog.tsx`: A master table view of all scheduled jobs.
    - `EditScheduledTaskDialog.tsx`: A modal for adjusting the quantity of an already-scheduled task.

---

## 4. Key Logic and Algorithms

### State Management (`page.tsx`)

The application uses React's `useState` hook for all state management. There is no external state management library like Redux. The key state variables are:

- `tasks`: An array of unscheduled `Task` objects.
- `scheduleByPress`: A record where keys are press numbers and values are `Schedule` objects. This is the master data structure for all scheduled items.
- `shiftsByPress`: A record where keys are press numbers and values are an array of `Shift` objects for the week. This tracks shift capacity.
- `productionConditions`: An array of all possible manufacturing combinations (item, press, die, etc.).
- `selectedPress`: The currently active press number, used to filter the UI.

### Scheduling Logic (`ValidationDialog.tsx` and `page.tsx`)

1.  **Initiation**: A user drags a task or uses the "Schedule" menu. This triggers the `ValidationDialog` to open with the `ValidationRequest` object.
2.  **Validation**:
    - The user selects a die number for the job.
    - The `validatePressDieCombination` AI flow is called. This flow checks if a matching entry exists in the `productionConditions` array for the given item, material, press, and die.
    - If valid, the dialog proceeds. If not, an error is shown.
3.  **Operation & Quantity**:
    - The user selects the operation type (One Side vs. Two Side). This determines the `piecesPerCycle`.
    - The user confirms or adjusts the quantity to schedule.
4.  **Time Calculation**: The dialog calculates the total `timeTaken` based on: `Math.ceil(quantity / piecesPerCycle) * cureTime`.
5.  **Confirmation & State Update**:
    - **Single Shift**: If the `timeTaken` fits in the target shift's `remainingCapacity`, a single `ScheduledTask` object is created.
    - **Multi-Shift**: If it doesn't fit, the user can opt to schedule across multiple shifts. The logic then iterates through subsequent shifts, filling them one by one until the total quantity is scheduled.
    - The `onSuccess` callback is called, and `page.tsx` updates the `scheduleByPress`, `shiftsByPress`, and `tasks` states accordingly.

### Ideal Schedule Generation (`/lib/scheduler.ts`)

The `generateIdealSchedule` function is the core of the automated scheduling feature.

1.  **Gather & Sort Tasks**: It takes all tasks that can be run on the selected press and sorts them. The primary sort key is `priority` ('High' > 'Normal' > 'Low'), and the secondary key is `deliveryDate` (earlier dates first).
2.  **Find Best Condition**: For each task, it finds the most efficient `ProductionCondition` (the one with the highest `piecesPerCycle`).
3.  **Greedy Algorithm**: It iterates through the sorted tasks. For each task, it iterates through the available shifts in chronological order.
4.  **Fill Shifts**: It fills each shift with as much of the current task as possible, creating `ScheduledTask` objects for each placement. If a task is too large for one shift, it continues placing the remaining quantity in the next available shift.
5.  **Return Result**: The function returns a `newSchedule` object for the press, the updated `newShifts` array with correct remaining capacities, and the list of `remainingTasks` that couldn't be scheduled.

---

## 5. Styling and CSS

- **Tailwind CSS**: The project uses Tailwind CSS for all styling. It's a utility-first framework that allows for rapid UI development by composing utility classes (e.g., `p-4`, `flex`, `text-lg`).
- **ShadCN UI**: The UI components (`Button`, `Card`, `Dialog`, etc.) are from the ShadCN UI library. These are not traditional library components but rather pre-built recipes of code using Tailwind CSS that are added directly to the project, making them fully customizable.
- **CSS Variables (Theming)**: The color scheme is defined in `src/app/globals.css`. It uses HSL CSS variables for easy theming. For example, `--primary` and `--background` are defined for both light and dark mode. This allows the entire application's color scheme to be changed by modifying a few lines in this file.
- **Custom Fonts**: The `Inter` (body) and `Space Grotesk` (headline) fonts are imported from Google Fonts in `src/app/layout.tsx`. They are configured in `tailwind.config.ts` and applied throughout the app using the `font-body` and `font-headline` utility classes.
- **`cn` Utility (`/lib/utils.ts`)**: This is a helper function that combines `clsx` and `tailwind-merge`. It is used everywhere to conditionally apply Tailwind classes, making the component code cleaner and preventing CSS class conflicts.

---

## 6. Data Integration (Google Apps Script)

The application does not connect to Google Sheets directly from the user's browser due to security (CORS) policies. Instead, it uses a proxy-based approach.

1.  **Google Apps Scripts (`/docs/*.js`)**:
    - **`get-urls-apps-script.js`**: A script deployed as a web app that reads a central "Web Url" sheet. This sheet contains the URLs for the other two scripts. This allows the user to configure the entire application with a single URL.
    - **`google-apps-script.js`**: Fetches the list of unscheduled tasks from the "FMS 2" sheet. It also contains the `doPost` function to save the final schedule back to the "Molding Sheet".
    - **`production-conditions-apps-script.js`**: Fetches the manufacturing data from the "Manufacturing details" sheet.
2.  **Next.js API Routes (Proxy)**:
    - `src/app/api/tasks/route.ts`: This is a server-side route in the Next.js app. The front-end sends it a Google Apps Script URL. This route then fetches the data from Google on the server and forwards the JSON response back to the front-end, bypassing browser CORS restrictions.
    - `src/app/api/schedule/route.ts`: Similarly, this route receives the final schedule and the "Save" URL from the front-end, then makes the `POST` request to the Google Apps Script to save the data.

---

## 7. AI Integration

The AI functionality is implemented using **Genkit**, Google's framework for building AI-powered applications.

- **`src/ai/flows/validate-press-die-combination.ts`**:
    - This file defines a Genkit "flow," which is a server-side function that can incorporate AI models.
    - The `validatePressDieCombinationFlow` is the core function.
    - **Current Logic**: Currently, this flow does **not** make a call to a Large Language Model (LLM). For speed and reliability, it performs a simple and deterministic check: it parses the `productionConditions` JSON string and uses the JavaScript `some()` method to see if a condition exists that matches the `itemCode`, `pressNo`, `dieNo`, and `material`.
    - **Structure**: Although the logic is simple JavaScript, it is structured as a Genkit flow. This provides a robust framework that could easily be enhanced in the future to use an LLM for more complex, fuzzy, or "best-guess" validations if needed, without changing the calling code in the front-end.
