from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
import os
import sys

# 确保标准输出使用UTF-8编码
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")


# 注册中文字体
def register_chinese_fonts():
    """注册中文字体，支持中文显示"""
    font_paths = {
        "SimHei": [
            "C:/Windows/Fonts/simhei.ttf",
            "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc",
            "/System/Library/Fonts/STHeiti Light.ttc",
        ],
        "MicrosoftYaHei": [
            "C:/Windows/Fonts/msyh.ttc",
            "C:/Windows/Fonts/msyh.ttf",
        ],
    }

    registered_fonts = {}

    for font_name, paths in font_paths.items():
        for path in paths:
            if os.path.exists(path):
                try:
                    if path.endswith(".ttc"):
                        pdfmetrics.registerFont(TTFont(font_name, path, subfontIndex=0))
                    else:
                        pdfmetrics.registerFont(TTFont(font_name, path))
                    registered_fonts[font_name] = path
                    break
                except Exception as e:
                    continue

    return registered_fonts


# 注册字体
registered_fonts = register_chinese_fonts()

# 优先使用黑体，因为它的中文支持更好
FONT_NAME = "SimHei" if "SimHei" in registered_fonts else "MicrosoftYaHei"


def ensure_utf8(text):
    """确保文本是UTF-8编码的字符串"""
    if text is None:
        return ""
    if isinstance(text, bytes):
        return text.decode("utf-8", errors="replace")
    return str(text)


def format_date(date_str):
    """格式化日期为 YYYY.MM 格式"""
    if not date_str:
        return ""
    try:
        date_str = ensure_utf8(date_str)
        if "T" in date_str:
            date_str = date_str.split("T")[0]
        parts = date_str.split("-")
        if len(parts) >= 2:
            return f"{parts[0]}.{parts[1]}"
        return date_str
    except:
        return str(date_str)


def format_date_range(start_date, end_date):
    """格式化日期范围"""
    start = format_date(start_date)
    end = format_date(end_date) if end_date else "至今"
    if not start:
        return ""
    return f"{start} - {end}"


def draw_text(c, x, y, text, font_name=None, font_size=12, color=black):
    """绘制UTF-8编码的文本"""
    if font_name is None:
        font_name = FONT_NAME
    text = ensure_utf8(text)
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    c.drawString(x, y, text)


def draw_text_centered(c, x, y, text, width, font_name=None, font_size=12, color=black):
    """居中绘制文本"""
    if font_name is None:
        font_name = FONT_NAME
    text = ensure_utf8(text)
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    text_width = c.stringWidth(text, font_name, font_size)
    centered_x = x + (width - text_width) / 2
    c.drawString(centered_x, y, text)


def draw_text_right(c, x, y, text, font_name=None, font_size=12, color=black):
    """右对齐绘制文本"""
    if font_name is None:
        font_name = FONT_NAME
    text = ensure_utf8(text)
    c.setFont(font_name, font_size)
    c.setFillColor(color)
    text_width = c.stringWidth(text, font_name, font_size)
    c.drawString(x - text_width, y, text)


def wrap_text(c, text, font_name, font_size, max_width):
    """文本换行 - 支持中文和英文"""
    text = ensure_utf8(text)
    lines = []
    paragraphs = text.split("\n")

    for para in paragraphs:
        if not para.strip():
            lines.append("")
            continue

        current_line = ""
        i = 0

        while i < len(para):
            char = para[i]

            # 处理英文单词（连续的非中文字符）
            if char.isascii() and char.isalnum():
                # 收集整个英文单词
                word = ""
                while (
                    i < len(para)
                    and para[i].isascii()
                    and (para[i].isalnum() or para[i] in "-_.")
                ):
                    word += para[i]
                    i += 1

                # 测试添加这个单词
                test_line = (
                    current_line
                    + (" " if current_line and not current_line.endswith(" ") else "")
                    + word
                )
                if c.stringWidth(test_line, font_name, font_size) <= max_width:
                    current_line = test_line
                else:
                    if current_line:
                        lines.append(current_line.rstrip())
                    # 如果单词本身超过最大宽度，按字符拆分
                    if c.stringWidth(word, font_name, font_size) > max_width:
                        word_line = ""
                        for w_char in word:
                            if (
                                c.stringWidth(word_line + w_char, font_name, font_size)
                                <= max_width
                            ):
                                word_line += w_char
                            else:
                                if word_line:
                                    lines.append(word_line)
                                word_line = w_char
                        current_line = word_line
                    else:
                        current_line = word
            else:
                # 处理中文字符或其他非ASCII字符
                test_line = current_line + char
                if c.stringWidth(test_line, font_name, font_size) <= max_width:
                    current_line = test_line
                    i += 1
                else:
                    if current_line:
                        lines.append(current_line.rstrip())
                    current_line = char
                    i += 1

        if current_line:
            lines.append(current_line.rstrip())

    return lines


