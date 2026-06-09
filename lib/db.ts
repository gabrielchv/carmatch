import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

function filePath(filename: string): string {
  return path.join(DATA_DIR, `${filename}.json`);
}

export function readData<T>(filename: string): T[] {
  const fp = filePath(filename);
  if (!fs.existsSync(fp)) return [];
  const raw = fs.readFileSync(fp, "utf-8");
  if (!raw.trim()) return [];
  return JSON.parse(raw) as T[];
}

export function writeData<T>(filename: string, data: T[]): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(filePath(filename), JSON.stringify(data, null, 2), "utf-8");
}

export function addItem<T extends { id: string }>(
  filename: string,
  item: T
): T {
  const items = readData<T>(filename);
  items.push(item);
  writeData(filename, items);
  return item;
}

export function updateItem<T extends { id: string }>(
  filename: string,
  id: string,
  partial: Partial<T>
): T | null {
  const items = readData<T>(filename);
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...partial };
  writeData(filename, items);
  return items[index];
}

export function deleteItem<T extends { id: string }>(
  filename: string,
  id: string
): boolean {
  const items = readData<T>(filename);
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  writeData(filename, filtered);
  return true;
}

export function getItemById<T extends { id: string }>(
  filename: string,
  id: string
): T | undefined {
  const items = readData<T>(filename);
  return items.find((item) => item.id === id);
}

export function clearData(filename: string): void {
  writeData(filename, []);
}
