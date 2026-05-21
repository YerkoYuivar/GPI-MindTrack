/**
 * @module utils/datetime
 * @description Utilidades para manejo de fechas y buckets de timeseries
 */

/**
 * Convierte Timestamp de Firestore o cualquier valor a Date
 */
export function toDate(d: any): Date {
  if (!d) return new Date();
  if (d?.toDate) return d.toDate(); // Firestore Timestamp
  return new Date(d);
}

/**
 * Genera la key de día en formato YYYY-MM-DD (UTC)
 */
export function dayKeyUTC(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calcula la semana ISO (lunes = inicio de semana) y sus límites
 * @returns year, week number, start (Monday 00:00), end (next Monday 00:00)
 */
export function isoWeek(d: Date): {
  year: number;
  week: number;
  start: Date;
  end: Date;
} {
  // Copiar fecha a UTC
  const date = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );

  // Obtener día de la semana (Lunes=0, Domingo=6)
  const dayNum = (date.getUTCDay() + 6) % 7;

  // Mover al jueves de esta semana ISO
  date.setUTCDate(date.getUTCDate() - dayNum + 3);

  // Primer jueves del año
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  firstThursday.setUTCDate(
    firstThursday.getUTCDate() -
    ((firstThursday.getUTCDay() + 6) % 7) +
    3
  );

  // Calcular número de semana
  const diff = date.getTime() - firstThursday.getTime();
  const week = 1 + Math.round(diff / (7 * 24 * 3600 * 1000));
  const year = date.getUTCFullYear();

  // Calcular inicio de semana (Lunes 00:00)
  const start = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
  );
  const startDayNum = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - startDayNum);
  start.setUTCHours(0, 0, 0, 0);

  // Fin = Lunes siguiente 00:00
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);

  return {year, week, start, end};
}

/**
 * Genera la key de semana ISO en formato YYYY-Www
 */
export function weekKeyISO(d: Date): string {
  const {year, week} = isoWeek(d);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

/**
 * Obtiene el inicio del día (00:00 UTC)
 */
export function startOfDayUTC(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0)
  );
}

/**
 * Obtiene el final del día (00:00 UTC del día siguiente)
 */
export function endOfDayUTC(d: Date): Date {
  const start = startOfDayUTC(d);
  start.setUTCDate(start.getUTCDate() + 1);
  return start;
}
