# TaskManager — Cross-Platform Mobile App

A full-stack mobile productivity app built with **React Native** and **TypeScript**, backed by a **Node.js/Express** REST API with a persistent **MongoDB Atlas** database. Deployed on **Render** and runs on both iOS and Android via Expo.

---

## Screenshots

> Add screenshots

---

## Features

### Task Management
- Create, edit, complete, and delete tasks
- Priority levels — High, Medium, Low with colour-coded chips
- Category filtering — Work, Personal, Study, General
- Dynamic tag system with colour-coded badges
- Due dates with overdue detection and warnings
- Filter by status (All / Pending / Completed) and sort by due date, priority, or title

### Subtasks
- Break any task into subtasks manually or via AI
- Accordion expand/collapse on the task list to view subtasks
- Toggle individual subtask completion inline
- Edit or delete subtasks after saving
- Progress bar showing how many subtasks are done
- Next incomplete subtask surfaced automatically — no manual "next action" field needed

### AI Planning
- Tap "Plan it with AI" when creating or editing a task
- AI (Llama 3.3 70B via Groq) breaks the task into 4–7 subtasks with time estimates, energy levels, and a description per step
- Attach photos or PDFs for additional context
- Edit any AI-generated subtask before saving
- When re-planning a task that already has subtasks, choose to replace them or add to them
- Feasibility check — AI flags if the time budget seems unrealistic

### Launch Me
- Select a time window (15m, 30m, 1h, 1h 30m, 2h) and see the top 3 tasks that fit
- For projects with subtasks, shows only the next incomplete subtask — not the whole project
- Customisable energy schedule (morning / afternoon / evening) saved to device
- Start any task directly into Focus Mode

### Focus Mode
- Full-screen timer with a visual ring
- Warning shown when time estimate is exceeded
- Three-step exit flow: rate how it felt → mark done or not → note where you left off
- Focus sessions logged without auto-completing the task

### Productivity
- Weighted productivity score on the task list
- Score accounts for subtask completion ratios, not just binary task completion
- Score stays consistent regardless of which filters are active
- Push notification reminders for tasks with due dates

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile (iOS + Android) |
| Expo SDK 54 | Development toolchain and build system |
| TypeScript | Type safety across the codebase |
| React Navigation | Stack navigation |
| React Native Paper | Material Design component library |
| AsyncStorage | Local persistence for user preferences |
| expo-image-picker / expo-document-picker | File attachments for AI context |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB Atlas | Cloud-hosted persistent database |
| Mongoose | Schema validation and ODM |
| Groq (Llama 3.3 70B) | AI subtask planning |
| Render | Backend deployment and hosting |

---

## Getting Started

The backend is already live — no local server setup needed. You can hit the API directly at `https://taskmanager-pn0w.onrender.com`.

### Prerequisites
- Node.js 18+
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Run the app

```bash
git clone https://github.com/NAVYAB541/TaskManager.git
cd TaskManager/frontend
npm install
npx expo start --no-web
```

Scan the QR code with Expo Go. The app connects to the live Render backend automatically — no extra config needed.

---

## API Reference

Base URL: `https://taskmanager-pn0w.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | Get all tasks — supports `?completed=`, `?category=`, `?tag=`, `?parentTaskId=` |
| GET | `/tasks/:id` | Get a single task |
| POST | `/tasks` | Create a task |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |
| POST | `/tasks/bulk` | Bulk-create subtasks in one request |
| POST | `/tasks/:id/complete-focus` | Log a focus session for a task |
| POST | `/ai/plan-task` | Generate an AI subtask plan |

### Task schema

```json
{
  "id": "string",
  "title": "string (required)",
  "description": "string",
  "dueDate": "ISO date string | null",
  "priority": "low | medium | high",
  "completed": "boolean",
  "category": "string",
  "tags": ["string"],
  "estimateMinutes": "number",
  "energy": "high | medium | low | null",
  "parentTaskId": "string | null",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Project Structure

```
TaskManager/
├── backend/
│   ├── server.js          # Express app, Mongoose models, all routes, AI endpoint
│   ├── .env               # Local env vars (gitignored)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── screens/
    │   │   ├── TaskListScreen.tsx      # Main list, filters, productivity score, accordion subtasks
    │   │   ├── AddTaskScreen.tsx       # Create task with manual subtasks and AI planning prompt
    │   │   ├── TaskDetailsScreen.tsx   # Edit task, manage subtasks, re-plan with AI
    │   │   ├── AIPlannerScreen.tsx     # AI breakdown flow with file attachments
    │   │   ├── LaunchMeScreen.tsx      # Time-windowed task picker with energy preferences
    │   │   └── FocusModeScreen.tsx     # Full-screen focus timer with session logging
    │   ├── constants/
    │   │   └── Theme.ts                # Colour tokens
    │   └── utils/
    │       └── notifications.ts        # Push notification helpers
    ├── app.json
    └── package.json
```

---

## Security

- MongoDB credentials stored as environment variables only — never hardcoded
- Atlas cluster secured with IP allowlist and scoped database user permissions
- `.env` excluded from version control via `.gitignore`
- Render environment variables used for all production secrets
- Groq API key stored server-side only — never exposed to the client

---

## Author

**Navya Bhutoria**
[LinkedIn](https://linkedin.com/in/navya-bhutoria) · [GitHub](https://github.com/NAVYAB541)
