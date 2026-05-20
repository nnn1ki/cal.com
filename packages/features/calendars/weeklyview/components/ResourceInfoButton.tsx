"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader } from "@calcom/ui/components/dialog";
import { Icon } from "@calcom/ui/components/icon";
import { useMemo, useState } from "react";

type ResourceInfoButtonProps = {
  title: string;
  slug: string;
  description?: string | null;
  imageSrc?: string | null;
};

export function ResourceInfoButton({
  title,
  slug,
  description,
  imageSrc,
}: ResourceInfoButtonProps): JSX.Element {
  const { t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  const imageCandidates = useMemo(
    () =>
      [imageSrc, `/service-info/${slug}.jpg`, `/service-info/${slug}.png`, `/service-info/${slug}.webp`].filter(
        (candidate): candidate is string => Boolean(candidate)
      ),
    [imageSrc, slug]
  );

  const activeImageSrc = imageCandidates[imageIndex];

  return (
    <>
      <button
        type="button"
        aria-label={t("details")}
        className="text-subtle hover:text-emphasis inline-flex h-5 w-5 items-center justify-center rounded-full border border-current/25 transition-colors"
        onClick={() => {
          setImageIndex(0);
          setIsOpen(true);
        }}>
        <Icon name="info" className="h-3.5 w-3.5" />
      </button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader title={title} />
          <div className="space-y-4">
            {activeImageSrc ? (
              <img
                src={activeImageSrc}
                alt={title}
                className="border-subtle max-h-72 w-full rounded-2xl border object-cover"
                onError={() => {
                  setImageIndex((currentIndex) => {
                    const nextIndex = currentIndex + 1;
                    return nextIndex < imageCandidates.length ? nextIndex : imageCandidates.length;
                  });
                }}
              />
            ) : null}
            {description ? <div className="text-default text-sm leading-6">{description}</div> : null}
          </div>
          <DialogFooter className="mt-6">
            <Button type="button" color="secondary" onClick={() => setIsOpen(false)}>
              {t("close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
