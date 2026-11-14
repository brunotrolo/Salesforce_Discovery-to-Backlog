#!/usr/bin/env python3
"""backlog.json -> Word (Visão de Produto) e PowerPoint (Apresentação da Rodada), para a PO compartilhar com as áreas de negócio.

Linguagem de negócio: sem hash, sem JSON, sem jargão técnico. Âncoras de fonte aparecem só no apêndice de rastreabilidade.
Requer: pip install python-docx python-pptx
Uso: export-office.py <backlog.json> [--out DIR] [--only docx|pptx] [--prototype prototype.json] [--screens DIR_COM_PNGS]
                       [--docx-template modelo.docx] [--pptx-template modelo.pptx] [--prototype-file caminho.html]
"""
import argparse, json, os, sys

try:
    from docx import Document
    from docx.shared import Pt, Cm, RGBColor
    from pptx import Presentation
    from pptx.util import Inches, Pt as PPt
    from pptx.dml.color import RGBColor as PRGB
except ImportError:
    sys.exit("Faltam bibliotecas: execute  pip install python-docx python-pptx  (ou peça ao Claude para usar as skills docx/pptx do host).")

PRIO = {"MUST": "Essencial", "SHOULD": "Importante", "COULD": "Desejável", "WONT": "Fora desta entrega", None: "A definir"}
STATUS = {"rascunho": "Rascunho", "revisado": "Revisado", "aprovado": "Aprovado pela PO", "publicado": "Publicado no Jira"}
BLUE = (0x01, 0x76, 0xD3)


def stories(bl):
    for e in bl["epics"]:
        for s in e["stories"]:
            yield e, s


def open_business(bl):
    out = []
    for e in bl["epics"]:
        out += [(e["title"], q) for q in e.get("open_questions", []) if q["kind"] == "negocio" and not q.get("resolved")]
        for s in e["stories"]:
            out += [(s["title"], q) for q in s.get("open_questions", []) if q["kind"] == "negocio" and not q.get("resolved")]
    return out


def shots(dirpath, p):
    """PNGs do protótipo, na ordem das telas (nome = id da tela)."""
    if not dirpath or not p:
        return []
    steps = p.get("screens") or p.get("walkthrough") or []
    return [(s["title"], os.path.join(dirpath, s["id"] + ".png")) for s in steps if os.path.exists(os.path.join(dirpath, s["id"] + ".png"))]


