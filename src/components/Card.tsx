import type { PropsWithChildren, ReactNode } from "react";
import {
  Card as ShadCard,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";

interface CardProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}

export default function Card({ children, title, subtitle, action }: CardProps) {
  return (
    <ShadCard>
      {(title || subtitle || action) && (
        <CardHeader>
          <div className="flex justify-between items-start gap-4">
            <div>
              {title ? <CardTitle>{title}</CardTitle> : null}
              {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
            </div>
            {action ? <div>{action}</div> : null}
          </div>
        </CardHeader>
      )}
      <CardContent>{children}</CardContent>
    </ShadCard>
  );
}
