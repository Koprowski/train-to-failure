import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";

const imageMap: Record<string, string> = {
  "Barbell Bench Press": `${BASE}/Barbell_Bench_Press_-_Medium_Grip/0.jpg`,
  "Incline Dumbbell Press": `${BASE}/Incline_Dumbbell_Press/0.jpg`,
  "Cable Fly": `${BASE}/Cable_Crossover/0.jpg`,
  "Push Up": `${BASE}/Pushups/0.jpg`,
  "Dumbbell Fly": `${BASE}/Dumbbell_Flyes/0.jpg`,
  "Machine Chest Press": `${BASE}/Machine_Bench_Press/0.jpg`,
  "Barbell Deadlift": `${BASE}/Barbell_Deadlift/0.jpg`,
  "Pull Up": `${BASE}/Pullups/0.jpg`,
  "Barbell Row": `${BASE}/Bent_Over_Barbell_Row/0.jpg`,
  "Lat Pulldown": `${BASE}/Wide-Grip_Lat_Pulldown/0.jpg`,
  "Seated Cable Row": `${BASE}/Seated_Cable_Rows/0.jpg`,
  "Dumbbell Row": `${BASE}/One-Arm_Dumbbell_Row/0.jpg`,
  "T-Bar Row": `${BASE}/Lying_T-Bar_Row/0.jpg`,
  "Overhead Press": `${BASE}/Standing_Military_Press/0.jpg`,
  "Dumbbell Lateral Raise": `${BASE}/Side_Lateral_Raise/0.jpg`,
  "Face Pull": `${BASE}/Face_Pull/0.jpg`,
  "Arnold Press": `${BASE}/Arnold_Dumbbell_Press/0.jpg`,
  "Front Raise": `${BASE}/Front_Dumbbell_Raise/0.jpg`,
  "Reverse Fly": `${BASE}/Seated_Bent-Over_Rear_Delt_Raise/0.jpg`,
  "Barbell Curl": `${BASE}/Barbell_Curl/0.jpg`,
  "Dumbbell Curl": `${BASE}/Dumbbell_Bicep_Curl/0.jpg`,
  "Hammer Curl": `${BASE}/Hammer_Curls/0.jpg`,
  "Tricep Pushdown": `${BASE}/Triceps_Pushdown/0.jpg`,
  "Skull Crusher": `${BASE}/Lying_Triceps_Press/0.jpg`,
  "Overhead Tricep Extension": `${BASE}/Standing_Dumbbell_Triceps_Extension/0.jpg`,
  "Preacher Curl": `${BASE}/Preacher_Curl/0.jpg`,
  "Barbell Squat": `${BASE}/Barbell_Squat/0.jpg`,
  "Leg Press": `${BASE}/Leg_Press/0.jpg`,
  "Romanian Deadlift": `${BASE}/Romanian_Deadlift/0.jpg`,
  "Leg Extension": `${BASE}/Leg_Extensions/0.jpg`,
  "Leg Curl": `${BASE}/Seated_Leg_Curl/0.jpg`,
  "Bulgarian Split Squat": `${BASE}/Single_Leg_Push-off/0.jpg`,
  "Calf Raise": `${BASE}/Standing_Calf_Raises/0.jpg`,
  "Goblet Squat": `${BASE}/Goblet_Squat/0.jpg`,
  "Hip Thrust": `${BASE}/Barbell_Hip_Thrust/0.jpg`,
  "Walking Lunge": `${BASE}/Dumbbell_Lunges/0.jpg`,
  "Plank": `${BASE}/Plank/0.jpg`,
  "Hanging Leg Raise": `${BASE}/Hanging_Leg_Raise/0.jpg`,
  "Cable Crunch": `${BASE}/Cable_Crunch/0.jpg`,
  "Ab Wheel Rollout": `${BASE}/Ab_Roller/0.jpg`,
  "Russian Twist": `${BASE}/Russian_Twist/0.jpg`,
  "Dead Bug": `${BASE}/Spell_Caster/0.jpg`,
  "Side Plank": `${BASE}/Side_Bridge/0.jpg`,
  "Treadmill Run": `${BASE}/Running_Treadmill/0.jpg`,
  "Rowing Machine": `${BASE}/Rowing_Stationary/0.jpg`,
  "Cycling": `${BASE}/Bicycling_Stationary/0.jpg`,
  "Jump Rope": `${BASE}/Rope_Jumping/0.jpg`,
  "Battle Ropes": `${BASE}/Battling_Ropes/0.jpg`,
};

async function main() {
  let updated = 0;
  for (const [name, imageUrl] of Object.entries(imageMap)) {
    const result = await prisma.exercise.updateMany({
      where: { name },
      data: { imageUrl },
    });
    if (result.count > 0) {
      console.log(`  ✓ ${name}`);
      updated += result.count;
    } else {
      console.log(`  ✗ ${name} (not found in database)`);
    }
  }
  console.log(`\nUpdated ${updated} exercises with images`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
