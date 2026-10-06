// Сверка формы перевода с английским словарём: те же ключи, те же длины списков, нет пустых строк.

type JsonValue = string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertString(candidate: unknown, path: string): void {
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    throw new Error(`Перевод: пустая или отсутствующая строка — ${path}`);
  }
}

function assertArray(reference: JsonValue[], candidate: unknown, path: string): void {
  if (!Array.isArray(candidate) || candidate.length !== reference.length) {
    throw new Error(`Перевод: список другой длины — ${path}`);
  }
  reference.forEach((item, index) => assertSameShape(item, candidate[index], `${path}[${index}]`));
}

function assertObject(reference: JsonObject, candidate: unknown, path: string): void {
  if (!isObject(candidate)) throw new Error(`Перевод: нет раздела — ${path}`);
  const extraKeys = Object.keys(candidate).filter((key) => !(key in reference));
  if (extraKeys.length > 0) throw new Error(`Перевод: лишние ключи — ${path}.${extraKeys.join(', ')}`);
  Object.keys(reference).forEach((key) => assertSameShape(reference[key], candidate[key], `${path}.${key}`));
}

export function assertSameShape(reference: JsonValue, candidate: unknown, path: string): void {
  if (typeof reference === 'string') return assertString(candidate, path);
  if (Array.isArray(reference)) return assertArray(reference, candidate, path);
  return assertObject(reference, candidate, path);
}

/** Для языков-проб: недостающее берётся из английского, лишние ключи — ошибка. */
export function mergeOverReference<T extends JsonValue>(reference: T, partial: unknown, path: string): T {
  if (partial === undefined) return reference;
  if (!isObject(reference)) return partial as T;
  if (!isObject(partial)) throw new Error(`Перевод: ожидался раздел — ${path}`);
  const extraKeys = Object.keys(partial).filter((key) => !(key in reference));
  if (extraKeys.length > 0) throw new Error(`Перевод: лишние ключи — ${path}.${extraKeys.join(', ')}`);
  const mergedEntries = Object.keys(reference).map((key) => [
    key,
    mergeOverReference(reference[key], partial[key], `${path}.${key}`),
  ]);
  return Object.fromEntries(mergedEntries) as T;
}
