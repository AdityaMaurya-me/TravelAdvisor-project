// components/sections/shared/content-section.tsx

import { ReactNode } from "react";

interface ContentSectionProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ContentSection({
  title,
  action,
  children,
}: ContentSectionProps) {
  return (
    <section className="space-y-8">
      <div className="flex items-center justify-between pr-10">
        <h2 className="text-3xl font-bold tracking-tight">
          {title}
        </h2>

        {action}
      </div>

      {children}
    </section>
  );
}