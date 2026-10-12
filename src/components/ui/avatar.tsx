import * as React from "react";
import { cn } from "@/lib/cn";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback: string;
}

function Avatar({ className, src, alt, fallback, ...props }: AvatarProps) {
  const [errored, setErrored] = React.useState(false);
  const showImage = Boolean(src) && !errored;

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/10 text-primary",
        className,
      )}
      {...props}
    >
      {showImage ? (
        <img
          src={src ?? undefined}
          alt={alt ?? ""}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase">
          {fallback.slice(0, 2)}
        </span>
      )}
    </div>
  );
}

export { Avatar };
