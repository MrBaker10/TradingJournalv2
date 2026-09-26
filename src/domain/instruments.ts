// What kind of market an instrument is (decided 2026-09-26,
// ftmo-cfd-instruments). A future is an exchange contract; every other class
// is a CFD as FTMO lists it. The order is the order of the groups in the
// trade form's instrument select.

export const ASSET_CLASSES = [
  "future",
  "index",
  "forex",
  "metal",
  "commodity",
  "crypto",
] as const;
export type AssetClass = (typeof ASSET_CLASSES)[number];

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  future: "Futures",
  index: "Indices",
  forex: "Forex",
  metal: "Metals",
  commodity: "Commodities",
  crypto: "Crypto",
};

export function isAssetClass(value: string): value is AssetClass {
  return (ASSET_CLASSES as readonly string[]).includes(value);
}

export interface InstrumentGroup<T> {
  assetClass: AssetClass;
  label: string;
  instruments: T[];
}

/**
 * Instruments grouped by asset class in `ASSET_CLASSES` order, each group
 * keeping the order it was given. Empty groups are left out. An unknown class
 * throws — it would be an instrument the select silently cannot show.
 */
export function groupByAssetClass<T extends { assetClass: string }>(
  instruments: T[],
): InstrumentGroup<T>[] {
  const byClass = new Map<AssetClass, T[]>();
  for (const instrument of instruments) {
    if (!isAssetClass(instrument.assetClass)) {
      throw new RangeError(`unknown asset class "${instrument.assetClass}"`);
    }
    const group = byClass.get(instrument.assetClass) ?? [];
    group.push(instrument);
    byClass.set(instrument.assetClass, group);
  }
  return ASSET_CLASSES.flatMap((assetClass) => {
    const group = byClass.get(assetClass);
    return group === undefined
      ? []
      : [
          {
            assetClass,
            label: ASSET_CLASS_LABELS[assetClass],
            instruments: group,
          },
        ];
  });
}
