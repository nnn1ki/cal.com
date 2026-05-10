import type { ReactElement, Ref } from "react";
import React, { forwardRef } from "react";
import type { FieldErrors, FieldValues, SubmitErrorHandler, SubmitHandler, UseFormReturn } from "react-hook-form";
import { FormProvider } from "react-hook-form";

import { getErrorFromUnknown } from "@calcom/lib/errors";

import { showToast } from "../../toast";

type FormProps<T extends object> = {
  form: UseFormReturn<T>;
  handleSubmit: SubmitHandler<T>;
  handleInvalidSubmit?: SubmitErrorHandler<T>;
} & Omit<JSX.IntrinsicElements["form"], "onSubmit">;

const PlainForm = <T extends FieldValues>(props: FormProps<T>, ref: Ref<HTMLFormElement>) => {
  const { form, handleSubmit, handleInvalidSubmit, ...passThrough } = props;
  const resolvedHandleInvalidSubmit = handleInvalidSubmit ?? ((_: FieldErrors<T>) => undefined);

  return (
    <FormProvider {...form}>
      <form
        ref={ref}
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (process.env.NODE_ENV !== "production") {
            console.debug("Form submit triggered");
          }

          form
            .handleSubmit(handleSubmit, resolvedHandleInvalidSubmit)(event)
            .catch((err) => {
              // FIXME: Booking Pages don't have toast, so this error is never shown
              showToast(`${getErrorFromUnknown(err).message}`, "error");
            });
        }}
        {...passThrough}>
        {props.children}
      </form>
    </FormProvider>
  );
};

export const Form = forwardRef(PlainForm) as <T extends FieldValues>(
  p: FormProps<T> & { ref?: Ref<HTMLFormElement> }
) => ReactElement;
