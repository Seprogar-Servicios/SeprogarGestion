const storageKey = (userId: string, role: string) =>
  `seprogar.navOrder.${role}.${userId || 'anon'}`;

export type NavOrderState = {
  /** Orden de hrefs en menús planos (sin grupos) */
  flat?: string[];
  /** Orden de ids de grupos admin */
  groups?: string[];
  /** Orden de hrefs por grupo */
  groupItems?: Record<string, string[]>;
};

export const loadNavOrder = (userId: string, role: string): NavOrderState => {
  try {
    const raw = localStorage.getItem(storageKey(userId, role));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as NavOrderState;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

export const saveNavOrder = (userId: string, role: string, state: NavOrderState) => {
  try {
    localStorage.setItem(storageKey(userId, role), JSON.stringify(state));
  } catch {
    /* ignore */
  }
};

/** Aplica un orden de keys sobre una lista, dejando los faltantes al final. */
export function applyOrder<T>(
  items: T[],
  keyOf: (item: T) => string,
  order: string[] | undefined
): T[] {
  if (!order || order.length === 0) return items;
  const map = new Map(items.map((item) => [keyOf(item), item]));
  const used = new Set<string>();
  const result: T[] = [];
  for (const key of order) {
    const item = map.get(key);
    if (item) {
      result.push(item);
      used.add(key);
    }
  }
  for (const item of items) {
    const key = keyOf(item);
    if (!used.has(key)) result.push(item);
  }
  return result;
}

/** Mueve un ítem (excepto el primero si isPinnedFirst) una posición. */
export function moveInList<T>(
  items: T[],
  index: number,
  direction: -1 | 1,
  opts?: { pinFirst?: boolean }
): T[] {
  const pinFirst = opts?.pinFirst ?? false;
  const minIndex = pinFirst ? 1 : 0;
  const next = index + direction;
  if (index < minIndex || next < minIndex || next >= items.length) return items;
  const copy = [...items];
  const tmp = copy[index];
  copy[index] = copy[next];
  copy[next] = tmp;
  return copy;
}