# ---------------------------------------------------------------- Word
def build_docx(bl, out, proto, shot_list, template, proto_file):
    d = Document(template) if template else Document()
    st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(11)
    d.add_heading(bl["project"]["name"], 0)
    d.add_paragraph("Visão de Produto — resultado das rodadas de discovery").runs[0].italic = True
    r = bl["rounds"][-1]
    d.add_paragraph(f"Última rodada: {r['id']} ({r['date']}) · Atualizado em {bl['project'].get('updated', r['date'])}")
    n_ep = len(bl["epics"]); n_st = sum(1 for _ in stories(bl)); n_q = len(open_business(bl))
    d.add_heading("Resumo", 1)
    d.add_paragraph(f"{n_ep} épico(s), {n_st} história(s) de usuário e {n_q} decisão(ões) de negócio em aberto.")
    t = d.add_table(rows=1, cols=4); t.style = "Light Grid Accent 1"
    for c, h in zip(t.rows[0].cells, ["Épico", "Objetivo", "Histórias", "Situação"]):
        c.text = h
    for e in bl["epics"]:
        row = t.add_row().cells
        row[0].text = e["title"]; row[1].text = e["objective"]; row[2].text = str(len(e["stories"])); row[3].text = STATUS.get(e["status"], e["status"])
    if open_business(bl):
        d.add_heading("Decisões necessárias do negócio", 1)
        d.add_paragraph("Estas perguntas ainda não têm resposta nas fontes e bloqueiam ou afetam a entrega:")
        for where, q in open_business(bl):
            d.add_paragraph(f"{q['text']}  (em: {where})", style="List Number")
    for e in bl["epics"]:
        d.add_heading(f"Épico: {e['title']}", 1)
        d.add_paragraph(e["objective"])
        if e.get("products"):
            d.add_paragraph("Produtos: " + ", ".join(e["products"]))
        for s in e["stories"]:
            d.add_heading(s["title"], 2)
            p = d.add_paragraph(); p.add_run("Como ").bold = False; p.add_run(s["persona"]).bold = True
            p.add_run(f", quero {s['want']}, para {s['so_that']}.")
            d.add_paragraph(f"Prioridade: {PRIO.get(s.get('priority'))} · Situação: {STATUS.get(s['status'], s['status'])}" + (" · Pronta para desenho" if s.get("ready_for_design") else ""))
            if s.get("acceptance"):
                d.add_paragraph().add_run("Critérios de aceite").bold = True
                for a in s["acceptance"]:
                    d.add_paragraph(f"Dado {a['given']}, quando {a['when']}, então {a['then']}.", style="List Bullet")
            if s.get("business_rules"):
                d.add_paragraph().add_run("Regras de negócio").bold = True
                for b in s["business_rules"]:
                    d.add_paragraph(b["text"], style="List Bullet")
            if s.get("compliance_flags"):
                d.add_paragraph("Atenção: " + ", ".join(s["compliance_flags"]) + ".")
    if bl.get("conflicts"):
        d.add_heading("Pontos em conflito entre rodadas", 1)
        for c in bl["conflicts"]:
            d.add_paragraph(f"{c['description']} — Decisão: {c.get('resolution') or 'pendente'}", style="List Bullet")
    if shot_list or proto_file:
        d.add_heading("Protótipo de referência", 1)
        if proto:
            d.add_paragraph(proto.get("purpose", ""))
        if proto_file:
            d.add_paragraph(f"Protótipo clicável (abra no navegador): {os.path.basename(proto_file)}")
        for title, path in shot_list:
            d.add_paragraph(title).runs[0].bold = True
            d.add_picture(path, width=Cm(16))
    d.add_heading("Apêndice — rastreabilidade", 1)
    d.add_paragraph("Cada requisito vem de um trecho das fontes (S = fonte, L = linha). Detalhes técnicos ficam nos arquivos em Markdown do time técnico.")
    tt = d.add_table(rows=1, cols=3); tt.style = "Light Grid Accent 1"
    for c, h in zip(tt.rows[0].cells, ["História", "Título", "Trechos das fontes"]):
        c.text = h
    for e, s in stories(bl):
        row = tt.add_row().cells
        row[0].text = s["id"]; row[1].text = s["title"]; row[2].text = ", ".join(s.get("evidence", []))
    d.save(out)


