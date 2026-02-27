import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const exercises = [
  { name: "Barbell Bench Press", muscleGroups: "chest,triceps,shoulders", equipment: "barbell,bench", type: "weight_reps", videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg" },
  { name: "Incline Dumbbell Press", muscleGroups: "chest,shoulders,triceps", equipment: "dumbbell,bench", type: "weight_reps", videoUrl: "https://www.youtube.com/watch?v=8iPEnn-ltC8" },
  { name: "Cable Fly", muscleGroups: "chest", equipment: "cable", type: "weight_reps" },
  { name: "Push Up", muscleGroups: "chest,triceps,shoulders", equipment: "bodyweight", type: "bodyweight" },
  { name: "Dumbbell Fly", muscleGroups: "chest", equipment: "dumbbell,bench", type: "weight_reps" },
  { name: "Machine Chest Press", muscleGroups: "chest,triceps", equipment: "machine", type: "weight_reps" },
  { name: "Barbell Deadlift", muscleGroups: "back,hamstrings,glutes", equipment: "barbell", type: "weight_reps", videoUrl: "https://www.youtube.com/watch?v=op9kVnSso6Q" },
  { name: "Pull Up", muscleGroups: "back,biceps", equipment: "bodyweight,pullup_bar", type: "bodyweight" },
  { name: "Barbell Row", muscleGroups: "back,biceps", equipment: "barbell", type: "weight_reps" },
  { name: "Lat Pulldown", muscleGroups: "back,biceps", equipment: "cable,machine", type: "weight_reps" },
  { name: "Seated Cable Row", muscleGroups: "back,biceps", equipment: "cable", type: "weight_reps" },
  { name: "Dumbbell Row", muscleGroups: "back,biceps", equipment: "dumbbell", type: "weight_reps" },
  { name: "T-Bar Row", muscleGroups: "back,biceps", equipment: "barbell,machine", type: "weight_reps" },
  { name: "Overhead Press", muscleGroups: "shoulders,triceps", equipment: "barbell", type: "weight_reps", videoUrl: "https://www.youtube.com/watch?v=2yjwXTZQDDI" },
  { name: "Dumbbell Lateral Raise", muscleGroups: "shoulders", equipment: "dumbbell", type: "weight_reps" },
  { name: "Face Pull", muscleGroups: "shoulders,back", equipment: "cable", type: "weight_reps" },
  { name: "Arnold Press", muscleGroups: "shoulders,triceps", equipment: "dumbbell", type: "weight_reps" },
  { name: "Front Raise", muscleGroups: "shoulders", equipment: "dumbbell", type: "weight_reps" },
  { name: "Reverse Fly", muscleGroups: "shoulders,back", equipment: "dumbbell", type: "weight_reps" },
  { name: "Barbell Curl", muscleGroups: "biceps", equipment: "barbell", type: "weight_reps" },
  { name: "Dumbbell Curl", muscleGroups: "biceps", equipment: "dumbbell", type: "weight_reps" },
  { name: "Hammer Curl", muscleGroups: "biceps,forearms", equipment: "dumbbell", type: "weight_reps" },
  { name: "Tricep Pushdown", muscleGroups: "triceps", equipment: "cable", type: "weight_reps" },
  { name: "Skull Crusher", muscleGroups: "triceps", equipment: "barbell,bench", type: "weight_reps" },
  { name: "Overhead Tricep Extension", muscleGroups: "triceps", equipment: "dumbbell", type: "weight_reps" },
  { name: "Preacher Curl", muscleGroups: "biceps", equipment: "barbell,machine", type: "weight_reps" },
  { name: "Barbell Squat", muscleGroups: "quads,glutes,hamstrings", equipment: "barbell,rack", type: "weight_reps", videoUrl: "https://www.youtube.com/watch?v=ultWZbUMPL8" },
  { name: "Leg Press", muscleGroups: "quads,glutes", equipment: "machine", type: "weight_reps" },
  { name: "Romanian Deadlift", muscleGroups: "hamstrings,glutes,back", equipment: "barbell", type: "weight_reps" },
  { name: "Leg Extension", muscleGroups: "quads", equipment: "machine", type: "weight_reps" },
  { name: "Leg Curl", muscleGroups: "hamstrings", equipment: "machine", type: "weight_reps" },
  { name: "Bulgarian Split Squat", muscleGroups: "quads,glutes", equipment: "dumbbell", type: "weight_reps" },
  { name: "Calf Raise", muscleGroups: "calves", equipment: "machine", type: "weight_reps" },
  { name: "Calf Raise - Seated", muscleGroups: "calves", equipment: "machine", type: "weight_reps" },
  { name: "Goblet Squat", muscleGroups: "quads,glutes", equipment: "dumbbell,kettlebell", type: "weight_reps" },
  { name: "Hip Thrust", muscleGroups: "glutes,hamstrings", equipment: "barbell,bench", type: "weight_reps" },
  { name: "Walking Lunge", muscleGroups: "quads,glutes", equipment: "dumbbell", type: "weight_reps" },
  { name: "Plank", muscleGroups: "abs,core", equipment: "bodyweight", type: "time" },
  { name: "Hanging Leg Raise", muscleGroups: "abs", equipment: "pullup_bar", type: "bodyweight" },
{ name: "Ab Wheel Rollout", muscleGroups: "abs,core", equipment: "ab_wheel", type: "bodyweight" },
  { name: "Russian Twist", muscleGroups: "abs,obliques", equipment: "bodyweight", type: "weight_reps" },
  { name: "Dead Bug", muscleGroups: "abs,core", equipment: "bodyweight", type: "bodyweight" },
  { name: "Side Plank", muscleGroups: "obliques,core", equipment: "bodyweight", type: "time" },
  { name: "Treadmill Run", muscleGroups: "cardio,quads,calves", equipment: "treadmill", type: "cardio" },
  { name: "Cable Row", muscleGroups: "back,biceps", equipment: "cable", type: "weight_reps" },
  { name: "Cycling", muscleGroups: "cardio,quads,hamstrings", equipment: "bike", type: "cardio" },
  { name: "Jump Rope", muscleGroups: "cardio,calves", equipment: "jump_rope", type: "cardio" },
  { name: "Battle Ropes", muscleGroups: "cardio,shoulders,arms", equipment: "battle_ropes", type: "time" },
  { name: "Decline Sit-Up", muscleGroups: "abs,core", equipment: "bench", type: "weight_reps" },
  { name: "Hip Abduction", muscleGroups: "glutes,abductors", equipment: "machine", type: "weight_reps" },
  { name: "Hip Adduction", muscleGroups: "adductors", equipment: "machine", type: "weight_reps" },
  { name: "Dip", muscleGroups: "chest,triceps,shoulders", equipment: "bodyweight,dip_station", type: "weight_reps" },
  { name: "Barbell Shrug", muscleGroups: "traps", equipment: "barbell", type: "weight_reps" },
  { name: "Cable Lateral Raise", muscleGroups: "shoulders", equipment: "cable", type: "weight_reps" },
  { name: "Wrist Curl", muscleGroups: "forearms", equipment: "barbell", type: "weight_reps" },
  { name: "Cable Kickback", muscleGroups: "glutes", equipment: "cable", type: "weight_reps" },
  { name: "Good Morning", muscleGroups: "hamstrings,back,glutes", equipment: "barbell", type: "weight_reps" },
  { name: "Farmer's Walk", muscleGroups: "traps,forearms,core", equipment: "dumbbell", type: "time" },
  { name: "Incline Barbell Bench Press", muscleGroups: "chest,shoulders,triceps", equipment: "barbell,bench", type: "weight_reps" },
];

async function main() {
  // Clear existing exercises
  await prisma.exercise.deleteMany({ where: { isCustom: false } });

  console.log("Seeding exercises...");
  for (const exercise of exercises) {
    await prisma.exercise.create({ data: { ...exercise, isCustom: false } });
  }
  console.log(`Seeded ${exercises.length} exercises`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
