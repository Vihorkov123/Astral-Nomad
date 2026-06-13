# -*- coding: utf-8 -*-
"""Презентация «Астральный скиталец» v2 — собственная структура и стиль:
тёмный графит, бирюза/коралл, крупная нумерация, слайды команды и аналитики."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

BG     = RGBColor(0x0E, 0x0F, 0x13)  # графит
CARD   = RGBColor(0x1A, 0x1C, 0x24)
TEAL   = RGBColor(0x4F, 0xE3, 0xC1)  # бирюза
CORAL  = RGBColor(0xFF, 0x6B, 0x5E)  # коралл
TEXT   = RGBColor(0xEC, 0xEE, 0xF4)
MUTED  = RGBColor(0x8B, 0x90, 0xA0)
FONT   = 'Verdana'

prs = Presentation()
prs.slide_width = Inches(13.333); prs.slide_height = Inches(7.5)
BLANK = prs.slide_layouts[6]
N = [0]

def slide(footer=True):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid(); s.background.fill.fore_color.rgb = BG
    N[0] += 1
    if footer:
        txt(s, 0.55, 7.02, 8, 0.4, [[(f'{N[0]:02d} — АСТРАЛЬНЫЙ СКИТАЛЕЦ', 10, MUTED, False)]])
        ln = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.55), Inches(6.95), Inches(12.23), Pt(1))
        ln.fill.solid(); ln.fill.fore_color.rgb = RGBColor(0x2A, 0x2D, 0x3A)
        ln.line.fill.background(); ln.shadow.inherit = False
    return s

def rect(s, x, y, w, h, fill=None, round_=False):
    shp = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if round_ else MSO_SHAPE.RECTANGLE,
                             Inches(x), Inches(y), Inches(w), Inches(h))
    if round_: shp.adjustments[0] = 0.08
    if fill: shp.fill.solid(); shp.fill.fore_color.rgb = fill
    else: shp.fill.background()
    shp.line.fill.background(); shp.shadow.inherit = False
    return shp

def txt(s, x, y, w, h, paras, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=4):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap = True; tf.vertical_anchor = anchor
    for i, para in enumerate(paras):
        pp = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        pp.alignment = align; pp.space_after = Pt(spacing)
        for (t, size, color, bold) in para:
            r = pp.add_run(); r.text = t
            r.font.size = Pt(size); r.font.color.rgb = color
            r.font.bold = bold; r.font.name = FONT
    return tb

def header(s, kicker, title_text):
    txt(s, 0.55, 0.35, 12.2, 0.4, [[(kicker.upper(), 12, TEAL, True)]])
    txt(s, 0.55, 0.72, 12.2, 0.9, [[(title_text, 30, TEXT, True)]])

def num_card(s, x, y, w, h, num, head, body, accent=TEAL, body_size=12):
    rect(s, x, y, w, h, CARD, round_=True)
    txt(s, x + 0.22, y + 0.12, 1.2, 0.7, [[(num, 26, accent, True)]])
    txt(s, x + 0.22, y + 0.72, w - 0.44, 0.6, [[(head, 14.5, TEXT, True)]])
    txt(s, x + 0.22, y + 1.22, w - 0.44, h - 1.4,
        [[(b, body_size, MUTED, False)] for b in body])

# ===== 1. Титул =====
s = slide(footer=False)
rect(s, 0, 0, 0.18, 7.5, TEAL)
txt(s, 0.9, 1.15, 11.5, 0.5, [[('ПРОЕКТНЫЙ ПРАКТИКУМ 1A · ТРЕК «РАЗРАБОТКА КОММЕРЧЕСКОЙ ИГРЫ ПОД ЯНДЕКС ИГРЫ»', 12, MUTED, False)]])
txt(s, 0.9, 1.9, 11.5, 2.2, [
    [('АСТРАЛЬНЫЙ', 52, TEXT, True)],
    [('СКИТАЛЕЦ', 52, TEAL, True)],
])
txt(s, 0.9, 4.35, 11.5, 0.9, [
    [('Браузерный rogue-lite, в котором риск — это выбор игрока,', 17, TEXT, False)],
    [('а не бросок невидимых костей.', 17, TEXT, False)],
])
txt(s, 0.9, 5.7, 11.5, 1.0, [
    [('Команда: ____________________', 15, TEXT, False)],
    [('Куратор: ____________________ · Екатеринбург · 2026', 12, MUTED, False)],
])

# ===== 2. Команда =====
s = slide(); header(s, 'кто делал', 'Наша команда')
roles = [
    ('Тимлид', '________________\nРИ-XXXXXX', 'план · темп · приёмка'),
    ('Аналитик', '________________\nРИ-XXXXXX', '5W · Wordstat · конкуренты'),
    ('Дизайнер', '________________\nРИ-XXXXXX', 'баланс · сюжет · UX'),
    ('Фронтенд', '________________\nРИ-XXXXXX', 'Canvas · игровой цикл'),
    ('Бэкенд', '________________\nРИ-XXXXXX', 'SDK · сейвы · тесты'),
]
for i, (role, name, tools) in enumerate(roles):
    x = 0.55 + i * 2.52
    rect(s, x, 1.9, 2.32, 3.9, CARD, round_=True)
    rect(s, x, 1.9, 2.32, 0.12, TEAL if i % 2 == 0 else CORAL, round_=False)
    txt(s, x + 0.18, 2.25, 1.96, 0.5, [[(role, 15, TEXT, True)]])
    txt(s, x + 0.18, 2.85, 1.96, 1.2, [[(name, 12, MUTED, False)]])
    txt(s, x + 0.18, 4.6, 1.96, 1.0, [[(tools, 11, TEAL, False)]])

# ===== 3. Проблематика =====
s = slide(); header(s, 'зачем', 'Проблематика: браузеру не хватает решений')
num_card(s, 0.55, 1.85, 6.0, 4.7, '01', 'Игрок устал кликать', [
    'Каталог браузерных игр — кликеры и аркады, где игрок не принимает решений.',
    'Поколение Vampire Survivors и Brotato ждёт rogue-lite опыт, но Steam-игры требуют установки и сотен мегабайт.',
    '«Хочу рискнуть и пощекотать нервы за десять минут в браузере — а не кликать бесконечную цифру».',
])
num_card(s, 6.8, 1.85, 6.0, 4.7, '02', 'Ниша пуста', [
    'На Яндекс Играх нет лёгкого rogue-lite, где риск виден и выбирается игроком.',
    'Существующие «выживалки» не дают цены ошибки: терять нечего — играть незачем.',
    'Свободная ниша + растущая платформа = окно возможности для нашего проекта.',
], accent=CORAL)

# ===== 4. Аналитика платформы =====
s = slide(); header(s, 'аналитика платформы', 'Яндекс Игры — растущий рынок')
stats = [
    ('45 млн', 'активных игроков в месяц (2024)', TEAL),
    ('+45 %', 'рост аудитории за год, в 2024 — почти ×2', CORAL),
    ('50 мин', 'в день играет средний пользователь', TEAL),
]
for i, (big, capt, c) in enumerate(stats):
    x = 0.55 + i * 4.18
    rect(s, x, 1.9, 3.95, 2.5, CARD, round_=True)
    txt(s, x, 2.15, 3.95, 1.1, [[(big, 40, c, True)]], PP_ALIGN.CENTER)
    txt(s, x + 0.3, 3.3, 3.35, 1.0, [[(capt, 12, MUTED, False)]], PP_ALIGN.CENTER)
rect(s, 0.55, 4.75, 12.2, 1.8, CARD, round_=True)
txt(s, 0.85, 4.95, 11.6, 1.5, [
    [('Ядро аудитории — до 24 лет: динамичные сессионные игры с прогрессией.', 13, TEXT, False)],
    [('Тренд — мидкор: глубже кликера, быстрее Steam. Наш формат попадает в обе волны:', 13, TEXT, False)],
    [('rogue-lite глубина при загрузке за секунду (вес сборки ≈0,1 МБ).', 13, TEAL, True)],
], spacing=2)

# ===== 5. ЦА =====
s = slide(); header(s, 'для кого', 'Целевая аудитория и портрет игрока')
num_card(s, 0.55, 1.85, 6.0, 4.7, 'B2C', 'Игрок коротких сессий', [
    '12–35 лет, ядро 16–27: студенты и молодые специалисты за ПК.',
    'Опыт: Vampire Survivors, Brotato, Moonlighter — любит «ещё один заход».',
    'Хочет: решения с ценой, прогресс без обнуления, сессию 5–15 минут.',
    'Боится: потерять всё при смерти и потратить время впустую.',
])
num_card(s, 6.8, 1.85, 6.0, 4.7, 'EDU', 'Начинающий разработчик', [
    'Студенты IT-направлений и инди-разработчики.',
    'Ищут рабочий пример полного цикла: SDK, автопауза, облачные сейвы, лимит веса, модерация.',
    'Получают: открытый репозиторий-референс с кодом, концептом и автотестами.',
], accent=CORAL)

# ===== 6. Конкуренты =====
s = slide(); header(s, 'с кем сравнивали', 'Конкурентный анализ')
headers = ['Критерий', 'Vampire Survivors', 'Brotato', 'Moonlighter', 'НАШ ПРОЕКТ']
rows = [
    ['Видимый риск до решения', 'Нет', 'Нет', 'Частично', 'Да — на каждом контейнере'],
    ['Браузер без установки', 'Нет', 'Нет', 'Нет', 'Да (Яндекс Игры)'],
    ['Длина сессии', '15–30 мин', '5–20 мин', '30–60 мин', '5–15 мин'],
    ['Вес клиента', '≈600 МБ', '≈300 МБ', '≈1 ГБ', '≈0,1 МБ'],
    ['Сюжет с выбором концовки', 'Нет', 'Нет', 'Линейный', '2 концовки'],
]
tbl = s.shapes.add_table(len(rows) + 1, 5, Inches(0.55), Inches(1.85), Inches(12.2), Inches(4.6)).table
tbl.columns[0].width = Inches(3.5)
for j in range(1, 4): tbl.columns[j].width = Inches(2.3)
tbl.columns[4].width = Inches(2.8)
def cell(c, t, bold=False, color=TEXT, size=12, fill=CARD):
    c.fill.solid(); c.fill.fore_color.rgb = fill
    c.margin_left = Inches(0.1); c.margin_top = Inches(0.05)
    tf = c.text_frame; tf.word_wrap = True
    r = tf.paragraphs[0].add_run(); r.text = t
    r.font.bold = bold; r.font.size = Pt(size); r.font.color.rgb = color; r.font.name = FONT
for j, hd in enumerate(headers):
    cell(tbl.cell(0, j), hd, bold=True, color=(TEAL if j == 4 else TEXT), fill=RGBColor(0x23, 0x26, 0x33))
for i, row in enumerate(rows):
    for j, v in enumerate(row):
        cell(tbl.cell(i + 1, j), v, bold=(j == 4), color=(TEAL if j == 4 else MUTED))

# ===== 7. Цель и задачи =====
s = slide(); header(s, 'куда шли', 'Цель и задачи')
rect(s, 0.55, 1.8, 5.6, 4.85, CARD, round_=True)
txt(s, 0.85, 2.05, 5.0, 0.5, [[('SMART-ЦЕЛЬ', 13, CORAL, True)]])
txt(s, 0.85, 2.55, 5.0, 3.9, [
    [('Разработать и подготовить к публикации на Яндекс Играх rogue-lite «Астральный скиталец»', 15, TEXT, True)],
    [('с механикой осознанного риска, сессией 5–15 минут и полным соответствием регламентам платформы — за 4 недели.', 13, MUTED, False)],
], spacing=8)
tasks = [
    'Анализ ЦА, платформы и конкурентов → УТП',
    'Концепт, сценарий, баланс 5 секторов',
    'MVP на Vanilla JS + Canvas (12 модулей)',
    'Интеграция SDK: автопауза + облачные сейвы',
    '3 итерации плейтестов и баланса, 42 автотеста',
    'Сборка по регламентам → модерация',
]
for i, t in enumerate(tasks):
    y = 1.8 + i * 0.82
    txt(s, 6.5, y, 0.7, 0.6, [[(f'{i+1:02d}', 20, TEAL, True)]])
    txt(s, 7.3, y + 0.07, 5.4, 0.7, [[(t, 13.5, TEXT, False)]])

# ===== 8. Ядро геймплея =====
s = slide(); header(s, 'как играется', 'Петля осознанного риска')
loop = [
    ('РАЗВЕДКА', 'сектор, патрули,\nконтейнеры на карте'),
    ('РЕШЕНИЕ', 'шанс охраны виден:\nвскрыть или отойти?'),
    ('БОЙ', 'телеграф атак,\nрывок, криты'),
    ('НАГРАДА', 'лут ×1,5 за риск,\nсинтезатор за лом'),
    ('ПРОГРЕСС', 'новый сектор,\nпамять и финал'),
]
for i, (h, b) in enumerate(loop):
    x = 0.55 + i * 2.56
    rect(s, x, 2.2, 2.3, 2.6, CARD, round_=True)
    txt(s, x, 2.45, 2.3, 0.5, [[(h, 14, TEAL if i % 2 == 0 else CORAL, True)]], PP_ALIGN.CENTER)
    txt(s, x + 0.15, 3.05, 2.0, 1.6, [[(b, 11.5, MUTED, False)]], PP_ALIGN.CENTER)
    if i < 4:
        ar = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(x + 2.3), Inches(3.25), Inches(0.26), Inches(0.4))
        ar.fill.solid(); ar.fill.fore_color.rgb = TEXT; ar.line.fill.background(); ar.shadow.inherit = False
txt(s, 0.55, 5.2, 12.2, 1.4, [
    [('Смерть — не конец: rogue-lite сохраняет сектора и оружие, забирая еду и часть лома.', 14, TEXT, False)],
    [('Босс — по желанию: вскрой ВСЕ контейнеры 4-го сектора и встреть Стража Ядра.', 14, TEXT, False)],
], PP_ALIGN.CENTER, spacing=4)

# ===== 9. УТП =====
s = slide(); header(s, 'чем отличаемся', 'Уникальность проекта')
usp = [
    ('Риск как выбор', 'шансы охраны видны до вскрытия — никаких «невидимых костей»'),
    ('Честный бой', 'все атаки телеграфированы: любой урон можно избежать'),
    ('Смерть без злости', 'rogue-lite: прогресс секторов и оружие не сгорают'),
    ('Сюжет с выбором', 'память возвращается по секторам, 2 концовки + ∞ режим'),
    ('0,1 МБ', 'графика — Canvas-код, звук — WebAudio-синтез: ноль ассетов'),
    ('Платформенно готов', 'автопауза, облачные сейвы, 12+, адаптив 21:9/16:9/4:3'),
]
for i, (h, b) in enumerate(usp):
    x = 0.55 + (i % 3) * 4.18; y = 1.85 + (i // 3) * 2.45
    rect(s, x, y, 3.95, 2.25, CARD, round_=True)
    txt(s, x + 0.22, y + 0.18, 3.5, 0.5, [[(h, 15, TEAL if i % 2 == 0 else CORAL, True)]])
    txt(s, x + 0.22, y + 0.75, 3.5, 1.4, [[(b, 12, MUTED, False)]])

# ===== 10. Стек =====
s = slide(); header(s, 'на чём сделано', 'Технологический стек')
badges = ['Vanilla JS', 'Canvas API', 'Web Audio', 'Yandex SDK', 'Git + GitHub', 'Node-тесты']
for i, b in enumerate(badges):
    x = 0.55 + (i % 3) * 4.18; y = 1.9 + (i // 3) * 1.05
    rect(s, x, y, 3.95, 0.85, CARD, round_=True)
    txt(s, x, y + 0.16, 3.95, 0.55, [[(b, 16, TEXT, True)]], PP_ALIGN.CENTER)
rect(s, 0.55, 4.25, 12.2, 2.35, CARD, round_=True)
txt(s, 0.85, 4.45, 11.6, 2.0, [
    [('Почему без движка?', 14, CORAL, True)],
    [('Unity-сборка весит десятки мегабайт и прячет платформенные детали. Нативный JS дал сборку ≈0,1 МБ (в 1000 раз меньше лимита), загрузку за секунду и полный контроль над паузой, сейвами и рендером.', 13, MUTED, False)],
    [('Качество держат 42 автотеста логики — прогон перед каждым коммитом.', 13, TEAL, False)],
], spacing=6)

# ===== 11. Демонстрация =====
s = slide(); header(s, 'смотрим', 'Демонстрация игры')
for i, capt in enumerate(['Игровой экран: сектор и HUD', 'Выбор: шанс охраны 58 %', 'Босс: красная зона удара', 'Синтезатор и карта секторов']):
    x = 0.55 + (i % 2) * 6.25; y = 1.85 + (i // 2) * 2.45
    rect(s, x, y, 6.0, 2.25, CARD, round_=True)
    txt(s, x, y + 0.8, 6.0, 0.6, [[('[ скриншот ]', 14, MUTED, False)]], PP_ALIGN.CENTER)
    txt(s, x + 0.2, y + 1.75, 5.6, 0.45, [[(capt, 11.5, TEAL, False)]])

# ===== 12. Результат =====
s = slide(); header(s, 'что получили', 'Результат')
done = [
    'MVP «Астральный скиталец»: 5 секторов, босс, 2 концовки, бесконечный режим',
    'Полная интеграция Yandex SDK: автопауза, облачные сейвы + localStorage',
    'Сборка ≈0,1 МБ, автономная, проверена в Chrome / Firefox / Safari / Edge',
    '3 итерации плейтестов: от «слишком легко» до «есть драйв»',
    'Аналитика ЦА и платформы, отчёт, открытый репозиторий на GitHub',
]
wip = ['Загрузка в консоль разработчика и прохождение модерации', 'Мобильное управление и лидерборды — после публикации']
for i, t in enumerate(done):
    y = 1.8 + i * 0.62
    txt(s, 0.7, y, 0.5, 0.5, [[('✓', 18, TEAL, True)]])
    txt(s, 1.3, y + 0.04, 11.4, 0.55, [[(t, 13.5, TEXT, False)]])
for i, t in enumerate(wip):
    y = 1.8 + (len(done) + i) * 0.62
    txt(s, 0.7, y, 0.5, 0.5, [[('→', 18, CORAL, True)]])
    txt(s, 1.3, y + 0.04, 11.4, 0.55, [[(t + '  (в процессе)', 13.5, MUTED, False)]])

# ===== 13. Спасибо =====
s = slide(footer=False)
rect(s, 0, 7.32, 13.333, 0.18, TEAL)
txt(s, 0.9, 2.3, 11.5, 1.6, [
    [('СПАСИБО ЗА ВНИМАНИЕ', 40, TEXT, True)],
    [('Готовы ответить на вопросы — и показать игру вживую', 16, MUTED, False)],
])
txt(s, 0.9, 4.6, 11.5, 2.0, [
    [('Тимлид — ____________________ РИ-XXXXXX', 13, TEXT, False)],
    [('Аналитик — ____________________ РИ-XXXXXX', 13, TEXT, False)],
    [('Дизайнер — ____________________ РИ-XXXXXX', 13, TEXT, False)],
    [('Фронтенд — ____________________ РИ-XXXXXX', 13, TEXT, False)],
    [('Бэкенд — ____________________ РИ-XXXXXX', 13, TEXT, False)],
], spacing=2)
txt(s, 0.9, 6.55, 11.5, 0.5, [[('«Астральный скиталец» · Яндекс Игры · 2026', 12, TEAL, False)]])

prs.save('/tmp/Презентация_Астральный_скиталец.pptx')
print('pres v2 ok,', len(list(prs.slides)), 'слайдов')
