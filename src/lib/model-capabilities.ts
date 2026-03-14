const CAPABILITY_LABELS: Record<string, string> = {
  reasoning: "逻辑推理与规划",
  coding: "编程",
  tool_use: "工具调用",
  instruction_following: "复杂指令遵循",
};

const CAPABILITY_ALIASES: Record<string, string> = {
  "tool-use": "tool_use",
  tooluse: "tool_use",
  tool_calling: "tool_use",
  "tool-calling": "tool_use",
  tools: "tool_use",
  instructionfollowing: "instruction_following",
  "instruction-following": "instruction_following",
};

export function getCapabilityDisplayName(tag: string): string {
  const normalizedTag = tag.trim().toLowerCase();
  const canonicalTag = CAPABILITY_ALIASES[normalizedTag] ?? normalizedTag;
  return CAPABILITY_LABELS[canonicalTag] ?? tag;
}

export function mapCapabilityTags(tags: string[] | undefined): string[] {
  return (tags ?? []).map(getCapabilityDisplayName);
}
