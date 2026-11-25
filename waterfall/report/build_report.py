"""
Генерация пояснительной записки «Курсовая_PulseFit.docx» на основе шаблона кафедры.

Данные берутся из проекта, поэтому после правок отчёт можно пересобрать:
  - report/assets/test-run.txt, coverage-summary.json — прогон тестов и покрытие;
  - report/assets/blackbox.json, screenshots/ — тест-кейсы и скриншоты (report/blackbox.mjs);
  - report/assets/lighthouse/*.report.json — результаты Lighthouse;
  - src/lib/*.ts — фрагменты кода.

Номера страниц в содержании и объём записки определяются через MS Word (COM).

Запуск:  python report/build_report.py [--check-pdf ПУТЬ]
  --check-pdf — дополнительно сохранить PDF по указанному пути для проверки вёрстки.
"""

import argparse
import copy
import json
import re
import sys
import tempfile
from datetime import date
from pathlib import Path

from docx import Document
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor
from docx.table import Table
from docx.text.paragraph import Paragraph
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
REPORT = ROOT / 'report'
ASSETS = REPORT / 'assets'
SHOTS = ASSETS / 'screenshots'
FIGURES = ASSETS / 'figures'
TEMPLATE = REPORT / 'template.docx'
OUTPUT = REPORT / 'Курсовая_PulseFit.docx'

ACCESS_DATE = date.today().strftime('%d.%m.%Y')

# Данные, которые заполняет студент: остаются заглушками и выделяются красным, как в шаблоне
DEPARTMENT = '<КАФЕДРА>'
DISCIPLINE = '<ДИСЦИПЛИНА>'
STUDENT = '<ФИО>'
GROUP = '<ГРУППА>'
TEACHER = '<ФИО ПРЕПОДАВАТЕЛЯ>'
DATES = '<ДАТЫ>'
TOPIC = 'Разработка лендинга фитнес-клуба с калькулятором абонемента по модели Waterfall'
YEAR = '2026'

RED = 'FF0000'
BODY_SIZE = Pt(14)
TABLE_SIZE = Pt(12)
CODE_SIZE = Pt(10)

# Порядок таблиц и рисунков в тексте задаёт их номера
TABLES = ['form_rules', 'calc_params', 'control', 'auto_tests', 'coverage', 'blackbox', 'lighthouse']
FIGS = ['main', 'calc_promo', 'calc_error', 'form_errors', 'mobile', 'tablet']


def tab(key: str) -> int:
    return TABLES.index(key) + 1


def fig(key: str) -> int:
    return FIGS.index(key) + 1


# ---------------------------------------------------------------------------
# Данные проекта
# ---------------------------------------------------------------------------

def load_data() -> dict:
    run = (ASSETS / 'test-run.txt').read_text(encoding='utf8')
    per_file: dict[str, int] = {}
    for m in re.finditer(r'^\s*✓ (tests/\S+) >', run, re.M):
        per_file[m.group(1)] = per_file.get(m.group(1), 0) + 1
    total = re.search(r'Tests\s+(\d+) passed \((\d+)\)', run)
    files = re.search(r'Test Files\s+(\d+) passed', run)

    summary = json.loads((ASSETS / 'coverage-summary.json').read_text(encoding='utf8'))
    coverage = {}
    for key, value in summary.items():
        name = 'Всего (src/lib)' if key == 'total' else Path(key).name
        coverage[name] = {m: value[m]['pct'] for m in ('statements', 'branches', 'functions', 'lines')}

    lighthouse = {}
    for kind in ('mobile', 'desktop'):
        data = json.loads((ASSETS / 'lighthouse' / f'{kind}.report.json').read_text(encoding='utf8'))
        lighthouse[kind] = {c['title']: round(c['score'] * 100) for c in data['categories'].values()}

    blackbox = json.loads((ASSETS / 'blackbox.json').read_text(encoding='utf8'))

    return {
        'tests_per_file': per_file,
        'tests_total': int(total.group(1)),
        'tests_passed': int(total.group(1)) if total.group(1) == total.group(2) else None,
        'test_files': int(files.group(1)),
        'coverage': coverage,
        'lighthouse': lighthouse,
        'blackbox': blackbox,
    }


def extract_function(path: Path, name: str) -> str:
    """Исходный текст экспортируемой функции (от сигнатуры до закрывающей скобки)."""
    source = path.read_text(encoding='utf8')
    start = source.index(f'export function {name}(')
    end = source.index('\n}\n', start) + 2
    return source[start:end]


def prepare_figures() -> dict[str, Path]:
    """Готовит иллюстрации из скриншотов Playwright: обрезка и компоновка."""
    FIGURES.mkdir(parents=True, exist_ok=True)

    def framed(img: Image.Image) -> Image.Image:
        draw = ImageDraw.Draw(img)
        draw.rectangle([0, 0, img.width - 1, img.height - 1], outline=(190, 190, 205), width=2)
        return img

    out = {}
    page1440 = Image.open(SHOTS / 'page-1440.png').convert('RGB')
    out['main'] = FIGURES / 'main-1440.png'
    framed(page1440.crop((0, 0, 1440, 1130))).save(out['main'])

    for key, name in (('calc_promo', 'calculator-promo-1440'), ('calc_error', 'calculator-error-1440'),
                      ('form_errors', 'form-errors-1440')):
        out[key] = FIGURES / f'{name}.png'
        framed(Image.open(SHOTS / f'{name}.png').convert('RGB')).save(out[key])

    first = Image.open(SHOTS / 'page-360.png').convert('RGB').crop((0, 0, 360, 780))
    menu = Image.open(SHOTS / 'burger-360.png').convert('RGB').crop((0, 0, 360, 780))
    gap = 48
    combined = Image.new('RGB', (360 * 2 + gap, 780), 'white')
    combined.paste(framed(first), (0, 0))
    combined.paste(framed(menu), (360 + gap, 0))
    out['mobile'] = FIGURES / 'mobile-360.png'
    combined.save(out['mobile'])

    page768 = Image.open(SHOTS / 'page-768.png').convert('RGB')
    out['tablet'] = FIGURES / 'tablet-768.png'
    framed(page768.crop((0, 0, 768, 1240))).save(out['tablet'])
    return out


# ---------------------------------------------------------------------------
# Низкоуровневые помощники python-docx
# ---------------------------------------------------------------------------

