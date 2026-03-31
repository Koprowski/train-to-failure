# PRD: Workout Time Tracking

**Resumability:** To pick up this work in a new session, read this file first. Find the first `[ ]` or `[~]` item and continue from there. All implementation is in `src/app/workouts/new/page.tsx` unless noted.

---

## Context

Competitor analysis (Hevy, Strong, Liftin') shows that workout timing is a core UX feature. Current state:

- `Workout.startedAt` / `finishedAt` / `duration` exist in schema ✅
- `WorkoutExercise.startedAt` / `finishedAt` / `duration` exist in schema ✅
- `WorkoutSet.restSecs` exists in schema ✅ (unused — perfect for Phase 2)
- Per-exercise stopwatch exists in code but is hidden (no UI)
- `finishWorkout()` calculates duration as **sum of exercise elapsed times** — this is wrong; it should be wall-clock minus paused time
- No rest timer, no overall workout stopwatch visible to user

**No schema migrations needed for Phase 1 or Phase 2.**

---

## Phase 1 — Workout Stopwatch + Pause

**Status: `[x]` complete**

### What to build

1. Running elapsed timer in the workout header — wall-clock based, updates every second
2. Pause / Resume button next to the timer
3. Fix `finishWorkout()` to save `duration = wallClockSeconds - workoutAccumulatedPause`

### State to add (workouts/new/page.tsx)

```typescript
// Add alongside workoutStartTime
const [workoutElapsed, setWorkoutElapsed] = useState(0);          // seconds, drives display
const [workoutPausedAt, setWorkoutPausedAt] = useState<Date | null>(null);
const [workoutAccumulatedPause, setWorkoutAccumulatedPause] = useState(0); // seconds paused
```

### Interval (add near top of WorkoutContent)

```typescript
useEffect(() => {
  if (!started || !workoutStartTime) return;
  const id = setInterval(() => {
    if (workoutPausedAt) return; // frozen while paused
    const wallClock = Math.floor((Date.now() - workoutStartTime.getTime()) / 1000);
    setWorkoutElapsed(wallClock - workoutAccumulatedPause);
  }, 1000);
  return () => clearInterval(id);
}, [started, workoutStartTime, workoutPausedAt, workoutAccumulatedPause]);
```

### Pause/Resume handlers

```typescript
function pauseWorkout() {
  setWorkoutPausedAt(new Date());
}

function resumeWorkout() {
  if (!workoutPausedAt) return;
  const pausedFor = Math.floor((Date.now() - workoutPausedAt.getTime()) / 1000);
  setWorkoutAccumulatedPause(prev => prev + pausedFor);
  setWorkoutPausedAt(null);
}
```

### Duration fix in finishWorkout()

Replace:
```typescript
const totalDuration = exerciseBlocks.reduce((sum, b) => sum + b.elapsed, 0);
```
With:
```typescript
const wallClock = workoutStartTime
  ? Math.floor((Date.now() - workoutStartTime.getTime()) / 1000)
  : workoutElapsed;
// If still paused when finishing, account for that pause segment too
const finalPause = workoutPausedAt
  ? workoutAccumulatedPause + Math.floor((Date.now() - workoutPausedAt.getTime()) / 1000)
  : workoutAccumulatedPause;
const totalDuration = Math.max(0, wallClock - finalPause);
```

### UI — workout header timer

Format helper: `formatElapsed(seconds)` → `"0:23"`, `"1:45:02"` (hide hours until ≥ 1 hour)

Add to the active-workout header bar (above exercise blocks), right-aligned:
```tsx
{started && (
  <div className="flex items-center gap-2 text-sm">
    <span className="font-mono text-gray-300">{formatElapsed(workoutElapsed)}</span>
    <button
      onClick={workoutPausedAt ? resumeWorkout : pauseWorkout}
      className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded border border-gray-700"
    >
      {workoutPausedAt ? "Resume" : "Pause"}
    </button>
  </div>
)}
```

### Acceptance criteria

- [ ] Elapsed time visible from the moment a workout starts
- [ ] Timer counts up every second (wall clock)
- [ ] Pause button freezes timer; Resume resumes correctly
- [ ] `Workout.duration` saved on finish reflects real time (wall clock minus paused seconds)
- [ ] Works when finishing immediately after pausing (edge case)

---

## Phase 2 — Auto Rest Timer Between Sets

**Status: `[x]` complete**

### What to build

1. When a set is marked **complete**, automatically start a rest countdown
2. Bottom banner slides up showing remaining time, Skip, +15, -15
3. Per-exercise default rest duration (stored in `ExerciseBlock.defaultRestSecs`, persisted to `localStorage` by exercise ID)
4. Global default: 90 seconds
5. Save actual rest taken to `WorkoutSet.restSecs` when rest is dismissed/skipped or next set is started

### State to add

```typescript
interface RestTimer {
  active: boolean;
  totalSeconds: number;
  remainingSeconds: number;
  exerciseBlockIndex: number;
  setIndex: number;
  startedAt: Date;
}
const [restTimer, setRestTimer] = useState<RestTimer | null>(null);
```

Add `defaultRestSecs: number` to `ExerciseBlock` interface (default 90, loaded from localStorage).

### Trigger

In `completeSet()`, after `newCompleted = true` branch:
```typescript
if (newCompleted) {
  const block = exerciseBlocks[blockIndex];
  const restSecs = block.defaultRestSecs ?? 90;
  setRestTimer({
    active: true,
    totalSeconds: restSecs,
    remainingSeconds: restSecs,
    exerciseBlockIndex: blockIndex,
    setIndex,
    startedAt: new Date(),
  });
}
```

### Countdown interval

```typescript
useEffect(() => {
  if (!restTimer?.active) return;
  const id = setInterval(() => {
    setRestTimer(prev => {
      if (!prev) return null;
      if (prev.remainingSeconds <= 1) {
        // Timer done — vibrate if supported
        navigator.vibrate?.([200, 100, 200]);
        return { ...prev, remainingSeconds: 0, active: false };
      }
      return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
    });
  }, 1000);
  return () => clearInterval(id);
}, [restTimer?.active]);
```

### Dismiss / save rest time

```typescript
function dismissRestTimer() {
  if (!restTimer) return;
  const actualRest = Math.floor((Date.now() - restTimer.startedAt.getTime()) / 1000);
  // Save restSecs to the set that triggered the timer (async, fire-and-forget)
  const block = exerciseBlocks[restTimer.exerciseBlockIndex];
  const set = block?.sets[restTimer.setIndex];
  if (set?.dbId) {
    fetch(`/api/workouts/${workoutId}/sets/${set.dbId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restSecs: actualRest }),
    }).catch(() => {});
  }
  setRestTimer(null);
}
```

### Per-exercise rest config

In the exercise block header, add a small "Rest: 1:30 ▼" dropdown/tap to change default.
Persist to localStorage: `localStorage.setItem(`rest_${exerciseId}`, String(seconds))`.
Load on exercise add: `localStorage.getItem(`rest_${exerciseId}`) ?? "90"`.

### UI — bottom banner

```tsx
{restTimer && (
  <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-50">
    <div className="flex items-center justify-between max-w-lg mx-auto">
      <span className="text-gray-400 text-sm">Rest</span>
      <span className={`font-mono text-2xl font-bold ${restTimer.remainingSeconds <= 10 ? "text-red-400" : "text-emerald-400"}`}>
        {formatElapsed(restTimer.remainingSeconds)}
      </span>
      <div className="flex items-center gap-2">
        <button onClick={() => adjustRest(-15)} className="text-xs text-gray-400 px-2 py-1 border border-gray-700 rounded">-15</button>
        <button onClick={() => adjustRest(15)} className="text-xs text-gray-400 px-2 py-1 border border-gray-700 rounded">+15</button>
        <button onClick={dismissRestTimer} className="text-xs bg-emerald-600 text-gray-900 font-bold px-3 py-1 rounded">Skip</button>
      </div>
    </div>
    {/* Progress bar */}
    <div className="mt-2 h-1 bg-gray-700 rounded max-w-lg mx-auto">
      <div
        className="h-1 bg-emerald-500 rounded transition-all"
        style={{ width: `${(restTimer.remainingSeconds / restTimer.totalSeconds) * 100}%` }}
      />
    </div>
  </div>
)}
```

### Acceptance criteria

- [ ] Rest timer starts automatically when a set is checked off
- [ ] Banner slides up from bottom with countdown, doesn't block content (main content has `pb-24` when active)
- [ ] Countdown turns red in last 10 seconds
- [ ] Skip dismisses immediately
- [ ] +15 / -15 adjust remaining time (clamped to 5s–600s)
- [ ] When timer hits 0, it vibrates (if device supports) and banner fades out after 2s
- [ ] Actual rest time saved to `WorkoutSet.restSecs`
- [ ] Per-exercise rest duration changeable inline; persists across workouts via localStorage
- [ ] Rest timer dismissed if workout is finished or paused

---

## Phase 3 — Post-Workout Summary

**Status: `[x]` complete**

### What to build

After `finishWorkout()` completes, instead of navigating directly to history, show a summary modal:

- Total duration (formatted: `1h 23m`)
- Total volume lifted (sum of weight × reps for all completed sets)
- Sets completed count
- Exercises done
- "View Workout" button → `/workouts/[id]`
- "Done" button → `/workouts` (history)

### State to add

```typescript
interface WorkoutSummary {
  workoutId: string;
  duration: number;       // seconds
  totalVolume: number;    // lbs
  setsCompleted: number;
  exerciseCount: number;
}
const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | null>(null);
```

### Trigger

In `finishWorkout()`, after the PUT resolves successfully, instead of `router.push(...)`:
```typescript
setWorkoutSummary({
  workoutId: workoutId!,
  duration: totalDuration,
  totalVolume: /* calculate from exerciseBlocks */,
  setsCompleted: /* count completed sets */,
  exerciseCount: exerciseBlocks.length,
});
```

### Acceptance criteria

- [ ] Summary appears after finishing instead of immediate redirect
- [ ] Shows formatted duration, volume, set/exercise counts
- [ ] "View Workout" navigates to detail page
- [ ] "Done" navigates to history

---

## Files Changed

| File | Phase | Change |
|---|---|---|
| `src/app/workouts/new/page.tsx` | 1, 2, 3 | All UI and logic |
| `src/app/api/workouts/[id]/sets/[setId]/route.ts` | 2 | Accept `restSecs` in PUT body |

**No Prisma schema changes needed** — `Workout.duration`, `WorkoutSet.restSecs` already exist.

---

## How to Resume This Work

1. `Read docs/PRD-workout-timing.md` — find first `[ ]` or `[~]` item
2. `Read src/app/workouts/new/page.tsx` — understand current state
3. Implement the next unchecked item
4. Dev server: `npm run dev` (localhost:3000)
5. Do **not** push — test locally first
