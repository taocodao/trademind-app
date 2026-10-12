import json
from pathlib import Path
import re

def clean_json(text):
    return re.sub(r'//.*?\n|/\*.*?\*/', '\n', text)

langs = {
    'en': {
        "title": "The $100 Anti-Fraud Referral",
        "desc": "Give your friends a 14-day free trial. If they stay, you get paid.",
        "btn": "Activate Referral Code",
        "stage1_title": "Stage 1: Activation",
        "stage1_desc": "Get <strong className=\"text-tm-green\">$50 credit</strong> when they pay for their first month after the 14-day trial.",
        "stage2_title": "Stage 2: Retention",
        "stage2_desc": "Get another <strong className=\"text-tm-green\">$50 credit</strong> when they complete their second paid month.",
        "annual_title": "Annual Upsell Bonus",
        "annual_desc": "Get a <strong className=\"text-tm-green\">$150 credit instantly</strong> if they bypass monthly and sign up for an Annual Plan."
    },
    'es': {
        "title": "El Referido Anti-Fraude de $100",
        "desc": "Dale a tus amigos una prueba gratuita de 14 días. Si se quedan, te pagamos al instante.",
        "btn": "Activar Código de Referido",
        "stage1_title": "Etapa 1: Activación",
        "stage1_desc": "Consigue <strong className=\"text-tm-green\">$50 de crédito</strong> cuando paguen su primer mes después de la prueba de 14 días.",
        "stage2_title": "Etapa 2: Retención",
        "stage2_desc": "Consigue otros <strong className=\"text-tm-green\">$50 de crédito</strong> cuando completen su segundo mes pagado.",
        "annual_title": "Bono de Venta Anual",
        "annual_desc": "Recibe un <strong className=\"text-tm-green\">crédito de $150 al instante</strong> si omiten la opción mensual y se suscriben a un Plan Anual."
    },
    'zh': {
        "title": "$100 防欺诈推荐红包",
        "desc": "给你的朋友免费试用 14 天的机会。如果他们留下，你就能获得实打实的返现。",
        "btn": "激活推荐代码",
        "stage1_title": "阶段 1：激活",
        "stage1_desc": "当他们在14天试用期后支付首月费用时，获得 <strong className=\"text-tm-green\">$50 额度</strong>。",
        "stage2_title": "阶段 2：留存",
        "stage2_desc": "当他们完成第二个月的付费时，再获得 <strong className=\"text-tm-green\">$50 额度</strong>。",
        "annual_title": "年度追加奖金",
        "annual_desc": "如果他们跳过月付直接订阅年度计划，立刻获得 <strong className=\"text-tm-green\">$150 额度</strong>。"
    }
}

base_dir = Path("public/locales")
for lang_code, ref_data in langs.items():
    file_path = base_dir / lang_code / "translation.json"
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            blob = clean_json(f.read())
            data = json.loads(blob)
        data['referral'] = ref_data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Updated {file_path}")
