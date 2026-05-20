import { createParser, useQueryState } from "nuqs";

import dayjs from "@calcom/dayjs";

const tableDateParser = createParser({
  parse: (value: string) => {
    const parsed = dayjs(value);
    return parsed.isValid() ? parsed.startOf("day") : dayjs().startOf("day");
  },
  serialize: (value: dayjs.Dayjs) => value.format("YYYY-MM-DD"),
});

export function useCurrentBookingTableDate() {
  const [currentTableDate, setCurrentTableDate] = useQueryState(
    "tableDate",
    tableDateParser.withDefault(dayjs().startOf("day"))
  );

  return {
    currentTableDate,
    setCurrentTableDate,
  };
}
