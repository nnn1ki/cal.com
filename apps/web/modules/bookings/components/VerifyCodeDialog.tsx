import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useBookerStoreContext } from "@calcom/features/bookings/Booker/BookerStoreProvider";
import { Dialog } from "@calcom/features/components/controlled-dialog";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Input } from "@calcom/ui/components/form";
import { Label } from "@calcom/ui/components/form";
import { InfoIcon } from "@coss/ui/icons";

export const VerifyCodeDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  email,
  isUserSessionRequiredToVerify = true,
  verifyCodeWithSessionNotRequired,
  verifyCodeWithSessionRequired,
  resetErrors,
  setIsPending,
  isPending,
  error,
}: {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  email: string;
  isUserSessionRequiredToVerify?: boolean;
  verifyCodeWithSessionNotRequired: (code: string, email: string) => void;
  verifyCodeWithSessionRequired: (code: string, email: string) => void;
  resetErrors: () => void;
  isPending: boolean;
  setIsPending: (status: boolean) => void;
  error: string;
}) => {
  const { t } = useLocale();
  const [value, setValue] = useState("");
  const [hasVerified, setHasVerified] = useState(false);
  const setVerificationCode = useBookerStoreContext((state) => state.setVerificationCode);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = useMemo(() => value.padEnd(6, " ").slice(0, 6).split(""), [value]);

  const updateCode = useCallback(
    (nextValue: string) => {
      resetErrors();
      setValue(nextValue.replace(/\D/g, "").slice(0, 6));
    },
    [resetErrors]
  );

  const focusInput = useCallback((index: number) => {
    const input = inputRefs.current[index];
    if (!input) {
      return;
    }

    input.focus();
    input.setSelectionRange(0, 1);
  }, []);

  const handleDigitChange = useCallback(
    (index: number, nextRawValue: string) => {
      const sanitizedValue = nextRawValue.replace(/\D/g, "");

      if (!sanitizedValue) {
        const nextDigits = [...digits];
        nextDigits[index] = " ";
        updateCode(nextDigits.join("").trimEnd());
        return;
      }

      const nextDigits = [...digits];

      sanitizedValue.split("").forEach((digit, offset) => {
        const nextIndex = index + offset;

        if (nextIndex < nextDigits.length) {
          nextDigits[nextIndex] = digit;
        }
      });

      updateCode(nextDigits.join("").trimEnd());
      focusInput(Math.min(index + sanitizedValue.length, 5));
    },
    [digits, focusInput, updateCode]
  );

  const handleDigitKeyDown = useCallback(
    (index: number, key: string) => {
      if (key === "Backspace") {
        if (digits[index]?.trim()) {
          const nextDigits = [...digits];
          nextDigits[index] = " ";
          updateCode(nextDigits.join("").trimEnd());
          return;
        }

        if (index > 0) {
          const nextDigits = [...digits];
          nextDigits[index - 1] = " ";
          updateCode(nextDigits.join("").trimEnd());
          focusInput(index - 1);
        }
        return;
      }

      if (key === "ArrowLeft" && index > 0) {
        focusInput(index - 1);
      }

      if (key === "ArrowRight" && index < 5) {
        focusInput(index + 1);
      }
    },
    [digits, focusInput, updateCode]
  );

  const verifyCode = useCallback(() => {
    resetErrors();
    setIsPending(true);
    if (isUserSessionRequiredToVerify) {
      verifyCodeWithSessionRequired(value, email);
    } else {
      verifyCodeWithSessionNotRequired(value, email);
    }
    setVerificationCode(value);
    setHasVerified(true);
  }, [
    resetErrors,
    setIsPending,
    isUserSessionRequiredToVerify,
    verifyCodeWithSessionRequired,
    value,
    email,
    verifyCodeWithSessionNotRequired,
    setVerificationCode,
  ]);

  useEffect(() => {
    // trim the input value because "react-digit-input" creates a string of the given length,
    // even when some digits are missing. And finally we use regex to check if the value consists
    // of 6 non-empty digits.
    if (hasVerified || error || isPending || !/^\d{6}$/.test(value.trim())) return;

    verifyCode();
  }, [error, isPending, value, hasVerified]);

  useEffect(() => setValue(""), [isOpenDialog]);

  const digitClassName =
    "h-12 w-12 text-center text-xl! text-emphasis caret-emphasis [-webkit-text-fill-color:currentColor]";

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={() => {
        resetErrors();
      }}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-row">
          <div className="w-full">
            <DialogHeader title={t("verify_your_email")} subtitle={t("enter_digit_code", { email })} />
            <Label htmlFor="code">{t("code")}</Label>
            <div className="flex flex-row justify-between">
              {digits.map((digit, index) => (
                <Input
                  key={`2fa${index + 1}`}
                  ref={(node) => {
                    inputRefs.current[index] = node;
                  }}
                  className={digitClassName}
                  name={`2fa${index + 1}`}
                  inputMode="decimal"
                  maxLength={6}
                  value={digit.trim()}
                  autoFocus={index === 0}
                  autoComplete={index === 0 ? "one-time-code" : undefined}
                  onClick={(event) => {
                    event.currentTarget.setSelectionRange(0, 1);
                  }}
                  onFocus={(event) => {
                    event.currentTarget.setSelectionRange(0, 1);
                  }}
                  onKeyDown={(event) => {
                    handleDigitKeyDown(index, event.key);
                  }}
                  onChange={(event) => {
                    handleDigitChange(index, event.target.value);
                  }}
                />
              ))}
            </div>
            {error && (
              <div className="mt-2 flex items-center gap-x-2 text-sm text-red-700">
                <div>
                  <InfoIcon className="h-3 w-3" />
                </div>
                <p>{error}</p>
              </div>
            )}
            <DialogFooter noSticky>
              <Button type="button" color="minimal" onClick={() => setIsOpenDialog(false)}>
                {t("close")}
              </Button>
              <Button type="submit" onClick={verifyCode} loading={isPending}>
                {t("submit")}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
