export type Behavior =
  "walk" | "run" | "idle" | "rest" | "look" | "roll" | "travel";
const weighted: [Behavior, number][] = [
  ["walk", 30],
  ["run", 12],
  ["idle", 12],
  ["rest", 10],
  ["look", 8],
  ["roll", 8],
  ["travel", 20],
];
export function chooseBehavior(
  random = Math.random,
  previous?: Behavior,
): Behavior {
  const choices = weighted.filter(([name]) => name !== previous);
  let value =
    random() * choices.reduce((total, [, weight]) => total + weight, 0);
  for (const [name, weight] of choices) {
    value -= weight;
    if (value < 0) return name;
  }
  return "idle";
}
