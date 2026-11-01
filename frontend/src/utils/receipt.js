/**
 * In phiếu: thêm class print-receipt vào body để CSS @media print chỉ in vùng phiếu
 * (xem index.css – mục "Phiếu thu viện phí").
 */
export function printReceipt() {
  const body = document.body;
  const cleanup = () => {
    body.classList.remove('print-receipt');
    window.removeEventListener('afterprint', cleanup);
  };
  body.classList.add('print-receipt');
  window.addEventListener('afterprint', cleanup);
  window.print();
  cleanup();
}