# ---------------------------------------------------------------- PowerPoint
def build_pptx(bl, out, proto, shot_list, template):
    prs = Presentation(template) if template else Presentation()
    if not template:
        prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
    blank = prs.slide_layouts[6] if len(prs.slide_layouts) > 6 else prs.slide_layouts[-1]

    def title_box(sl, text, size=28):
        tb = sl.shapes.add_textbox(Inches(0.6), Inches(0.4), prs.slide_width - Inches(1.2), Inches(1))
        tf = tb.text_frame; tf.word_wrap = True
        p = tf.paragraphs[0]; p.text = text; p.font.size = PPt(size); p.font.bold = True; p.font.color.rgb = PRGB(*BLUE)

    def bullets(sl, items, top=1.5, size=18, left=0.6, width=None):
        tb = sl.shapes.add_textbox(Inches(left), Inches(top), width or (prs.slide_width - Inches(1.2)), prs.slide_height - Inches(top + 0.5))
        tf = tb.text_frame; tf.word_wrap = True
        for i, it in enumerate(items):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = "• " + it; p.font.size = PPt(size); p.space_after = PPt(6)

    r = bl["rounds"][-1]
    sl = prs.slides.add_slide(blank)
    tb = sl.shapes.add_textbox(Inches(0.8), Inches(2.4), prs.slide_width - Inches(1.6), Inches(2.5)); tf = tb.text_frame; tf.word_wrap = True
    tf.paragraphs[0].text = bl["project"]["name"]; tf.paragraphs[0].font.size = PPt(40); tf.paragraphs[0].font.bold = True; tf.paragraphs[0].font.color.rgb = PRGB(*BLUE)
    p = tf.add_paragraph(); p.text = f"Resultado da rodada de discovery {r['id']} — {r['date']}"; p.font.size = PPt(20)

    n_st = sum(1 for _ in stories(bl))
    sl = prs.slides.add_slide(blank); title_box(sl, "Resumo da rodada")
    bullets(sl, [f"{len(bl['epics'])} épico(s) e {n_st} história(s) de usuário", f"{len(open_business(bl))} decisão(ões) de negócio em aberto"] + [f"{e['title']} — {len(e['stories'])} história(s)" for e in bl["epics"]])

    for e in bl["epics"]:
        sl = prs.slides.add_slide(blank); title_box(sl, e["title"], 26)
        bullets(sl, [e["objective"]], top=1.3, size=16)
        bullets(sl, [f"{s['title']}  ({PRIO.get(s.get('priority'))})" for s in e["stories"]], top=2.4, size=16)
        for s in e["stories"]:
            sl = prs.slides.add_slide(blank); title_box(sl, s["title"], 24)
            items = [f"Como {s['persona']}, quero {s['want']}, para {s['so_that']}."]
            items += [f"Aceite: dado {a['given']}, quando {a['when']}, então {a['then']}." for a in s.get("acceptance", [])[:4]]
            items += [f"Regra: {b['text']}" for b in s.get("business_rules", [])[:3]]
            if s.get("compliance_flags"):
                items.append("Atenção: " + ", ".join(s["compliance_flags"]))
            bullets(sl, items, size=15)

    if shot_list:
        for title, path in shot_list:
            sl = prs.slides.add_slide(blank); title_box(sl, f"Protótipo — {title}", 24)
            sl.shapes.add_picture(path, Inches(0.8), Inches(1.4), height=prs.slide_height - Inches(1.9))
        if proto and proto.get("walkthrough"):
            sl = prs.slides.add_slide(blank); title_box(sl, "Como validar o protótipo")
            bullets(sl, [w["text"] for w in proto["walkthrough"]])

    q = open_business(bl)
    sl = prs.slides.add_slide(blank); title_box(sl, "Decisões necessárias do negócio")
    bullets(sl, [f"{qq['text']}  ({where})" for where, qq in q[:9]] or ["Nenhuma decisão de negócio em aberto."], size=16)
    sl = prs.slides.add_slide(blank); title_box(sl, "Próximos passos")
    bullets(sl, ["Validar histórias e critérios de aceite com as áreas de negócio", "Responder as decisões em aberto", "Aprovar o backlog para publicação no Jira e desenho da jornada"])
    prs.save(out)


def main():
    a = argparse.ArgumentParser()
    a.add_argument("backlog"); a.add_argument("--out"); a.add_argument("--only", choices=["docx", "pptx"])
    a.add_argument("--prototype"); a.add_argument("--screens"); a.add_argument("--prototype-file")
    a.add_argument("--docx-template"); a.add_argument("--pptx-template")
    x = a.parse_args()
    bl = json.load(open(x.backlog, encoding="utf-8"))
    proto = json.load(open(x.prototype, encoding="utf-8")) if x.prototype else None
    out = x.out or os.path.join(os.path.dirname(os.path.abspath(x.backlog)), "entregas")
    os.makedirs(out, exist_ok=True)
    sh = shots(x.screens, proto)
    if x.only in (None, "docx"):
        f = os.path.join(out, "Visao-de-Produto.docx"); build_docx(bl, f, proto, sh, x.docx_template, x.prototype_file); print("gerado", f)
    if x.only in (None, "pptx"):
        f = os.path.join(out, "Apresentacao-Rodada.pptx"); build_pptx(bl, f, proto, sh, x.pptx_template); print("gerado", f)


if __name__ == "__main__":
    main()