def generate_pdf(resume_data):
    """
    生成简历PDF

    Args:
        resume_data: 完整的简历数据字典

    Returns:
        BytesIO: PDF文件的字节流
    """
    buffer = BytesIO()

    # A4尺寸
    page_width, page_height = A4

    # 创建PDF
    c = canvas.Canvas(buffer, pagesize=A4)

    # 颜色定义
    primary_color = HexColor("#3B82F6")
    dark_color = HexColor("#1E293B")
    secondary_color = HexColor("#64748B")
    light_color = HexColor("#94A3B8")

    # 边距
    margin_left = 20 * mm
    margin_right = 20 * mm
    margin_top = 0
    margin_bottom = 20 * mm

    content_width = page_width - margin_left - margin_right

    # ========== 头部区域 ==========
    header_height = 60 * mm
    header_y = page_height - header_height

    # 绘制头部背景
    c.setFillColor(dark_color)
    c.rect(0, header_y, page_width, header_height, fill=1, stroke=0)

    # 姓名
    name = ensure_utf8(resume_data.get("name", "您的姓名"))
    draw_text_centered(c, 0, header_y + 40 * mm, name, page_width, FONT_NAME, 24, white)

    # 职位
    title = ensure_utf8(resume_data.get("title", "职位名称"))
    draw_text_centered(
        c, 0, header_y + 30 * mm, title, page_width, FONT_NAME, 12, HexColor("#94A3B8")
    )

    # 联系信息
    contact_parts = []
    if resume_data.get("email"):
        contact_parts.append(ensure_utf8(resume_data["email"]))
    if resume_data.get("phone"):
        contact_parts.append(ensure_utf8(resume_data["phone"]))
    if resume_data.get("age"):
        contact_parts.append(f"{resume_data['age']}岁")
    if resume_data.get("work_years"):
        contact_parts.append(f"{resume_data['work_years']}年经验")

    if contact_parts:
        contact_text = " | ".join(contact_parts)
        draw_text_centered(
            c,
            0,
            header_y + 20 * mm,
            contact_text,
            page_width,
            FONT_NAME,
            9,
            HexColor("#CBD5E1"),
        )

    # ========== 主体区域 ==========
    sidebar_width = 50 * mm
    main_content_x = margin_left + sidebar_width + 10 * mm
    main_content_width = content_width - sidebar_width - 10 * mm

    current_y_left = header_y - 15 * mm  # 左侧当前Y坐标
    current_y_right = header_y - 15 * mm  # 右侧当前Y坐标

    # ========== 左侧边栏 ==========
    # 技能标签
    skills = resume_data.get("skills", [])
    if skills:
        # 标题，横线撑满左侧栏宽度（与网页 border-bottom 一致）
        draw_text(c, margin_left, current_y_left, "技能", FONT_NAME, 12, dark_color)
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(
            margin_left,
            current_y_left - 3 * mm,
            margin_left + sidebar_width - 2 * mm,
            current_y_left - 3 * mm,
        )
        current_y_left -= 10 * mm

        # 技能列表 - 横向流式排列，超出宽度换行
        skill_names = [
            ensure_utf8(s.get("skill_name", "")) for s in skills if s.get("skill_name")
        ]
        tag_padding_x = 3 * mm  # 标签左右内边距
        tag_font_size = 9  # 标签字体大小
        tag_height = 6 * mm  # 标签高度
        tag_gap_x = 2 * mm  # 横向间距
        tag_gap_y = 2.5 * mm  # 纵向间距
        max_tag_width = sidebar_width - 2 * mm  # 左栏可用宽度

        row_x = margin_left  # 当前行 X 坐标
        for skill in skill_names:
            skill_text_width = c.stringWidth(skill, FONT_NAME, tag_font_size)
            tag_w = skill_text_width + tag_padding_x * 2

            # 超出行宽则换行
            if row_x + tag_w > margin_left + max_tag_width and row_x > margin_left:
                row_x = margin_left
                current_y_left -= tag_height + tag_gap_y

            # 绘制标签背景
            c.setFillColor(primary_color)
            c.roundRect(
                row_x,
                current_y_left - tag_height * 0.2,
                tag_w,
                tag_height,
                1.5 * mm,
                fill=1,
                stroke=0,
            )
            # 文字垂直居中：PDF坐标系Y轴向上，基线需从标签底部向上偏移
            # tag_font_size * 0.28 为字体实际渲染高度的近似值（点到mm转换后）
            tag_bottom = current_y_left - tag_height * 0.2
            text_y = tag_bottom + (tag_height - tag_font_size * 0.28 * mm) / 2
            draw_text(
                c,
                row_x + tag_padding_x,
                text_y,
                skill,
                FONT_NAME,
                tag_font_size,
                white,
            )
            row_x += tag_w + tag_gap_x

        # 最后一行结束后下移
        current_y_left -= tag_height + tag_gap_y + 2 * mm

    # 教育背景
    education = resume_data.get("education", [])
    if education:
        current_y_left -= 5 * mm
        # 标题
        # 横线撑满左侧栏宽度
        draw_text(c, margin_left, current_y_left, "教育", FONT_NAME, 12, dark_color)
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(
            margin_left,
            current_y_left - 3 * mm,
            margin_left + sidebar_width - 2 * mm,
            current_y_left - 3 * mm,
        )
        current_y_left -= 10 * mm

        for edu in education:
            school = ensure_utf8(edu.get("school", ""))
            degree = ensure_utf8(edu.get("degree", ""))
            major = ensure_utf8(edu.get("major", ""))
            date_range = format_date_range(edu.get("start_date"), edu.get("end_date"))

            if school:
                draw_text(
                    c, margin_left, current_y_left, school, FONT_NAME, 10, dark_color
                )
                current_y_left -= 5 * mm

            edu_detail = (
                f"{degree} · {major}" if degree and major else (degree or major)
            )
            if edu_detail:
                draw_text(
                    c,
                    margin_left,
                    current_y_left,
                    edu_detail,
                    FONT_NAME,
                    9,
                    secondary_color,
                )
                current_y_left -= 4 * mm

            if date_range:
                draw_text(
                    c,
                    margin_left,
                    current_y_left,
                    date_range,
                    FONT_NAME,
                    8,
                    light_color,
                )
                current_y_left -= 4 * mm

            current_y_left -= 3 * mm

    # ========== 右侧主内容 ==========
    # 个人简介
    summary = ensure_utf8(resume_data.get("summary", ""))
    if summary:
        # 横线撑满右侧主内容宽度
        draw_text(c, main_content_x, current_y_right, "简介", FONT_NAME, 12, dark_color)
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(
            main_content_x,
            current_y_right - 3 * mm,
            main_content_x + main_content_width,
            current_y_right - 3 * mm,
        )
        current_y_right -= 10 * mm

        # 换行绘制简介
        lines = wrap_text(c, summary, FONT_NAME, 10, main_content_width)
        for line in lines:
            if current_y_right < margin_bottom + 10 * mm:
                break
            draw_text(
                c,
                main_content_x,
                current_y_right,
                line,
                FONT_NAME,
                10,
                HexColor("#475569"),
            )
            current_y_right -= 5 * mm

        current_y_right -= 5 * mm

    # 工作经历
    work_experiences = resume_data.get("work_experiences", [])
    if work_experiences:
        # 横线撑满右侧主内容宽度
        draw_text(
            c, main_content_x, current_y_right, "工作经历", FONT_NAME, 12, dark_color
        )
        c.setStrokeColor(primary_color)
        c.setLineWidth(2)
        c.line(
            main_content_x,
            current_y_right - 3 * mm,
            main_content_x + main_content_width,
            current_y_right - 3 * mm,
        )
        current_y_right -= 10 * mm

        for exp in work_experiences:
            company = ensure_utf8(exp.get("company", ""))
            position = ensure_utf8(exp.get("position", ""))
            date_range = format_date_range(exp.get("start_date"), exp.get("end_date"))
            description = ensure_utf8(exp.get("description", ""))

            # work-header：公司名（13pt 粗体 #1E293B）+ 日期右对齐（11pt #94A3B8）
            # 对应网页 .work-company font-size:13px font-weight:600
            if company:
                draw_text(
                    c,
                    main_content_x,
                    current_y_right,
                    company,
                    FONT_NAME,
                    13,
                    dark_color,
                )

            # 日期右对齐，对应 .work-date font-size:11px color:#94A3B8
            if date_range:
                draw_text_right(
                    c,
                    main_content_x + main_content_width,
                    current_y_right,
                    date_range,
                    FONT_NAME,
                    11,
                    light_color,
                )

            # work-header margin-bottom: 4px ≈ 1.4mm
            current_y_right -= 6 * mm

            # 职位：对应 .work-position font-size:12px color:#3B82F6 margin-bottom:8px≈2.8mm
            if position:
                draw_text(
                    c,
                    main_content_x,
                    current_y_right,
                    position,
                    FONT_NAME,
                    12,
                    primary_color,
                )
                current_y_right -= 5 * mm

            # 工作描述：对应 .work-description font-size:12px line-height:1.7 color:#475569
            # line-height 1.7 * 12px = 20.4px ≈ 7.2mm
            if description:
                lines = wrap_text(c, description, FONT_NAME, 12, main_content_width)
                for line in lines:
                    if current_y_right < margin_bottom + 10 * mm:
                        break
                    draw_text(
                        c,
                        main_content_x,
                        current_y_right,
                        line,
                        FONT_NAME,
                        12,
                        HexColor("#475569"),
                    )
                    current_y_right -= 7.2 * mm

            # work-item margin-bottom: 16px ≈ 5.6mm
            current_y_right -= 5.6 * mm

    # 生成PDF
    c.save()
    buffer.seek(0)

    return buffer
