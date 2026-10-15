import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Label } from "@/components/ui/shadcn/label";
import { cn } from "@/lib/cn";

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div ref={ref} className={cn("space-y-1.5", className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = "FormItem";

const useFormField = () => {
  const itemContext = React.useContext(FormItemContext);
  const id = itemContext.id;

  return {
    id,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
  };
};

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    error?: boolean;
    required?: boolean;
  }
>(({ className, error, required, children, ...props }, ref) => {
  const { formItemId } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(
        "text-xs sm:text-sm font-medium text-muted-foreground block",
        error && "text-destructive",
        className,
      )}
      htmlFor={props.htmlFor || formItemId}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-destructive font-bold" aria-hidden="true">
          *
        </span>
      )}
    </Label>
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { error?: boolean }
>(({ className, children, error, ...props }, ref) => {
  const { formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <div
      ref={ref}
      className={cn("relative", className)}
      aria-describedby={`${formDescriptionId} ${formMessageId}`.trim()}
      aria-invalid={error ? "true" : undefined}
      {...props}
    >
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<any>, {
            id: (children.props as any)?.id || formItemId,
            "aria-describedby":
              (children.props as any)?.["aria-describedby"] ||
              `${formDescriptionId} ${formMessageId}`.trim(),
            "aria-invalid": error
              ? true
              : (children.props as any)?.["aria-invalid"],
          })
        : children}
    </div>
  );
});
FormControl.displayName = "FormControl";

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();

  return (
    <p
      ref={ref}
      id={formDescriptionId}
      className={cn("text-[11px] sm:text-xs text-muted-foreground", className)}
      {...props}
    />
  );
});
FormDescription.displayName = "FormDescription";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { formMessageId } = useFormField();

  if (!children) {
    return null;
  }

  return (
    <p
      ref={ref}
      id={formMessageId}
      role="alert"
      className={cn("text-xs font-medium text-destructive", className)}
      {...props}
    >
      {children}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export {
  useFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
};
