# Scheduler (ProSched)

Scheduling Webapp for production planning and resource scheduling.

# Table of contents
* About
* Features
* Screenshots
* Getting started (local)
* Usage
* Contributing

# About
A scheduling web application built with Next.js and TypeScript for planning, tracking, and exporting production schedules.

# Features
* Gantt chart view
* Weekly and downloadable schedules
* Production tracking and sheet integration
* Race/die differentiator and view-by-dies
* Schedule settings and configuration


To get started, take a look at src/app/page.tsx.

<p align="center"> <img src="./assets/screenshots/main%20view.png" alt="Main view" width="500" /> <img src="./assets/screenshots/gantt%20chart.png" alt="Gantt chart" width="500" /> </p> <details> <summary><strong>More views</strong> — click to expand</summary> <p align="center"> <img src="./assets/screenshots/weekly%20schedule.png" alt="Weekly schedule" width="380" /> <img src="./assets/screenshots/schedule%20downloadable.png" alt="Downloadable schedule" width="380" /> </p>
Short descriptions:

Weekly schedule: compact, week-focused schedule view.
Downloadable schedule: exportable/downloadable schedule layout.
</details> <details> <summary><strong>Additional screens</strong> — click to expand</summary> <p align="center"> <img src="./assets/screenshots/Production%20tracking.png" alt="Production tracking" width="380" /> <img src="./assets/screenshots/Schedule%20Setting.png" alt="Schedule Setting" width="380" /> </p>
Short descriptions:

Production tracking: track production quantities and status.
Schedule settings: configure scheduling parameters and preferences.
</details> <details> <summary><strong>Integration & filters</strong> — click to expand</summary> <p align="center"> <img src="./assets/screenshots/Sheet%20integration.png" alt="Sheet integration" width="380" /> <img src="./assets/screenshots/View%20by%20dies.png" alt="View by dies" width="380" /> </p>
Short descriptions:

Sheet integration: connect to sheets for import/export of schedule data.
View by dies: filter and view schedule items grouped by die.
</details> <details> <summary><strong>Small tools</strong> — click to expand</summary> <p align="center"> <img src="./assets/screenshots/die%20differenciator.png" alt="Die differenciator" width="480" /> </p>
Short description:

Die differentiator: helper tool for distinguishing dies or variants.
</details>

### Running Locally on Your PC

You can run this application on your local machine (like a Windows PC) for development and testing. You don't need to convert it to a desktop application. Here's how:

### Prerequisites

1.  **Install Node.js**: If you don't have it installed, download and install the "LTS" (Long Term Support) version of Node.js from the official website: [https://nodejs.org/](https://nodejs.org/)
    *   Node.js includes `npm` (Node Package Manager), which you'll need to install the project's dependencies.

### Important — Read these scripts before using the app

Before you run or modify any Apps Script or change the sheet structure, read the following files in the docs/ folder:

- [get-urls-apps-script.js](./docs/get-urls-apps-script.js)  
  Fetches URLs from the Google Sheet. Configure this script with the correct sheet ID and default sheet name before running.

- [google-apps-script.js](./docs/google-apps-script.js)  
  Handles scheduled-time behavior and sheet updates. Note: scheduled time values are not forwarded to the molding sheet in the same format — check the comments for handling of JC numbers and start times.

- [production-conditions-apps-script.js](./docs/production-conditions-apps-script.js)  
  Contains production-condition logic and mappings (for example, producing item `GCH_S121_NBR` with die `569`). Review these rules before changing production or die assignments.

Why read these first
- These scripts contain configuration values and logic that affect how data moves between sheets and how schedules are generated.
- Changing sheet columns or IDs without updating the scripts can break imports/exports.
- Review the inline comments in each file for environment-specific instructions and examples.

Need adjustments?
- I can add this snippet into README.md or create docs/README.md and commit it on a new branch (suggested: add-docs-index). Reply with:
  - A to create a new branch and commit (provide branch name or accept default add-docs-index), or
  - B to overwrite README.md on master, or
  - C to just get the snippet (you’ll paste it yourself).

### Initial Setup

1.  **Open a Terminal**: Open a command prompt, PowerShell, or any other terminal on your Windows PC.
2.  **Navigate to Project Directory**: Use the `cd` command to go to the folder where your project files are saved.
3.  **Install Dependencies**: Run the following command. This will download and install all the necessary packages listed in your `package.json` file. **You only need to do this once.**
    ```bash
    npm install
    ```

### Easy Desktop Launch (Click to Run)

After the initial setup, you can start the application easily without opening a terminal manually.

1.  **Find `start-local.bat`**: In your project folder, you will find a new file named `start-local.bat`.
2.  **Double-Click to Run**: Simply double-click this file. It will automatically:
    *   Open a new terminal window for the server (keep this window open).
    *   Wait a few seconds for the server to be ready.
    *   Open the ProSched application in your default web browser.

**For a true desktop experience:**

*   Right-click on `start-local.bat` and select **"Send to > Desktop (create shortcut)"**.
*   Go to your desktop, rename the new shortcut to "ProSched".
*   You can even change the icon! Right-click the shortcut, go to **Properties > Shortcut > Change Icon...**.

### Manual Start

If you prefer to start the server manually:

1.  **Start the Development Server**: In your terminal, run this command:
    ```bash
    npm run dev
    ```
2.  **View Your App**: Open your web browser and go to the address shown in the terminal, which is usually `http://localhost:9002`.

Your application is now running locally! Any changes you save to the code will automatically be reflected in your browser.

## Downloading Your Project

You can download a `.zip` file of your entire project to your local computer. While there is usually a "Download Code" top in the top toolbar.

### Step-by-Step Guide

# Usage
* Use the main view to create and edit schedules.
* Export or download schedules from the "Download" option.
* Use the Gantt chart for timeline-based visualization.
* Configure schedule settings from the settings panel.

# Contributing
* Create a branch for your change: git checkout -b my-feature
* Commit and push, then open a pull request. 
