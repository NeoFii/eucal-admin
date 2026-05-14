const MODEL_PILL_COLORS = [
  "bg-blue-50 text-blue-700",
  "bg-orange-50 text-orange-700",
  "bg-emerald-50 text-emerald-700",
  "bg-violet-50 text-violet-700",
  "bg-red-50 text-red-700",
  "bg-cyan-50 text-cyan-700",
  "bg-yellow-50 text-yellow-700",
  "bg-pink-50 text-pink-700",
];

export function getModelPillColor(model: string): string {
  let hash = 0;
  for (let i = 0; i < model.length; i++) {
    hash = ((hash << 5) - hash + model.charCodeAt(i)) | 0;
  }
  return MODEL_PILL_COLORS[Math.abs(hash) % MODEL_PILL_COLORS.length];
}
