from __future__ import annotations

from PySide6.QtCore import Qt, QRectF
from PySide6.QtGui import QColor, QFont, QPainter, QPen
from PySide6.QtWidgets import QWidget


class Gauge(QWidget):
    """Medidor circular simples estilo 'velocímetro' para % (CPU, disco, tablespace)."""

    def __init__(self, title: str, warn: float = 75, crit: float = 90, parent=None):
        super().__init__(parent)
        self._title = title
        self._value = 0.0
        self._warn = warn
        self._crit = crit
        self.setMinimumSize(120, 140)

    def set_value(self, value: float):
        self._value = max(0.0, min(100.0, value))
        self.update()

    def set_thresholds(self, warn: float, crit: float):
        self._warn = warn
        self._crit = crit
        self.update()

    def _color(self) -> QColor:
        if self._value >= self._crit:
            return QColor("#ef4444")
        if self._value >= self._warn:
            return QColor("#f59e0b")
        return QColor("#22c55e")

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        side = min(self.width(), self.height() - 24)
        rect = QRectF((self.width() - side) / 2, 4, side, side)

        bg_pen = QPen(QColor("#2b3444"), 10)
        bg_pen.setCapStyle(Qt.RoundCap)
        painter.setPen(bg_pen)
        painter.drawArc(rect.adjusted(8, 8, -8, -8), 225 * 16, -270 * 16)

        fg_pen = QPen(self._color(), 10)
        fg_pen.setCapStyle(Qt.RoundCap)
        painter.setPen(fg_pen)
        span = -270 * (self._value / 100.0)
        painter.drawArc(rect.adjusted(8, 8, -8, -8), 225 * 16, int(span * 16))

        painter.setPen(QColor("#f1f5f9"))
        font = QFont()
        font.setPointSize(14)
        font.setBold(True)
        painter.setFont(font)
        painter.drawText(rect, Qt.AlignCenter, f"{self._value:.0f}%")

        painter.setPen(QColor("#9ca3af"))
        font.setPointSize(9)
        font.setBold(False)
        painter.setFont(font)
        painter.drawText(0, int(rect.bottom()), self.width(), 18, Qt.AlignHCenter, self._title)
