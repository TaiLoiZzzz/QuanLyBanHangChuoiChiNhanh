// API amounts are decimal currency rounded to whole VND per line by SQL.
export function sumInvoice(items) {
  return items.reduce((totals, row) => {
    for (const key of Object.keys(totals)) totals[key] += Number(row[key] || 0);
    return totals;
  }, { TienGoc: 0, TienChietKhau: 0, TienSauChietKhau: 0, ThueVAT8Pct: 0, TongThanhToanCuoiCung: 0 });
}