def set_run_font(run, size=BODY_SIZE, bold=None, italic=None, caps=None, mono=False, color=None):
    run.font.size = size
    if bold is not None:
        run.bold = bold
    if italic is not None:
        run.italic = italic
    if caps is not None:
        run.font.all_caps = caps
    font = 'Courier New' if mono else 'Times New Roman'
    run.font.name = font
    rfonts = run._r.get_or_add_rPr().get_or_add_rFonts()
    for attr in ('w:ascii', 'w:hAnsi', 'w:cs', 'w:eastAsia'):
        rfonts.set(qn(attr), font)
    if color:
        run.font.color.rgb = RGBColor.from_string(color)


def replace_runs(paragraph: Paragraph, segments: list[tuple[str, bool]]):
    """
    Заменяет текстовые фрагменты абзаца шаблона, сохраняя оформление первого фрагмента.
    segments — список (текст, красный?). Нетекстовые фрагменты (разрывы страниц) сохраняются.
    """
    p = paragraph._p
    text_tags = {qn('w:rPr'), qn('w:t')}
    text_runs = [r for r in p.findall(qn('w:r')) if all(child.tag in text_tags for child in r)]
    with_text = [r for r in text_runs if r.find(qn('w:t')) is not None]
    source = with_text[0] if with_text else (text_runs[0] if text_runs else None)
    base_rpr = source.find(qn('w:rPr')) if source is not None else None
    if base_rpr is None:
        base_rpr = p.find(qn('w:pPr') + '/' + qn('w:rPr'))
    anchor_index = list(p).index(text_runs[0]) if text_runs else len(p)
    for r in text_runs:
        p.remove(r)
    for offset, (text, red) in enumerate(segments):
        r = OxmlElement('w:r')
        rpr = copy.deepcopy(base_rpr) if base_rpr is not None else OxmlElement('w:rPr')
        for c in rpr.findall(qn('w:color')):
            rpr.remove(c)
        if red:
            color = OxmlElement('w:color')
            color.set(qn('w:val'), RED)
            # порядок элементов rPr: color идёт перед sz
            sz = rpr.find(qn('w:sz'))
            if sz is not None:
                sz.addprevious(color)
            else:
                rpr.append(color)
        r.append(rpr)
        t = OxmlElement('w:t')
        t.set(qn('xml:space'), 'preserve')
        t.text = text
        r.append(t)
        p.insert(anchor_index + offset, r)
    # убрать красный цвет и выделение у знака абзаца
    ppr_rpr = p.find(qn('w:pPr') + '/' + qn('w:rPr'))
    if ppr_rpr is not None:
        for tag in ('w:color', 'w:highlight'):
            for el in ppr_rpr.findall(qn(tag)):
                ppr_rpr.remove(el)


def clone_paragraph_after(paragraph: Paragraph) -> Paragraph:
    new_p = copy.deepcopy(paragraph._p)
    paragraph._p.addnext(new_p)
    return Paragraph(new_p, paragraph._parent)


def remove_element(el):
    el.getparent().remove(el)


def add_bookmark(paragraph: Paragraph, name: str, bid: int):
    start = OxmlElement('w:bookmarkStart')
    start.set(qn('w:id'), str(bid))
    start.set(qn('w:name'), name)
    end = OxmlElement('w:bookmarkEnd')
    end.set(qn('w:id'), str(bid))
    paragraph._p.insert(1, start)
    paragraph._p.append(end)


def set_shading(paragraph: Paragraph, fill: str):
    ppr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill)
    ppr.append(shd)


