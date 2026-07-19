# 📋 Full-Stack Task Management Workspace (React Native & Node.js)

A production-ready mobile task management workspace built with React Native (CLI) and a Node.js/Express backend. This application features JWT-based authentication, real-time task CRUD workflows, a custom Android-proof scheduling engine, and hardware-level session security.

---

## 🌟 Key Engineering Highlights

* **Hardware Back-Button Security:** Implements `navigation.reset()` during the logout flow to completely destroy the navigation stack. This prevents unauthorized users from accessing the protected workspace by pressing the physical Android back button after logging out.
* **Android Hermes-Proof Date Engine:** Bypasses JavaScript Hermes engine string-parsing limitations (`NaN` / `Invalid Date` crashes) by compiling custom numerical date constructors (`new Date(year, monthIdx, day, hour, minute)`) for 100% reliable background calculations.
* **Dynamic 3-Tier Urgency Engine:** Automatically evaluates active tasks against the real-time system clock and categorizes them into distinct visual states:
  * **🚨 OVERDUE:** Tasks past their due timestamp trigger a bold red border, pinkish background blush, and an overdue warning badge.
  * **⏳ DUE SOON:** Tasks scheduled within the next 24 hours trigger an amber border, warm cream tint, and a countdown badge.
  * **NORMAL / UNSCHEDULED:** Tasks further out or saved without deadlines maintain a clean, professional slate appearance.
* **Custom "DOB-Style" Wheel Pickers:** Built entirely with native React Native primitives (`ScrollView`, `TouchableOpacity`) to provide 3-column slot-machine selection for dates (`Month` | `Day` | `Year`) and military-supported times (`Hour` | `Minute` | `Period`), eliminating manual keyboard typing and native external dependency crashes.
* **Master Schedule Switch:** Allows users to dynamically toggle between timestamped scheduling (including zero-hour `'00'` midnight support) and clean `"No Deadline"` / `"Unscheduled"` entries.

---

## 📁 Repository Structure

```text
├── TodoApp/              # React Native (CLI) mobile client
│   ├── android/          # Android native Gradle project
│   ├── ios/              # iOS native Xcode project
│   ├── src/
│   │   ├── screens/      # UI Screens (AuthScreen, TaskListScreen, AddTaskScreen)
│   │   └── services/     # Axios API configuration & interceptors
│   ├── App.tsx           # Navigation container & root stack
│   └── package.json      # Frontend dependencies
│
└── todo-backend/         # Node.js / Express REST API & Database
    ├── src/              # Route controllers, database models, and auth middleware
    ├── .env              # Environment secrets (Port, MongoDB URI, JWT Secret)
    └── package.json      # Backend dependencies

```
## 🔑 Quick-Test Credentials for Evaluators

To skip registration and test the app immediately, use the following pre-configured credentials:

* Email:admin
* Password: trial

---

## 🚀 Step-by-Step Setup Guide

### 1. Prerequisites

Ensure your local development environment has the following installed:

* **Node.js** (v18 or higher)
* **MongoDB** (Running locally or a MongoDB Atlas connection string)
* **React Native CLI & Android Studio** (With an active Android Emulator or physical device connected via USB/ADB)

### 2. Backend Setup (`todo-backend`)

1. Open a terminal and navigate into the backend directory:
bash
cd todo-backend


2. Install Node dependencies:
bash
npm install

3. Create a `.env` file in the root of `todo-backend` and add your environment variables:
env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/todoapp
JWT_SECRET=your_super_secret_jwt_key

4. Start the backend server:
bash
# For development with auto-reload:
npm run dev

# OR standard Node execution:
npm start

*The terminal should confirm: `Server running on http://0.0.0.0:5001`.*

### 3. Frontend Setup (`TodoApp`)

1. Open a **new, separate terminal tab** and navigate into the mobile client directory:
bash
cd TodoApp

2. Install React Native dependencies:
bash
npm install

3. **Configure API Network Routing:**
Open src/services/api.ts and verify the baseURL matches your testing hardware:
typescript
// For Android Emulator (maps to localhost on Mac/PC):
const API_URL = '[http://10.0.2.2:5001/api](http://10.0.2.2:5001/api)';

// For Physical Android Device (replace with your computer's Wi-Fi IP):
// const API_URL = '[http://192.168.1.](http://192.168.1.)XX:5001/api';

// For iOS Simulator:
// const API_URL = '[http://127.0.0.1:5001/api](http://127.0.0.1:5001/api)';

4. **Connect Physical Android Device (If using USB):**
Forward the backend and Metro bundler ports over ADB so your phone can communicate with your computer:
bash
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5001 tcp:5001

### 4. Running the Application

1. Start the React Native Metro Bundler:
bash
npx react-native start

2. In another terminal tab (inside TodoApp), launch the app on your target platform:
bash
# Launch on Android (Emulator or USB connected device):
npx react-native run-android

# Launch on iOS Simulator (macOS only):
npx react-native run-ios
