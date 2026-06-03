import dayjs from "dayjs";

export function fecha(fec, format = "YYYY-MM-DD") {
  return dayjs(fec).format(format);
}

export function numero(num) {
  if (typeof num == "string") {
    num = numeroDes(num);
  }
  return new Intl.NumberFormat("es-PY", { useGrouping: true }).format(num).trim().replaceAll(",", ".");
}

export function numeroDes(num) {
  return +num.replaceAll(".", "").replaceAll(",", "");
}
