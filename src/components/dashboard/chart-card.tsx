"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/loading-spinner";

interface Tab {
  key: string;
  label: string;
}

interface ChartCardProps {
  title: string;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (key: string) => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function ChartCard({
  title,
  tabs,
  activeTab,
  onTabChange,
  loading,
  children,
}: ChartCardProps) {
  const content = loading ? (
    <div className="flex h-[320px] items-center justify-center">
      <LoadingSpinner />
    </div>
  ) : (
    <div className="h-[320px]">{children}</div>
  );

  if (!tabs || tabs.length === 0) {
    return (
      <Card className="panel">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 sm:pt-0">{content}</CardContent>
      </Card>
    );
  }

  return (
    <Card className="panel">
      <Tabs value={activeTab ?? tabs[0].key} onValueChange={onTabChange}>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <TabsList>
            {tabs.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </CardHeader>
      </Tabs>
      <CardContent className="pt-0 sm:pt-0">{content}</CardContent>
    </Card>
  );
}
