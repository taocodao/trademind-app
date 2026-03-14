import json
from pathlib import Path

langs = {
    'en': {
        "title": "Give $15, Get $15",
        "desc": "Know someone tired of staring at charts? Invite them to TurboBounce. They get $15 off their first month, and you receive a $15 account credit when they sign up.",
        "btn": "Activate Referral Code",
        "stage1_title": "Stage 1: Activation",
        "stage1_desc": "Get <green>$50 credit</green> when they pay for their first month after the 14-day trial.",
        "stage2_title": "Stage 2: Retention",
        "stage2_desc": "Get another <green>$50 credit</green> when they complete their second paid month.",
        "annual_title": "Annual Upsell Bonus",
        "annual_desc": "Get a <green>$150 credit instantly</green> if they bypass monthly and sign up for an Annual Plan."
    },
    'es': {
        "title": "Da $15, Recibe $15",
        "desc": "¿Conoces a alguien cansado de mirar gráficos? Invítalo a TurboBounce. Consiguen $15 de descuento y tú recibes $15 de crédito en tu cuenta.",
        "btn": "Activar Código de Referido",
        "stage1_title": "Etapa 1: Activación",
        "stage1_desc": "Consigue <green>$50 de crédito</green> cuando paguen su primer mes después de la prueba de 14 días.",
        "stage2_title": "Etapa 2: Retención",
        "stage2_desc": "Consigue otros <green>$50 de crédito</green> cuando completen su segundo mes pagado.",
        "annual_title": "Bono de Venta Anual",
        "annual_desc": "Recibe un <green>crédito de $150 al instante</green> si omiten la opción mensual y se suscriben a un Plan Anual."
    },
    'zh': {
        "title": "赠送 $15，获得 $15",
        "desc": "认识其他厌倦了盯盘的人吗？邀请他们加入 TurboBounce。他们首月可享 $15 优惠，注册成功后您也将获得 $15 账户余额奖励。",
        "btn": "激活推荐代码",
        "stage1_title": "阶段 1：激活",
        "stage1_desc": "当他们在14天试用期后支付首月费用时，获得 <green>$50 额度</green>。",
        "stage2_title": "阶段 2：留存",
        "stage2_desc": "当他们完成第二个月的付费时，再获得 <green>$50 额度</green>。",
        "annual_title": "年度追加奖金",
        "annual_desc": "如果他们跳过月付直接订阅年度计划，立刻获得 <green>$150 额度</green>。"
    }
}

base_dir = Path("public/locales")
for lang_code, ref_data in langs.items():
    file_path = base_dir / lang_code / "translation.json"
    if file_path.exists():
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data['referral'] = ref_data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print(f"Updated {file_path}")
