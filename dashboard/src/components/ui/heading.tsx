import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const headingVariants = cva("inline-flex items-center gap-3 font-medium", {
  variants: {
    variant: {
      green: "",
      white: "",
      black: "",
    },
  },
  defaultVariants: {
    variant: "green",
  },
});

const labelVariants = cva("rounded-[7px] px-[7px] py-[5px] text-inherit", {
  variants: {
    variant: {
      green: "bg-[#B9FF66] text-[#191A23]",
      white: "bg-white text-[#191A23]",
      black: "bg-[#191A23] text-white",
    },
  },
  defaultVariants: {
    variant: "green",
  },
});

type HeadingLevel = "h1" | "h2" | "h3" | "h4";

interface HeadingProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    VariantProps<typeof headingVariants> {
  as?: HeadingLevel;
  label?: string;
}

const sizeMap: Record<HeadingLevel, string> = {
  h1: "text-[60px] leading-[1.1] font-medium",
  h2: "text-[40px] leading-[1.2] font-medium",
  h3: "text-[30px] leading-[1.3] font-medium",
  h4: "text-[20px] leading-[1.4] font-medium",
};

export function SectionHeading({
  label,
  title,
  variant = "green",
  className,
}: {
  label?: string;
  title: string;
  variant?: "green" | "white" | "black";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {label && (
        <span
          className={cn(
            "inline-block w-fit rounded-[7px] px-[7px] py-[5px] text-xl font-medium",
            labelVariants({ variant })
          )}
        >
          {label}
        </span>
      )}
      <h2
        className={cn(
          sizeMap.h2,
          variant === "white" ? "text-white" : "text-[#191A23]"
        )}
      >
        {title}
      </h2>
    </div>
  );
}

function Heading({
  as: Tag = "h2",
  label,
  variant = "green",
  children,
  className,
  ...props
}: HeadingProps) {
  return (
    <Tag
      className={cn(sizeMap[Tag], headingVariants({ variant }), className)}
      {...props}
    >
      {label ? (
        <span className={cn(labelVariants({ variant }))}>{label}</span>
      ) : null}
      {children}
    </Tag>
  );
}

export { Heading, headingVariants };
