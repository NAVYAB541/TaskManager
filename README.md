# Task Manager — Cross-Platform Mobile App

A full-stack mobile task management app built with **React Native** and **TypeScript**, backed by a **Node.js/Express** REST API with a persistent **MongoDB Atlas** database. Deployed on **Render** and runs on both iOS and Android via Expo.

---

## Screenshots

> Add screenshots

---

## Features

- Create, edit, complete, and delete tasks
- Priority levels — High, Medium, Low (colour-coded)
- Category filtering — Work, Personal, Study, General
- Dynamic tag system with colour-coded badges
- Due dates with overdue detection and warnings
- Weighted productivity score based on completed task priorities
- Push notification reminders for upcoming tasks
- Filter by status (All / Pending / Completed) + sort by due date, priority, or title
- Persistent storage via MongoDB Atlas — data survives server restarts

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| React Native | Cross-platform mobile (iOS + Android) |
| Expo | Development toolchain & build system |
| TypeScript | Type safety across the codebase |
| React Navigation | Stack + tab navigation |
| AsyncStorage | Local caching |

### Backend
| Technology | Purpose |
|---|---|
| Node.js + Express | REST API server |
| MongoDB Atlas | Cloud-hosted persistent database |
| Mongoose | Schema validation & ODM |
| Render | Backend deployment & hosting |

---

## Getting Started

> The backend is already live — no local server setup needed. You can hit the API directly at `https://taskmanager-pn0w.onrender.com`.

### Prerequisites
- Node.js 18+
- Expo Go app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Run the app

```bash
git clone https://github.com/NAVYAB541/task-manager.git
cd task-manager/frontend
npm install
npx expo start
```

Scan the QR code with Expo Go. The app points to the live Render backend out of the box — no extra config needed.

---

## API Reference

Base URL: `https://taskmanager-pn0w.onrender.com`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/tasks` | Get all tasks (supports `?completed=`, `?category=`, `?tag=`) |
| GET | `/tasks/:id` | Get a single task |
| POST | `/tasks` | Create a new task |
| PUT | `/tasks/:id` | Update a task |
| DELETE | `/tasks/:id` | Delete a task |
| GET | `/health` | Health check |

### Example — Create a task

```bash
curl -X POST https://taskmanager-pn0w.onrender.com/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Finish resume",
    "priority": "high",
    "category": "Personal",
    "tags": ["career", "urgent"],
    "dueDate": "2025-03-01"
  }'
```

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
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Project Structure

```
task-manager/
├── backend/
│   ├── server.js          # Express app + Mongoose models + all routes
│   ├── .env               # Local env vars (gitignored)
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── screens/
    │   │   ├── TaskListScreen.tsx    # Main list with filters + productivity score
    │   │   ├── AddTaskScreen.tsx     # Create new task
    │   │   └── TaskDetailsScreen.tsx
    │   ├── constants/
    │   │   └── Theme.ts              # Colour tokens
    │   ├── types/
    │   │   └── index.ts              # Shared TypeScript types
    │   └── utils/
    │       └── notifications.ts      # Push notification helpers
    ├── app.json
    └── package.json
```

---

## Security

- MongoDB credentials stored as environment variables only — never hardcoded
- Atlas cluster secured with IP allowlist and scoped database user permissions
- `.env` excluded from version control via `.gitignore`
- Render environment variables used for all production secrets

## 👩‍💻 Author

**Navya Bhutoria**  
[LinkedIn](https://linkedin.com/in/navya-bhutoria) · [GitHub](https://github.com/NAVYAB541)
