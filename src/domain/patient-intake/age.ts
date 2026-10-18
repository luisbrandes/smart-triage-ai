export function getAgeInYears(
  birthDate: string,
  today: Date = new Date(),
): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;

  const date = new Date(`${birthDate}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== birthDate) {
    return null;
  }

  const yearDifference = today.getUTCFullYear() - date.getUTCFullYear();
  const birthdayHasNotOccurred =
    today.getUTCMonth() < date.getUTCMonth() ||
    (today.getUTCMonth() === date.getUTCMonth() &&
      today.getUTCDate() < date.getUTCDate());

  return yearDifference - Number(birthdayHasNotOccurred);
}