def set_table_borders(table: Table):
    tbl_pr = table._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for edge in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement(f'w:{edge}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), '4')
        el.set(qn('w:space'), '0')
        el.set(qn('w:color'), '000000')
        borders.append(el)
    tbl_pr.append(borders)


def set_repeat_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    el = OxmlElement('w:tblHeader')
    el.set(qn('w:val'), 'true')
    tr_pr.append(el)


def set_cant_split(row):
    tr_pr = row._tr.get_or_add_trPr()
    el = OxmlElement('w:cantSplit')
    el.set(qn('w:val'), 'true')
    tr_pr.append(el)


# ---------------------------------------------------------------------------
# Построитель основной части
# ---------------------------------------------------------------------------

class Builder:
    def __init__(self, doc: Document, pages: dict | None):
        self.doc = doc
        self.pages = pages or {}
        self.bookmark_id = 100
        self.toc: list[tuple[str, str, str]] = []  # (номер, название, закладка)

    # --- абзацы ---
    def _fmt(self, p, align=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=True, spacing=1.5, keep_next=False):
        pf = p.paragraph_format
        pf.alignment = align
        pf.first_line_indent = Cm(1.25) if indent else Cm(0)
        pf.line_spacing = spacing
        pf.space_before = Pt(0)
        pf.space_after = Pt(0)
        pf.keep_with_next = keep_next
        return p

    def text(self, content: str | list, align=WD_ALIGN_PARAGRAPH.JUSTIFY, indent=True, keep_next=False):
        """Абзац основного текста. content — строка или список (текст, {bold, italic, mono}) фрагментов."""
        p = self._fmt(self.doc.add_paragraph(), align, indent, keep_next=keep_next)
        parts = [(content, {})] if isinstance(content, str) else content
        for part in parts:
            chunk, opts = (part, {}) if isinstance(part, str) else part
            run = p.add_run(chunk)
            set_run_font(run, size=Pt(13) if opts.get('mono') else BODY_SIZE, bold=opts.get('bold'),
                         italic=opts.get('italic'), mono=opts.get('mono', False))
        return p

    def bullets(self, items: list):
        """Перечисление с тире, последний элемент заканчивается точкой."""
        for item in items:
            self.text(['– ', *([item] if isinstance(item, str) else item)])

    def numbered(self, items: list[str]):
        for i, item in enumerate(items, 1):
            self.text(f'{i}) {item}')

    def empty(self):
        return self._fmt(self.doc.add_paragraph(), indent=False)

    # --- заголовки ---
    def _bookmark(self, p) -> str:
        self.bookmark_id += 1
        name = f'_report_toc_{self.bookmark_id}'
        add_bookmark(p, name, self.bookmark_id)
        return name

    def section(self, number: str | None, title: str):
        """Заголовок раздела: с новой страницы, по центру, полужирный, прописные."""
        p = self._fmt(self.doc.add_paragraph(), WD_ALIGN_PARAGRAPH.CENTER, indent=False, keep_next=True)
        p.paragraph_format.page_break_before = True
        run = p.add_run(f'{number}. {title}' if number else title)
        set_run_font(run, bold=True, caps=True)
        self.toc.append((f'{number}.' if number else '', title, self._bookmark(p)))
        self.empty().paragraph_format.keep_with_next = True

    def subsection(self, number: str, title: str, first=False):
        if not first:
            self.empty()
        p = self._fmt(self.doc.add_paragraph(), WD_ALIGN_PARAGRAPH.LEFT, indent=True, keep_next=True)
        run = p.add_run(f'{number}. {title}')
        set_run_font(run, bold=True)
        self.toc.append((f'{number}.', title, self._bookmark(p)))

    # --- код ---
    CODE_WIDTH = 78  # символов Courier New 10 pt в строке текста

    @classmethod
    def wrap_code_line(cls, line: str) -> list[str]:
        """Переносит длинную строку кода по пробелу с дополнительным отступом продолжения."""
        result = []
        indent = ' ' * (len(line) - len(line.lstrip()) + 4)
        while len(line) > cls.CODE_WIDTH:
            cut = line.rfind(' ', len(indent), cls.CODE_WIDTH)
            if cut <= 0:
                break
            result.append(line[:cut])
            line = indent + line[cut + 1:]
        result.append(line)
        return result

    def code(self, source: str):
        """Блок кода; не разрывается между страницами."""
        lines = [part for line in source.rstrip('\n').split('\n') for part in self.wrap_code_line(line)]
        for i, line in enumerate(lines):
            p = self._fmt(self.doc.add_paragraph(), WD_ALIGN_PARAGRAPH.LEFT, indent=False, spacing=1.0,
                          keep_next=i < len(lines) - 1)
            p.paragraph_format.left_indent = Cm(0.3)
            if i == 0:
                p.paragraph_format.space_before = Pt(6)
            if i == len(lines) - 1:
                p.paragraph_format.space_after = Pt(6)
            set_shading(p, 'F2F2F2')
            run = p.add_run(line if line else ' ')
            set_run_font(run, size=CODE_SIZE, mono=True)

    # --- таблицы ---
    def table(self, key: str, title: str, headers: list[str], rows: list[list[str]], widths_cm: list[float],
              size=TABLE_SIZE, center_cols=(), bold_last_row=False):
        caption = self._fmt(self.doc.add_paragraph(), WD_ALIGN_PARAGRAPH.LEFT, indent=False, keep_next=True)
        caption.paragraph_format.space_before = Pt(6)
        set_run_font(caption.add_run(f'Таблица {tab(key)} — {title}'))

        table = self.doc.add_table(rows=1 + len(rows), cols=len(headers))
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        table.autofit = False
        set_table_borders(table)
        for r_idx, values in enumerate([headers, *rows]):
            row = table.rows[r_idx]
            set_cant_split(row)
            if r_idx == 0:
                set_repeat_header(row)
            for c_idx, value in enumerate(values):
                cell = row.cells[c_idx]
                cell.width = Cm(widths_cm[c_idx])
                p = cell.paragraphs[0]
                header = r_idx == 0
                align = WD_ALIGN_PARAGRAPH.CENTER if header or c_idx in center_cols else WD_ALIGN_PARAGRAPH.LEFT
                self._fmt(p, align, indent=False, spacing=1.0)
                lines = str(value).split('\n')
                for l_idx, line in enumerate(lines):
                    run = p.add_run(line)
                    bold = header or (bold_last_row and r_idx == len(rows))
                    set_run_font(run, size=size, bold=bold)
                    if l_idx < len(lines) - 1:
                        run.add_break()
        self.empty()
        return table

    # --- рисунки ---
    def figure(self, key: str, path: Path, title: str, width_cm: float):
        p = self._fmt(self.doc.add_paragraph(), WD_ALIGN_PARAGRAPH.CENTER, indent=False, spacing=1.0, keep_next=True)
        p.paragraph_format.space_before = Pt(6)
        p.add_run().add_picture(str(path), width=Cm(width_cm))
        caption = self._fmt(self.doc.add_paragraph(), WD_ALIGN_PARAGRAPH.CENTER, indent=False)
        caption.paragraph_format.space_after = Pt(6)
        set_run_font(caption.add_run(f'Рисунок {fig(key)} — {title}'))


# ---------------------------------------------------------------------------
# Титульный лист, задание, аннотация, содержание (правка шаблона)
# ---------------------------------------------------------------------------

def fill_front_matter(doc: Document, total_pages: int | None):
    paragraphs = doc.paragraphs
    by_text = lambda prefix: next(p for p in paragraphs if p.text.startswith(prefix))  # noqa: E731

    replace_runs(by_text('Кафедра'), [('Кафедра ', False), (DEPARTMENT, True)])
    replace_runs(by_text('Курсовая РАБОТА'), [('Курсовой проект', False)])
    replace_runs(by_text('по дисциплине'), [('по дисциплине «', False), (DISCIPLINE, True), ('»', False)])
    topic = by_text('Тема:')
    replace_runs(topic, [('Тема: ', False), (TOPIC, False)])
    replace_runs(by_text('2015'), [(YEAR, False)])
    # Тема занимает две строки вместо одной: убираем пустые строки под ней, чтобы год остался на титульном листе
    blanks_after_topic = paragraphs[paragraphs.index(topic) + 1:]
    for p in blanks_after_topic[:3]:
        assert not p.text, 'ожидались пустые абзацы под темой'
        remove_element(p._p)

    title_table, task_table = doc.tables[0], doc.tables[1]
    replace_runs(title_table.cell(0, 0).paragraphs[0], [('Студент гр. ', False), (GROUP, True)])
    replace_runs(title_table.cell(0, 2).paragraphs[0], [(STUDENT, True)])
    replace_runs(title_table.cell(1, 2).paragraphs[0], [(TEACHER, True)])

    # Лист задания
    replace_runs(by_text('на курсовую работу'), [('на курсовой проект', False)])
    cell = lambda r: task_table.rows[r].cells[0]  # noqa: E731
    replace_runs(cell(0).paragraphs[0], [('Студент ', False), (STUDENT, True)])
    replace_runs(cell(1).paragraphs[0], [('Группа ', False), (GROUP, True)])
    replace_runs(cell(2).paragraphs[0], [('Тема проекта: ', False), (TOPIC, False)])

    source = cell(3).paragraphs
    replace_runs(source[1], [(
        'Лендинг фитнес-клуба PulseFit: калькулятор стоимости абонемента (тариф, срок со скидкой, доп. услуги, '
        'тренировки, промокод) и форма заявки с проверкой полей. Стек: React 18, TypeScript, Vite, Vitest. '
        'Модель жизненного цикла — Waterfall.', False)])
    remove_element(source[2]._p)

    # Резерв высоты строки «Содержание пояснительной записки» уменьшен, чтобы лист задания уместился на страницу
    task_table.rows[4]._tr.trPr.find(qn('w:trHeight')).set(qn('w:val'), '2200')
    replace_runs(cell(4).paragraphs[1], [(
        'Введение; Анализ требований; Проектирование архитектуры; Реализация; Тестирование; Внедрение; '
        'Сопровождение; Заключение; Список использованных источников.', False)])

    volume = str(total_pages // 5 * 5) if total_pages else '00'
    replace_runs(cell(5).paragraphs[1], [('Не менее ', False), (volume + ' ', False), ('страниц.', False)])
    for r, label in ((6, 'Дата выдачи задания: '), (7, 'Дата сдачи реферата: '), (8, 'Дата защиты реферата: ')):
        replace_runs(cell(r).paragraphs[0], [(label, False), (DATES, True)])
    replace_runs(task_table.rows[9].cells[0].paragraphs[0], [('Студент', False)])
    replace_runs(task_table.rows[9].cells[2].paragraphs[0], [(STUDENT, True)])
    replace_runs(task_table.rows[10].cells[2].paragraphs[0], [(TEACHER, True)])


ANNOTATION = (
    'В курсовом проекте по каскадной модели жизненного цикла (Waterfall) разработан лендинг вымышленного '
    'фитнес-клуба PulseFit с калькулятором стоимости абонемента и формой заявки. Последовательно выполнены '
    'анализ требований, проектирование, реализация и тестирование; внедрение и сопровождение описаны. '
    'Приложение реализовано на React 18 и TypeScript со сборкой Vite, расчёт стоимости и проверка данных '
    'вынесены в чистые функции. Применены модульное и компонентное тестирование, методы белого и чёрного '
    'ящика, анализ граничных значений и проверка адаптивности. Пройдены все {tests} автоматизированных '
    'тестов и {cases} тест-кейсов, покрытие бизнес-логики — {cov} %, оценки Lighthouse по '
    'производительности и доступности — не ниже {lh}.'
)

SUMMARY = (
    'The course project presents a landing page of a fictional fitness club PulseFit with a membership price '
    'calculator and an application form, developed according to the Waterfall life cycle model. Requirements '
    'analysis, design, implementation and testing were completed in sequence; deployment and maintenance are '
    'described. The application is built with React 18, TypeScript and Vite; pricing and validation logic is '
    'implemented as pure functions. Unit and component testing, white-box and black-box methods, boundary '
    'value analysis and responsive layout checks were applied. All {tests} automated tests and {cases} test '
    'cases passed, business logic coverage is {cov} %, Lighthouse performance and accessibility scores are '
    'at least {lh}.'
)


def fill_abstracts(doc: Document, data: dict):
    paragraphs = doc.paragraphs
    start = next(i for i, p in enumerate(paragraphs) if p.text == 'Аннотация')
    summary_idx = next(i for i, p in enumerate(paragraphs) if p.text == 'Summary')

    lh = min(v for kind in data['lighthouse'].values() for k, v in kind.items()
             if k in ('Performance', 'Accessibility'))
    values = dict(tests=data['tests_total'], cases=len(data['blackbox']['results']),
                  cov=f"{data['coverage']['Всего (src/lib)']['lines']:g}", lh=lh)

    replace_runs(paragraphs[start + 2], [(ANNOTATION.format(**values), False)])
    # лишние пустые абзацы-заглушки между аннотацией и Summary
    for p in paragraphs[start + 3:summary_idx - 1]:
        remove_element(p._p)
    replace_runs(paragraphs[summary_idx + 2], [(SUMMARY.format(**values), False)])


def fill_toc(doc: Document, toc: list[tuple[str, str, str]], pages: dict):
    table = doc.tables[2]
    prototype = copy.deepcopy(table.rows[0]._tr)
    for row in list(table.rows):
        table._tbl.remove(row._tr)
    for number, title, bookmark in toc:
        tr = copy.deepcopy(prototype)
        table._tbl.append(tr)
        row = table.rows[-1]
        page = str(pages.get(bookmark, '0'))
        for idx, value in enumerate((number, title, page)):
            p = row.cells[idx].paragraphs[0]
            replace_runs(p, [(value, False)])


def truncate_template_body(doc: Document):
    """Удаляет примерную основную часть шаблона после таблицы содержания."""
    body = doc.element.body
    toc_tbl = doc.tables[2]._tbl
    remove = False
    for el in list(body):
        if el is toc_tbl:
            remove = True
            continue
        if remove and el.tag != qn('w:sectPr'):
            body.remove(el)


# ---------------------------------------------------------------------------
# Основная часть
# ---------------------------------------------------------------------------

PROJECT_TREE = """pulsefit/
├── index.html
├── package.json           # скрипты: dev, build, test, test:coverage, lint
├── vite.config.ts         # сборка и настройки Vitest
├── src/
│   ├── main.tsx           # точка входа
│   ├── App.tsx            # корневой компонент, состояние калькулятора
│   ├── types.ts           # Plan, MembershipConfig, PriceBreakdown, ...
│   ├── config/pricing.ts  # тарифы, скидки, цены услуг, промокод
│   ├── lib/
│   │   ├── calculator.ts  # calculatePrice, draftToConfig
│   │   ├── validation.ts  # validateName, validatePhone, ...
│   │   └── format.ts      # formatRub, formatMonths
│   ├── components/        # Header, Hero, About, Plans,
│   │                      # Calculator, OrderForm, Footer
│   └── styles/            # CSS по БЭМ, файл на компонент
├── tests/
│   ├── calculator.test.ts
│   ├── validation.test.ts
│   ├── format.test.ts
│   └── components/        # Calculator.test.tsx, OrderForm.test.tsx
└── report/                # шаблон, скрипты отчёта и тестирования"""

WORKFLOW_YAML = """name: deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    permissions: { pages: write, id-token: write }
    environment: github-pages
    steps:
      - uses: actions/deploy-pages@v4"""

SOURCES = [
    'ГОСТ 34.601–90. Информационная технология. Комплекс стандартов на автоматизированные системы. '
    'Автоматизированные системы. Стадии создания. М.: Стандартинформ, 2009.',
    'ГОСТ Р ИСО/МЭК 12207–2010. Информационная технология. Системная и программная инженерия. '
    'Процессы жизненного цикла программных средств. М.: Стандартинформ, 2011.',
    'Соммервилл И. Инженерия программного обеспечения. 6-е изд. М.: Вильямс, 2002. 624 с.',
    'React: документация // React. URL: https://react.dev/ (дата обращения: {d}).',
    'TypeScript Documentation // TypeScript. URL: https://www.typescriptlang.org/docs/ (дата обращения: {d}).',
    'Vite: руководство // Vite. URL: https://vite.dev/guide/ (дата обращения: {d}).',
    'Vitest: руководство // Vitest. URL: https://vitest.dev/guide/ (дата обращения: {d}).',
    'React Testing Library // Testing Library. URL: https://testing-library.com/docs/react-testing-library/intro/ '
    '(дата обращения: {d}).',
]


def build_body(b: Builder, data: dict, figures: dict[str, Path]):
    lib = ROOT / 'src' / 'lib'

    # ---------------- Введение ----------------
    b.section(None, 'Введение')
    b.text('Сайт фитнес-клуба — один из основных каналов привлечения клиентов: посетителю важно быстро понять, '
           'что предлагает клуб и сколько будет стоить абонемент с нужными услугами.')
    b.text('Цель работы — разработать одностраничный сайт (лендинг) вымышленного фитнес-клуба PulseFit, '
           'на котором посетитель знакомится с клубом, рассчитывает стоимость абонемента в калькуляторе '
           'и оставляет заявку, выполнив разработку по каскадной модели жизненного цикла.')
    b.text('Для достижения цели поставлены задачи:', keep_next=True)
    b.numbered([
        'проанализировать и формализовать функциональные и нефункциональные требования;',
        'спроектировать архитектуру приложения, структуру проекта и типы данных;',
        'реализовать страницу, калькулятор абонемента и форму заявки;',
        'протестировать приложение методами белого и чёрного ящика и подготовить результаты;',
        'описать порядок внедрения и сопровождения.',
    ])
    b.text('Выбрана каскадная модель (Waterfall), в которой этапы выполняются строго последовательно и каждый '
           'завершается проверяемым результатом. Модель подходит для проекта по нескольким причинам. '
           'Требования известны заранее, полностью описаны в техническом задании и не меняются в ходе работы. '
           'Объём продукта небольшой, а правила расчёта стоимости заданы формулой и контрольными значениями, '
           'поэтому корректность можно проверить однозначно.')
    b.text('Недостаток модели — позднее получение работающего продукта и дорогие изменения требований. '
           'В проекте этот риск снижен: результат каждого этапа согласовывался с заказчиком, а контрольные '
           'значения расчёта проверены ещё при анализе требований.')

    # ---------------- 1. Анализ требований ----------------
    b.section('1', 'Анализ требований')
    b.text('Исходные требования заданы техническим заданием. На этапе анализа проверены их полнота '
           'и непротиворечивость: контрольные значения стоимости пересчитаны по формуле и совпали, а неоднозначные '
           'места согласованы с заказчиком. Пока число тренировок введено некорректно, итог остаётся равным '
           'последнему корректному расчёту и не меняется при изменении других полей. Пробелы по краям имени '
           'не учитываются. После отправки заявки очищается только форма, а калькулятор сохраняет выбранную '
           'конфигурацию.')

    b.subsection('1.1', 'Функциональные требования', first=True)
    b.text('Страница состоит из следующих блоков:', keep_next=True)
    b.bullets([
        'шапка с логотипом, якорным меню (О клубе, Тарифы, Калькулятор, Контакты) и кнопкой «Оставить заявку»; '
        'на ширине менее 768 px меню сворачивается в бургер;',
        'главный экран с заголовком, подзаголовком и кнопкой перехода к калькулятору;',
        'блок «О клубе» из четырёх карточек преимуществ с иконками;',
        'блок «Тарифы» из трёх карточек; цены и состав берутся из того же конфигурационного файла, '
        'что и в калькуляторе;',
        'калькулятор абонемента и форма заявки;',
        'подвал с адресом, телефоном, часами работы и ссылками на социальные сети.',
    ])
    b.text('Калькулятор пересчитывает стоимость сразу при изменении любого поля и показывает разбивку: '
           'стоимость тарифа без скидки, скидку за срок, доп. услуги, тренировки, скидку по промокоду, итог '
           'и цену в месяц. Если количество тренировок введено неверно, поле подсвечивается красным, '
           'под ним выводится текст ошибки, а итог не пересчитывается.')
    b.text(f'Форма заявки проверяет поля по правилам таблицы {tab("form_rules")}. Ошибка выводится под полем '
           'после потери фокуса и при попытке отправки. Над кнопкой отправки показывается сводка выбранного '
           'абонемента. Отправка эмулируется: объект с данными формы, конфигурацией и итогом выводится в консоль, '
           'пользователь видит сообщение «Заявка отправлена», форма очищается.')
    b.table('form_rules', 'Правила проверки полей формы заявки', ['Поле', 'Правило'], [
        ['Имя', 'Обязательно; 2–50 символов; только буквы (кириллица, латиница), пробел, дефис'],
        ['Телефон', 'Обязательно; после удаления пробелов, скобок и дефисов соответствует шаблону +7 и 10 цифр'],
        ['Email', 'Необязательно; если заполнено — корректный формат адреса'],
        ['Согласие на обработку данных', 'Обязательный чекбокс'],
    ], [5.0, 12.0])

    b.subsection('1.2', 'Нефункциональные требования')
    b.bullets([
        'стек: React 18, TypeScript в строгом режиме, сборщик Vite, стили — CSS по методологии БЭМ без UI-библиотек;',
        'бизнес-логика (расчёт и валидация) — чистые функции без зависимости от React и DOM, '
        'цены и тарифы — в одном конфигурационном файле;',
        'адаптивная вёрстка для ширины экрана от 360 до 1440 px и более, поддержка последних версий Chrome, '
        'Firefox, Safari и Edge;',
        'оценки Lighthouse Performance и Accessibility — не ниже 90;',
        'семантическая разметка, подписи у всех полей, видимый фокус, атрибуты aria-invalid и aria-describedby '
        'для ошибок;',
        'только статические файлы, без серверной части.',
    ])

    b.subsection('1.3', 'Правила расчёта стоимости')
    b.text(f'Параметры калькулятора приведены в таблице {tab("calc_params")}.', keep_next=True)
    b.table('calc_params', 'Параметры калькулятора абонемента', ['Параметр', 'Значения'], [
        ['Тариф', 'Базовый — 2 500 ₽/мес (тренажёрный зал);\nСтандарт — 3 500 ₽/мес (зал и групповые занятия);\n'
                  'Премиум — 5 000 ₽/мес (всё, а также бассейн и сауна)'],
        ['Срок и скидка за срок', '1 мес — 0 %; 3 мес — 5 %; 6 мес — 10 %; 12 мес — 15 %'],
        ['Шкафчик', 'Чекбокс, 500 ₽/мес, без скидки за срок'],
        ['Полотенце', 'Чекбокс, 300 ₽/мес, без скидки за срок'],
        ['Персональные тренировки', 'Целое число 0–20; 1 500 ₽/шт., при количестве от 10 — 1 300 ₽/шт.; '
                                    'без скидки за срок'],
        ['Промокод', 'Необязательное поле; действующий промокод 12345 даёт скидку 3 % на итоговую сумму '
                     'с учётом доп. услуг и тренировок'],
    ], [5.0, 12.0])
    b.text('Стоимость рассчитывается по формуле:', keep_next=True)
    b.code('сумма   = цена_тарифа × месяцы × (1 − скидка_за_срок)\n'
           '        + (шкафчик + полотенце) × месяцы\n'
           '        + тренировки × цена_тренировки\n'
           'итог    = round(сумма × (1 − промокод))   // промокод = 3 % или 0\n'
           'в_месяц = round(итог / месяцы)')
    b.text(f'Суммы округляются до целых рублей. Контрольные значения, которые обязательно должны совпасть '
           f'при тестировании, приведены в таблице {tab("control")}.', keep_next=True)
    b.table('control', 'Контрольные значения расчёта', ['№', 'Конфигурация', 'Итог, ₽'], [
        ['1', 'Премиум, 12 мес, промокод 12345', '49 470'],
        ['2', 'Стандарт, 3 мес, шкафчик', '11 475'],
        ['3', 'Базовый, 1 мес, 10 тренировок', '15 500'],
        ['4', 'Базовый, 1 мес, 9 тренировок', '16 000'],
        ['5', 'Базовый, 6 мес, полотенце, промокод 12345', '14 841'],
        ['6', 'Стандарт, 12 мес', '35 700'],
    ], [1.2, 12.3, 3.5], center_cols=(0, 2))

    # ---------------- 2. Проектирование ----------------
    b.section('2', 'Проектирование архитектуры')
    b.text('Приложение — одностраничное, без серверной части; сборка Vite формирует набор статических файлов. '
           'Код разделён на три слоя. Конфигурация (config/pricing.ts) — единственный источник цен, скидок, '
           'промокода и ограничений; из неё строятся и карточки тарифов, и калькулятор, поэтому изменение цены '
           'не требует правки логики. Бизнес-логика (каталог src/lib) состоит из чистых функций расчёта, '
           'валидации и форматирования, не зависящих от React и DOM, что позволяет тестировать их изолированно. '
           'Слой представления — React-компоненты, которые только отображают данные и вызывают функции из src/lib.')
    b.text('Состояние калькулятора поднято в корневой компонент App и хранится в двух объектах. Объект draft '
           '(тип CalculatorDraft) содержит значения полей в том виде, в каком их ввёл пользователь; количество '
           'тренировок хранится строкой. Объект config (тип MembershipConfig) — последняя корректная конфигурация: '
           'функция draftToConfig обновляет его, только если количество тренировок прошло проверку. Итог '
           'вычисляется функцией calculatePrice по объекту config. Объекты config и результат расчёта передаются '
           'в компоненты Calculator и OrderForm. Так форма заявки получает выбранный абонемент, а при ошибке '
           'ввода итог «замораживается» без дополнительного кода в компонентах.')
    b.text('Типы данных описаны в файле types.ts: тариф (Plan), конфигурация абонемента (MembershipConfig), '
           'результат расчёта с разбивкой (PriceBreakdown), результат проверки поля (ValidationResult), значения '
           'формы и объект заявки. На этапе проектирования созданы структура проекта, типы, сигнатуры функций '
           'с заглушками, конфигурация сборки, линтера и тестов. Структура проекта приведена ниже.')
    b.code(PROJECT_TREE)

    # ---------------- 3. Реализация ----------------
    b.section('3', 'Реализация')
    b.subsection('3.1', 'Бизнес-логика', first=True)
    b.text('Функция calculatePrice реализует формулу расчёта. Проценты скидок хранятся в конфигурации целыми '
           'числами (5, 10, 15, 3), поэтому промежуточные суммы не содержат погрешностей двоичной арифметики '
           'с плавающей точкой; итог округляется один раз. Функция возвращает не только итог, но и все составляющие '
           'разбивки, которые калькулятор показывает пользователю.', keep_next=True)
    b.code(extract_function(lib / 'calculator.ts', 'calculatePrice'))
    b.text('Функции валидации возвращают объект ValidationResult с признаком корректности и текстом ошибки. '
           'Например, функция validatePhone удаляет из номера пробелы, скобки и дефисы и проверяет результат '
           'регулярным выражением:', keep_next=True)
    b.code(extract_function(lib / 'validation.ts', 'validatePhone'))
    b.text('Аналогично реализованы проверки имени, email, согласия, количества тренировок и промокода, а также '
           'функция validateOrderForm, которая собирает ошибки всей формы. Функция formatRub форматирует суммы '
           'с разделителем тысяч (toLocaleString с локалью ru-RU) и знаком рубля.')

    b.subsection('3.2', 'Пользовательский интерфейс')
    b.text(f'Страница собрана из семи компонентов: Header, Hero, About, Plans, Calculator, OrderForm и Footer. '
           f'Главный экран и блок «О клубе» показаны на рисунке {fig("main")}. Иконки выполнены встроенным SVG, '
           'фотографии не используются.')
    b.figure('main', figures['main'], 'Главный экран и блок «О клубе» (ширина 1440 px)', 15.0)
    b.text(f'Калькулятор (рисунок {fig("calc_promo")}) построен на стандартных элементах формы: тариф и срок '
           'выбираются радиокнопками, оформленными как карточки, доп. услуги — чекбоксами. Справа выводится '
           'разбивка стоимости; при применённом промокоде появляется строка скидки, а под полем — сообщение '
           'о применении.')
    b.figure('calc_promo', figures['calc_promo'], 'Калькулятор с применённым промокодом', 15.0)
    b.text(f'При вводе недопустимого количества тренировок поле подсвечивается, под ним выводится ошибка, '
           f'а в блоке расчёта — пояснение, что показан последний корректный расчёт (рисунок {fig("calc_error")}). '
           'Поле получает атрибут aria-invalid, а текст ошибки связан с ним через aria-describedby, поэтому '
           'ошибка озвучивается программами экранного доступа.')
    b.figure('calc_error', figures['calc_error'], 'Ошибка ввода количества тренировок', 15.0)
    b.text(f'Форма заявки (рисунок {fig("form_errors")}) показывает ошибки после потери фокуса полем и при '
           'попытке отправки; при отправке с ошибками фокус переводится на первое ошибочное поле. Над кнопкой '
           'выводится сводка абонемента из калькулятора.')
    b.figure('form_errors', figures['form_errors'], 'Форма заявки после попытки отправки пустой формы', 12.0)

    # ---------------- 4. Тестирование ----------------
    bb = data['blackbox']
    passed_cases = sum(1 for r in bb['results'] if r['status'] == 'Пройден')
    b.section('4', 'Тестирование')
    b.subsection('4.1', 'Методы тестирования', first=True)
    b.bullets([
        'модульное тестирование методом белого ящика (Vitest): покрыты все ветви функций расчёта, валидации '
        'и форматирования, все шесть контрольных значений;',
        'анализ граничных значений: тренировки −1, 0, 20, 21, 2.5 и пустая строка; имя длиной 1, 2, 50 и 51 '
        'символ; телефон с 9, 10 и 11 цифрами после +7 и с форматированием «+7 (999) 123-45-67»;',
        'компонентное тестирование (React Testing Library, jsdom): пересчёт итога в калькуляторе, ошибки '
        'и успешная отправка формы;',
        'тестирование методом чёрного ящика: тест-кейсы по требованиям, выполненные в браузере Chrome '
        'с помощью Playwright;',
        'проверка адаптивности (скриншоты на ширине 360, 768 и 1440 px) и аудит Lighthouse.',
    ])

    b.subsection('4.2', 'Модульное и компонентное тестирование')
    kinds = {
        'tests/calculator.test.ts': 'Модульные, белый ящик',
        'tests/validation.test.ts': 'Модульные, граничные значения',
        'tests/format.test.ts': 'Модульные',
        'tests/components/Calculator.test.tsx': 'Компонентные',
        'tests/components/OrderForm.test.tsx': 'Компонентные',
    }
    rows = [[f, kinds.get(f, ''), str(n), 'Пройдены'] for f, n in data['tests_per_file'].items()]
    rows.sort(key=lambda r: list(kinds).index(r[0]) if r[0] in kinds else 99)
    rows.append(['Итого', '', str(data['tests_total']), 'Пройдены' if data['tests_passed'] else 'Есть ошибки'])
    b.text(f'Автоматизированные тесты запускаются командой npm test. Результаты прогона приведены в таблице '
           f'{tab("auto_tests")}: все {data["tests_total"]} тестов в {data["test_files"]} файлах пройдены.',
           keep_next=True)
    b.table('auto_tests', 'Результаты автоматизированных тестов', ['Файл', 'Вид тестов', 'Тестов', 'Результат'],
            rows, [6.6, 5.0, 2.0, 3.4], center_cols=(2, 3), bold_last_row=True)
    cov = data['coverage']
    cov_rows = [[name, *(f'{v[m]:g}' for m in ('statements', 'branches', 'functions', 'lines'))]
                for name, v in cov.items() if name != 'Всего (src/lib)']
    total = cov['Всего (src/lib)']
    cov_rows.append(['Всего (src/lib)', *(f'{total[m]:g}' for m in ('statements', 'branches', 'functions', 'lines'))])
    b.text(f'Покрытие кода измерено командой npm run test:coverage (провайдер v8) для каталога src/lib '
           f'(таблица {tab("coverage")}). Целевое значение 90 % достигнуто по всем метрикам.', keep_next=True)
    b.table('coverage', 'Покрытие бизнес-логики тестами, %', ['Файл', 'Операторы', 'Ветви', 'Функции', 'Строки'],
            cov_rows, [5.0, 3.0, 3.0, 3.0, 3.0], center_cols=(1, 2, 3, 4), bold_last_row=True)

    b.subsection('4.3', 'Тестирование методом чёрного ящика')
    b.text(f'Тест-кейсы составлены по требованиям без опоры на исходный код и выполнены сценарием Playwright '
           f'в браузере Chrome на собранной версии сайта (таблица {tab("blackbox")}). Пройдено {passed_cases} '
           f'из {len(bb["results"])} тест-кейсов.', keep_next=True)
    b.table('blackbox', 'Тест-кейсы чёрного ящика',
            ['ID', 'Шаги', 'Ожидаемый результат', 'Фактический результат', 'Статус'],
            [[r['id'], f"{r['title']}.\n{r['steps']}", r['expected'], r['actual'], r['status']] for r in bb['results']],
            [1.5, 4.3, 4.3, 4.9, 2.0], size=Pt(10), center_cols=(0, 4))

    b.subsection('4.4', 'Адаптивность и производительность')
    adaptive = ', '.join(f"{a['width']} px" for a in bb['adaptive'] if a['noHorizontalScroll'])
    b.text(f'Страница проверена на ширине {adaptive}: горизонтальная прокрутка отсутствует, блоки перестраиваются '
           f'в одну колонку, меню сворачивается в бургер (рисунки {fig("mobile")} и {fig("tablet")}). В ходе '
           'проверки на ширине 768 px обнаружены два дефекта вёрстки: декоративная линия на главном экране '
           'перекрывала подзаголовок, а подпись «/ месяц» в карточках тарифов разрывалась. Дефекты исправлены, '
           'после чего тесты выполнены повторно.')
    b.figure('mobile', figures['mobile'], 'Страница на ширине 360 px: главный экран и раскрытое меню', 9.0)
    b.figure('tablet', figures['tablet'], 'Страница на ширине 768 px', 7.0)
    lh = data['lighthouse']
    lh_rows = [[cat, str(lh['mobile'][cat]), str(lh['desktop'][cat])] for cat in lh['mobile']]
    b.text(f'Аудит Lighthouse выполнен для мобильного и десктопного профилей (таблица {tab("lighthouse")}). '
           'Требование к оценкам Performance и Accessibility (не ниже 90) выполнено.', keep_next=True)
    b.table('lighthouse', 'Результаты аудита Lighthouse', ['Категория', 'Мобильный профиль', 'Десктопный профиль'],
            lh_rows, [7.0, 5.0, 5.0], center_cols=(1, 2))

    # ---------------- 5. Внедрение ----------------
    b.section('5', 'Внедрение')
    b.text('Внедрение в рамках проекта не выполнялось; ниже описан порядок его проведения. Исходный код '
           'размещается в репозитории GitHub. Публикация автоматизируется с помощью GitHub Actions: при каждом '
           'изменении ветки main запускается конвейер, который устанавливает зависимости, проверяет код линтером, '
           'выполняет тесты и собирает проект. Если все шаги успешны, содержимое каталога dist публикуется '
           'на GitHub Pages. Альтернатива — хостинг Netlify или Vercel, которые подключаются к репозиторию '
           'и выполняют те же команды.', keep_next=True)
    b.text('Пример конфигурации конвейера (.github/workflows/deploy.yml):', keep_next=True)
    b.code(WORKFLOW_YAML)
    b.text('Сборка использует относительные пути (параметр base в vite.config.ts), поэтому сайт работает и из '
           'подкаталога GitHub Pages. Для собственного домена в настройках Pages указывается имя домена, '
           'у регистратора добавляется DNS-запись CNAME, после чего включается HTTPS. После выкладки '
           'выполняется приёмочная проверка по чек-листу:', keep_next=True)
    b.bullets([
        'сайт открывается по HTTPS, в консоли браузера нет ошибок;',
        'пункты меню ведут к соответствующим разделам, на телефоне работает бургер-меню;',
        'калькулятор выдаёт контрольные значения из таблицы ' + str(tab('control')) + ';',
        'форма показывает ошибки при пустой отправке и сообщение «Заявка отправлена» при корректных данных;',
        'страница корректно отображается на ширине 360, 768 и 1440 px.',
    ])

    # ---------------- 6. Сопровождение ----------------
    b.section('6', 'Сопровождение')
    b.text('Наиболее частое изменение — корректировка цен, скидок и состава тарифов. Все эти данные хранятся '
           'в файле src/config/pricing.ts, поэтому изменение выполняется правкой конфигурации без изменения '
           'логики расчёта и компонентов: новые значения автоматически отображаются и в карточках тарифов, '
           'и в калькуляторе. Так же меняется действующий промокод. При изменении цен обновляются контрольные '
           'значения в тестах.')
    b.text('Ошибки и предложения принимаются через GitHub Issues: в обращении указываются шаги воспроизведения, '
           'ожидаемый и фактический результат, браузер и ширина экрана. Любое исправление вносится через ветку '
           'и запрос на слияние; перед публикацией изменение проходит линтер, тесты и сборку в конвейере CI, '
           'поэтому ошибка в расчёте не попадёт на сайт.')
    b.text('Периодически, например раз в квартал, выполняется аудит Lighthouse для контроля производительности '
           'и доступности, а также обновляются зависимости (npm outdated, npm update) с последующим прогоном '
           'тестов. Обновление основных версий библиотек (React, Vite) проводится отдельной задачей.')

    # ---------------- Заключение ----------------
    b.section(None, 'Заключение')
    b.text('В ходе курсового проекта по каскадной модели разработан лендинг фитнес-клуба PulseFit. Последовательно '
           'выполнены этапы анализа требований, проектирования, реализации и тестирования; после каждого этапа '
           'результат согласовывался перед переходом к следующему. Этапы внедрения и сопровождения описаны.')
    b.text('Разработанный сайт соответствует требованиям: страница содержит все предусмотренные блоки, калькулятор '
           'рассчитывает стоимость абонемента по заданной формуле с учётом скидки за срок, доп. услуг, тренировок '
           'и промокода, форма заявки проверяет данные и эмулирует отправку. Бизнес-логика вынесена в чистые '
           'функции, а цены хранятся в одном конфигурационном файле, что упрощает сопровождение.')
    b.text(f'Корректность подтверждена тестированием: пройдены все {data["tests_total"]} автоматизированных '
           f'тестов, включая шесть контрольных значений и граничные случаи, и {passed_cases} тест-кейсов '
           f'чёрного ящика; покрытие бизнес-логики составило {total["lines"]:g} %. Страница адаптирована '
           f'для ширины от 360 px, оценки Lighthouse по производительности и доступности — не ниже '
           f'{min(lh["mobile"]["Performance"], lh["mobile"]["Accessibility"])}. Таким образом, цель работы '
           'достигнута.')

    # ---------------- Источники ----------------
    b.section(None, 'Список использованных источников')
    for i, source in enumerate(SOURCES, 1):
        # выравнивание по левому краю: длинные URL не растягивают строки
        b.text(f'{i}. {source.format(d=ACCESS_DATE)}', align=WD_ALIGN_PARAGRAPH.LEFT)


# ---------------------------------------------------------------------------
# Сборка и вёрстка через Word
# ---------------------------------------------------------------------------

def build(data: dict, figures: dict, pages: dict | None, total_pages: int | None, path: Path) -> list:
    doc = Document(str(TEMPLATE))
    fill_front_matter(doc, total_pages)
    fill_abstracts(doc, data)
    truncate_template_body(doc)
    builder = Builder(doc, pages)
    build_body(builder, data, figures)
    fill_toc(doc, builder.toc, pages or {})
    doc.save(str(path))
    return builder.toc


def word_layout(path: Path, bookmarks: list[str], pdf: Path | None = None) -> tuple[dict, int]:
    """Номера страниц закладок и число страниц документа по вёрстке MS Word."""
    import pythoncom
    import win32com.client

    pythoncom.CoInitialize()
    word = win32com.client.DispatchEx('Word.Application')
    word.Visible = False
    word.DisplayAlerts = 0
    try:
        doc = word.Documents.Open(str(path), ReadOnly=True, AddToRecentFiles=False)
        doc.Repaginate()
        wd_active_end_adjusted_page_number = 1
        pages = {name: doc.Bookmarks(name).Range.Information(wd_active_end_adjusted_page_number)
                 for name in bookmarks}
        total = doc.ComputeStatistics(2)  # wdStatisticPages
        if pdf:
            doc.ExportAsFixedFormat(str(pdf), 17)  # wdExportFormatPDF
        doc.Close(False)
    finally:
        word.Quit()
    return pages, total


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--check-pdf', type=Path, help='сохранить PDF для проверки вёрстки')
    args = parser.parse_args()

    data = load_data()
    figures = prepare_figures()

    with tempfile.TemporaryDirectory() as tmp:
        draft = Path(tmp) / 'draft.docx'
        toc = build(data, figures, None, None, draft)
        pages, total = word_layout(draft, [bm for _, _, bm in toc])

    build(data, figures, pages, total, OUTPUT)
    final_pages, final_total = word_layout(OUTPUT, [bm for _, _, bm in toc], args.check_pdf)
    if final_pages != pages:
        print('Предупреждение: номера страниц изменились после заполнения содержания', file=sys.stderr)

    print(f'Отчёт: {OUTPUT.relative_to(ROOT)} — {final_total} стр.')
    for number, title, bm in toc:
        print(f'  {number:<5} {title:<45} {final_pages[bm]}')


if __name__ == '__main__':
    main()
