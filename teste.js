// const localDate = new Date().toLocaleDateString('pt-BR');
// const teste = new Date("2025-06-09 04:43:49.330").toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
// console.log(teste);

function convertToTimezoneAndReturnDate(dateStr, timeZone) {
  const date = new Date(dateStr);

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  const parts = formatter.formatToParts(date);
  const map = {};
  parts.forEach(({ type, value }) => {
    map[type] = value;
  });

  const adjustedStr = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}`;
  return new Date(adjustedStr);
}

const original = new Date("2025-06-09T04:43:49.330");

console.log("Original UTC:", original.toISOString());

const convertedDate = convertToTimezoneAndReturnDate("2025-06-09T04:43:49.330", "America/Sao_Paulo");

console.log("Converted Date object:", convertedDate.toISOString());