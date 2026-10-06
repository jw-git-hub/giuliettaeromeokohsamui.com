// QR-код рисуется при сборке из самой ссылки — векторный, чёткий на любом экране, в цветах сайта.
// Картинка из оригинала вела на ту же ссылку (https://wa.me/…), но на тёмной странице камера
// читала её плохо: мелкие клетки и узкое светлое поле вокруг.
import QRCode from 'qrcode';

/** Светлое поле вокруг кода, в клетках: меньше четырёх сканеры не прощают. */
const QUIET_ZONE = 4;
/** Средняя устойчивость к помехам: клетки крупнее, чем при высокой, а запас на блики экрана есть. */
const ERROR_CORRECTION = 'M';

export interface QrCodeDrawing {
  /** Сторона квадрата вместе со светлым полем, в клетках. */
  size: number;
  /** Контур всех тёмных клеток для <path d="…">. */
  path: string;
}

export function buildQrCode(text: string): QrCodeDrawing {
  const { modules } = QRCode.create(text, { errorCorrectionLevel: ERROR_CORRECTION });
  const cells: string[] = [];
  modules.data.forEach((isDark, index) => {
    if (!isDark) return;
    const column = (index % modules.size) + QUIET_ZONE;
    const row = Math.floor(index / modules.size) + QUIET_ZONE;
    cells.push(`M${column} ${row}h1v1h-1z`);
  });
  return { size: QUIET_ZONE + modules.size + QUIET_ZONE, path: cells.join('') };
}
