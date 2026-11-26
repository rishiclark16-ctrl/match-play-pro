import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptics";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, onCheckedChange, ...props }, ref) => {
  const handleCheckedChange = (checked: boolean) => {
    hapticLight();
    onCheckedChange?.(checked);
  };

  return (
    <SwitchPrimitives.Root
      className={cn(
        // The track is drawn by ::before so the button itself is a full 44pt touch target.
        "peer relative inline-flex h-11 w-[50px] shrink-0 cursor-pointer items-center rounded-full bg-transparent outline-none",
        "before:absolute before:inset-x-0 before:top-1/2 before:h-[30px] before:-translate-y-1/2 before:rounded-full before:transition-colors before:content-['']",
        "data-[state=checked]:before:bg-primary data-[state=unchecked]:before:bg-border-strong",
        "focus-visible:before:ring-2 focus-visible:before:ring-ring focus-visible:before:ring-offset-2 focus-visible:before:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      onCheckedChange={handleCheckedChange}
      {...props}
      ref={ref}
    >
      <SwitchPrimitives.Thumb
        className={cn(
          "pointer-events-none relative ml-[2px] block h-[26px] w-[26px] rounded-full bg-white shadow-[0_2px_6px_rgba(15,31,23,0.2)] ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        )}
      />
    </SwitchPrimitives.Root>
  );
});
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
