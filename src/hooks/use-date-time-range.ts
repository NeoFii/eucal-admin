"use client";

import { useState } from "react";
import { formatShanghaiDateTimeLocalInput } from "@/lib/time";

export function useDateTimeRange() {
  const [startTime, setStartTime] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return formatShanghaiDateTimeLocalInput(d);
  });
  const [endTime, setEndTime] = useState(() =>
    formatShanghaiDateTimeLocalInput(),
  );
  return { startTime, setStartTime, endTime, setEndTime };
}
