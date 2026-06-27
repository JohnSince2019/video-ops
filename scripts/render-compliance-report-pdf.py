import json
import sys
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


def wrap_text(text: str, font_name: str, font_size: int, width: float):
    words = text.split()
    if not words:
        return [text] if text else [""]

    lines = []
    current = words[0]
    for word in words[1:]:
        candidate = f"{current} {word}"
        if stringWidth(candidate, font_name, font_size) <= width:
            current = candidate
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def draw_block(pdf, x, y, title, lines):
    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(x, y, title)
    y -= 7 * mm
    pdf.setFont("Helvetica", 10)
    for line in lines:
        pdf.drawString(x, y, line)
        y -= 5.5 * mm
    return y - 2 * mm


def main():
    if len(sys.argv) != 3:
        raise SystemExit("usage: render-compliance-report-pdf.py <input.json> <output.pdf>")

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])
    report = json.loads(input_path.read_text(encoding="utf-8"))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf = canvas.Canvas(str(output_path), pagesize=A4)
    width, height = A4
    left = 18 * mm
    y = height - 20 * mm
    content_width = width - 36 * mm

    pdf.setTitle(f"Compliance Report - {report['job']['id']}")
    pdf.setFont("Helvetica-Bold", 18)
    pdf.drawString(left, y, "Video-Ops Compliance Report")
    y -= 9 * mm
    pdf.setFont("Helvetica", 10)
    pdf.drawString(left, y, f"Generated At: {report['generatedAt']}")
    y -= 10 * mm

    job_lines = [
        f"Job ID: {report['job']['id']}",
        f"Title: {report['job']['title']}",
        f"State: {report['job']['state']}",
        f"Platform: {report['job']['platform']}",
        f"Render Profile: {report['job']['renderProfile']}",
        f"Updated At: {report['job']['updatedAt']}",
    ]
    y = draw_block(pdf, left, y, "Job Summary", job_lines)

    compliance_lines = [
        f"Allowed: {'YES' if report['compliance']['allowed'] else 'NO'}",
        f"Violation Count: {report['compliance']['violationCount']}",
    ]
    for item in report["compliance"]["violations"]:
        compliance_lines.extend(
            wrap_text(
                f"- {item['type']} / {item['rule']} / {item['excerpt']}",
                "Helvetica",
                10,
                content_width,
            )
        )
    if not report["compliance"]["violations"]:
        compliance_lines.append("- No violations recorded.")
    y = draw_block(pdf, left, y, "Compliance Result", compliance_lines)

    error_lines = []
    for item in report["errors"]:
        error_lines.extend(
            wrap_text(
                f"- {item['stepName']}: {item['errorMessage']} (retry {item['retryCount']})",
                "Helvetica",
                10,
                content_width,
            )
        )
    if not error_lines:
        error_lines.append("- No errors recorded.")
    y = draw_block(pdf, left, y, "Error Summary", error_lines)

    output_lines = []
    for item in report["outputs"]:
        output_lines.extend(
            wrap_text(f"- {item['kind']}: {item['path']}", "Helvetica", 10, content_width)
        )
    if not output_lines:
        output_lines.append("- No outputs recorded.")
    y = draw_block(pdf, left, y, "Output Artifacts", output_lines)

    pdf.showPage()
    pdf.save()


if __name__ == "__main__":
    main()
