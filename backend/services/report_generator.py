import io
import re
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib import colors

class ReportGenerator:
    """
    Takes research insights and compiles them into standalone Markdown or PDF documents.
    """
    def generate_markdown(self, workspace_name: str, insights: list) -> str:
        md_content = f"# Literature Review Report: {workspace_name}\n"
        md_content += f"*Generated Autonomously by ResearchHub AI*\n\n"
        md_content += "---\n\n"
        
        for insight in insights:
            insight_type = str(insight.get('type', 'Insight')).replace('_', ' ').title()
            date = insight.get('created_at', '').split('T')[0]
            content = insight.get('content', '')
            
            md_content += f"## {insight_type} ({date})\n"
            md_content += f"{content}\n\n"
            md_content += "---\n\n"
            
        return md_content

    def generate_pdf(self, workspace_name: str, insights: list) -> io.BytesIO:
        pdf_stream = io.BytesIO()
        doc = SimpleDocTemplate(
            pdf_stream,
            pagesize=letter,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=50
        )
        
        styles = getSampleStyleSheet()
        
        # Custom styles to closely match our UI theme
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#4c1d95'),
            spaceAfter=12
        )
        
        subtitle_style = ParagraphStyle(
            'CustomSubTitle',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.gray,
            spaceAfter=20
        )
        
        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#6d28d9'),
            spaceBefore=15,
            spaceAfter=8
        )
        
        body_style = ParagraphStyle(
            'CustomBody',
            parent=styles['Normal'],
            fontSize=11,
            leading=16, # Line height
            spaceAfter=12
        )

        flowables = []
        
        # Add Title
        flowables.append(Paragraph(f"Literature Review Report: {workspace_name}", title_style))
        flowables.append(Paragraph("Generated Autonomously by ResearchHub AI", subtitle_style))
        flowables.append(Spacer(1, 0.2 * 72))
        
        for insight in insights:
            insight_type = str(insight.get('type', 'Insight')).replace('_', ' ').title()
            date = insight.get('created_at', '').split('T')[0]
            content = insight.get('content', '')
            
            # Add Insight Header
            flowables.append(Paragraph(f"{insight_type} ({date})", header_style))
            
            # Process body text safely for ReportLab's XML paragraph parser.
            def safe_para(text: str) -> str:
                # 1. Escape XML special chars FIRST (before adding any tags)
                text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                # 2. Now convert **bold** markdown to <b>bold</b> ReportLab tags using regex
                text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
                # 3. Convert *italic* markdown to <i>italic</i>
                text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
                return text

            paragraphs = content.split('\n')
            for p in paragraphs:
                if p.strip():
                    try:
                        flowables.append(Paragraph(safe_para(p.strip()), body_style))
                    except Exception:
                        # Fallback: strip all formatting and render as plain text
                        plain = re.sub(r'\*+', '', p.strip())
                        flowables.append(Paragraph(plain, body_style))
            
            flowables.append(Spacer(1, 0.1 * 72))

        doc.build(flowables)
        pdf_stream.seek(0)
        return pdf_stream

report_generator = ReportGenerator()
