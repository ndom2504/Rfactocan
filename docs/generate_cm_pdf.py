# -*- coding: utf-8 -*-
"""Convert CM presentation markdown to a branded PDF."""
from __future__ import annotations

import re
from pathlib import Path

from fpdf import FPDF

SRC = Path(r"c:\src\rfactocanada\Rfactocan\docs\FICHE-PRESENTATION-CM-RESEAUX-SOCIAUX.md")
OUT = Path(r"c:\src\rfactocanada\Rfactocan\docs\FICHE-PRESENTATION-CM-RESEAUX-SOCIAUX.pdf")

GREEN = (24, 72, 56)
GREEN_SOFT = (37, 211, 102)
INK = (28, 28, 28)
MUTED = (90, 90, 90)
RULE = (220, 225, 220)


class CmPdf(FPDF):
    def header(self) -> None:
        if self.page_no() == 1:
            return
        self.set_font("Helvetica", "B", 9)
        self.set_text_color(*GREEN)
        self.cell(0, 6, "Rfacto — Fiche presentation community managers", align="L")
        self.ln(8)
        self.set_draw_color(*RULE)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(4)

    def footer(self) -> None:
        self.set_y(-14)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*MUTED)
        self.cell(0, 8, f"rfacto.com  |  contact@rfacto.com  |  {self.page_no()}", align="C")


def clean(text: str) -> str:
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u201c", '"').replace("\u201d", '"')
    text = text.replace("\u2014", "-").replace("\u2013", "-")
    text = text.replace("\u2026", "...")
    text = text.replace("\u00a0", " ")
    # Keep latin-1 friendly via replaces for symbols fpdf core fonts struggle with
    text = text.replace("→", "->").replace("·", "|").replace("•", "-")
    text = text.replace("📦", "").replace("🛍️", "").replace("🛠️", "")
    text = re.sub(r"[✅⭐🚀💡🔒🌍]", "", text)
    return text


def strip_md_inline(text: str) -> str:
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"\1", text)
    text = re.sub(r"\*([^*]+)\*", r"\1", text)
    return clean(text)


def write_para(pdf: CmPdf, text: str, size: int = 10, style: str = "", color=INK, lh: float = 5.2) -> None:
    pdf.set_font("Helvetica", style, size)
    pdf.set_text_color(*color)
    pdf.multi_cell(0, lh, strip_md_inline(text))
    pdf.ln(1)


def main() -> None:
    raw = SRC.read_text(encoding="utf-8")
    lines = raw.splitlines()

    pdf = CmPdf(orientation="P", unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.set_margins(16, 16, 16)
    pdf.add_page()

    # Cover band
    pdf.set_fill_color(*GREEN)
    pdf.rect(0, 0, 210, 42, "F")
    pdf.set_xy(16, 12)
    pdf.set_font("Helvetica", "B", 26)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(0, 10, "Rfacto", ln=1)
    pdf.set_x(16)
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 7, "Fiche de presentation — community managers & reseaux sociaux", ln=1)
    pdf.set_x(16)
    pdf.set_font("Helvetica", "I", 10)
    pdf.cell(0, 6, "Connecter. Rapprocher. Faire reussir.  |  www.rfacto.com  |  Aout 2026", ln=1)
    pdf.ln(10)

    in_code = False
    table_buf: list[str] = []

    def flush_table() -> None:
        nonlocal table_buf
        if not table_buf:
            return
        rows = []
        for row in table_buf:
            if re.match(r"^\|?\s*:?-{3,}", row.replace("|", " ").strip()) or set(row.replace("|", "").strip()) <= set("-: "):
                continue
            cells = [c.strip() for c in row.strip().strip("|").split("|")]
            rows.append(cells)
        table_buf = []
        if not rows:
            return
        col_w = (pdf.w - pdf.l_margin - pdf.r_margin) / max(len(rows[0]), 1)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_fill_color(232, 242, 236)
        for i, row in enumerate(rows):
            if i == 0:
                pdf.set_font("Helvetica", "B", 8)
            else:
                pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*INK)
            y0 = pdf.get_y()
            x0 = pdf.l_margin
            max_h = 0
            # first pass heights
            heights = []
            for cell in row:
                # approx height
                lines_n = max(1, pdf.get_string_width(strip_md_inline(cell)) // max(col_w - 2, 10) + 1)
                heights.append(4.5 * lines_n + 1)
            h = max(heights) if heights else 6
            if y0 + h > pdf.h - 20:
                pdf.add_page()
                y0 = pdf.get_y()
            for j, cell in enumerate(row):
                x = x0 + j * col_w
                pdf.set_xy(x, y0)
                fill = i == 0
                pdf.set_fill_color(232, 242, 236) if fill else pdf.set_fill_color(255, 255, 255)
                pdf.rect(x, y0, col_w, h, "DF" if fill else "D")
                pdf.set_xy(x + 1, y0 + 1)
                pdf.multi_cell(col_w - 2, 4, strip_md_inline(cell))
            pdf.set_y(y0 + h)
        pdf.ln(3)

    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            if not in_code:
                pdf.ln(1)
            continue

        if in_code:
            pdf.set_font("Courier", "", 8)
            pdf.set_text_color(40, 80, 55)
            pdf.set_fill_color(245, 248, 245)
            pdf.multi_cell(0, 4.2, clean(line), fill=True)
            continue

        if line.strip().startswith("|"):
            table_buf.append(line)
            continue
        else:
            flush_table()

        s = line.rstrip()
        if not s:
            pdf.ln(2)
            continue
        if s.startswith("# "):
            continue  # title handled on cover
        if s.startswith("## "):
            pdf.ln(3)
            pdf.set_draw_color(*GREEN_SOFT)
            pdf.set_line_width(0.4)
            y = pdf.get_y()
            if y > 250:
                pdf.add_page()
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(*GREEN)
            pdf.multi_cell(0, 7, strip_md_inline(s[3:]))
            pdf.ln(1)
            continue
        if s.startswith("### "):
            pdf.set_font("Helvetica", "B", 11)
            pdf.set_text_color(*GREEN)
            pdf.multi_cell(0, 6, strip_md_inline(s[4:]))
            pdf.ln(0.5)
            continue
        if s.startswith("> "):
            pdf.set_fill_color(236, 246, 240)
            pdf.set_font("Helvetica", "I", 10)
            pdf.set_text_color(*GREEN)
            pdf.multi_cell(0, 5.5, strip_md_inline(s[2:]), fill=True)
            pdf.ln(2)
            continue
        if s.startswith("---"):
            pdf.ln(1)
            pdf.set_draw_color(*RULE)
            pdf.line(pdf.l_margin, pdf.get_y(), pdf.w - pdf.r_margin, pdf.get_y())
            pdf.ln(3)
            continue
        if re.match(r"^[-*] ", s) or re.match(r"^\d+\. ", s):
            body = re.sub(r"^[-*] ", "", s)
            body = re.sub(r"^\d+\. ", "", body)
            write_para(pdf, f"- {body}", size=10)
            continue
        if s.startswith("**") and s.endswith("**") and s.count("**") == 2:
            write_para(pdf, s, size=10, style="B")
            continue

        write_para(pdf, s, size=10)

    flush_table()
    pdf.output(str(OUT))
    print(f"OK {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
