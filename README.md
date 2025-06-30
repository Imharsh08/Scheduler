# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Running Locally on Your PC

You can run this application on your local machine (like a Windows PC) for development and testing. You don't need to convert it to a desktop application. Here's how:

### Prerequisites

1.  **Install Node.js**: If you don't have it installed, download and install the "LTS" (Long Term Support) version of Node.js from the official website: [https://nodejs.org/](https://nodejs.org/)
    *   Node.js includes `npm` (Node Package Manager), which you'll need to install the project's dependencies.

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
