import re
from datetime import timedelta

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework.exceptions import APIException

from utils.exceptions.types.bad_request import BadRequestException
from utils.exceptions.types.not_found import NotFoundException

from .models import (
    CatalogVersion,
    ComponentType,
    DecorationItem,
    ItemStatus,
    ItemType,
    PrivilegeType,
    ThemeItem,
    UserThemeCollect,
    UserThemeConfig,
    UserThemeEntitlement,
    UserThemeMix,
)

NATIVE_COMPONENTS = {ComponentType.NAV_BAR, ComponentType.TAB_BAR}
UNSAFE_STYLE = re.compile(r"[;{}]")
HTML_TAG = re.compile(r"<[^>]*>")
ALLOWED_TERMINALS = ("h5", "miniprogram")
DIALECT_TAGS = {
    "川渝",
    "江南吴语",
    "岭南粤韵",
    "闽台闽南",
    "北方晋陕",
    "湘楚潇湘",
    "云贵滇黔",
}
STYLE_TAGS_THEME = {
    "简约",
    "地域方言风",
    "复古",
    "赛博",
    "国风",
    "市井烟火",
    "节日限定",
    "二次元",
    "极简暗色",
}
STYLE_TAGS_DRESS = STYLE_TAGS_THEME | {
    "导航栏",
    "底部Tab",
    "交互按钮",
    "罐头卡片",
    "个人主页",
    "头像挂件",
    "评论区",
    "话题卡片",
    "弹窗输入框",
}


def clean_search_keyword(raw):
    text = HTML_TAG.sub("", str(raw or ""))
    return text.replace("<", "").replace(">", "").strip()[:64]


class ThemeAPIError(APIException):
    def __init__(self, status_code, message, reason):
        self.status_code = status_code
        self.data = {"reason": reason}
        super().__init__(detail=message)


def bump_catalog():
    return CatalogVersion.bump()


def validate_style_json(value):
    if value in (None, ""):
        return {}
    if not isinstance(value, dict):
        raise BadRequestException("样式JSON格式错误")
    cleaned = {}
    for key, raw in value.items():
        text = str(raw or "").strip()
        if not text:
            continue
        if UNSAFE_STYLE.search(text):
            raise BadRequestException("样式JSON包含非法字符")
        cleaned[str(key)] = text
    return cleaned


def clean_catalog_text(raw, limit):
    text = HTML_TAG.sub("", str(raw or ""))
    return text.replace("<", "").replace(">", "").strip()[:limit]


def normalize_tag_list(raw):
    if not isinstance(raw, list):
        return []
    seen = []
    for item in raw:
        text = clean_catalog_text(item, 32)
        if text and text not in seen:
            seen.append(text)
    return seen


def clean_catalog_item(item):
    item.name = clean_catalog_text(item.name, 80)
    if not item.name:
        raise ValidationError({"name": "请填写名称"})
    item.desc = clean_catalog_text(getattr(item, "desc", ""), 2000)
    item.get_condition = clean_catalog_text(getattr(item, "get_condition", ""), 200)
    try:
        item.style_json = validate_style_json(item.style_json)
    except BadRequestException as exc:
        raise ValidationError({"style_json": exc.msg}) from exc

    raw_terminals = item.support_terminal or []
    if not isinstance(raw_terminals, list):
        raise ValidationError({"support_terminal": "至少选择 H5 或小程序"})
    terminals = []
    for value in raw_terminals:
        if value in ALLOWED_TERMINALS and value not in terminals:
            terminals.append(value)
    if not terminals:
        raise ValidationError({"support_terminal": "至少选择 H5 或小程序"})
    component = getattr(item, "component_type", "")
    if component in NATIVE_COMPONENTS and "miniprogram" in terminals:
        raise ValidationError(
            {"support_terminal": "导航栏、底部 Tab 栏只支持 H5，不能勾选小程序。"}
        )
    item.support_terminal = terminals

    dialects = normalize_tag_list(item.dialect_tags)
    if any(tag not in DIALECT_TAGS for tag in dialects):
        raise ValidationError({"dialect_tags": "方言地域标签只能选自约定七项"})
    item.dialect_tags = dialects

    allowed_style = STYLE_TAGS_DRESS if component else STYLE_TAGS_THEME
    styles = normalize_tag_list(item.style_tags)
    if any(tag not in allowed_style for tag in styles):
        raise ValidationError({"style_tags": "风格标签不在字典内"})
    item.style_tags = styles

    if item.privilege_type == PrivilegeType.ACTIVITY:
        if not item.activity_start_at or not item.activity_end_at:
            raise ValidationError("活动限定必须填写开始和结束时间")
        if item.activity_end_at <= item.activity_start_at:
            raise ValidationError("活动结束时间必须晚于开始时间")
    else:
        item.activity_start_at = None
        item.activity_end_at = None
    return item


def clean_mix_name(name):
    text = HTML_TAG.sub("", str(name or ""))
    text = text.replace("<", "").replace(">", "").strip()
    if not text:
        raise BadRequestException("请输入搭配名称")
    return text[:20]


def resolve_item(item_type, item_id):
    if item_type == ItemType.THEME:
        item = ThemeItem.objects.filter(theme_id=item_id).first()
    elif item_type == ItemType.DECORATION:
        item = DecorationItem.objects.filter(decoration_id=item_id).first()
    else:
        raise BadRequestException("参数无效")
    if not item:
        raise NotFoundException("装扮不存在或已下架")
    return item


def entitlement_of(user):
    item, _ = UserThemeEntitlement.objects.get_or_create(user=user)
    return item


def item_public_id(item):
    return getattr(item, "theme_id", None) or getattr(item, "decoration_id", None)


def has_privilege(user, item):
    privilege = item.privilege_type
    if privilege == PrivilegeType.FREE:
        return True
    rights = entitlement_of(user)
    if privilege == PrivilegeType.MEMBER:
        return bool(rights.is_member)
    claimed = item_public_id(item) in (rights.activity_ids or [])
    if privilege == PrivilegeType.CREATOR:
        return bool(rights.creator_unlocked) and claimed
    if privilege == PrivilegeType.ACTIVITY:
        return claimed
    return False


def assert_applyable(user, item, platform):
    if item.status == ItemStatus.COMING:
        raise ThemeAPIError(409, "该主题暂未开放", "coming")
    if item.status == ItemStatus.DEPRECATED:
        raise ThemeAPIError(409, "装扮已绝版，无法启用", "deprecated")
    now = timezone.now()
    if item.activity_start_at and now < item.activity_start_at:
        raise ThemeAPIError(409, "该主题暂未开放", "coming")
    if item.activity_end_at and now > item.activity_end_at:
        raise ThemeAPIError(409, "装扮已绝版，无法启用", "deprecated")
    terminals = item.support_terminal or []
    if platform and platform not in terminals:
        raise ThemeAPIError(403, "当前环境暂不支持该装扮", "terminal")
    component = getattr(item, "component_type", "")
    if platform == "miniprogram" and component in NATIVE_COMPONENTS:
        raise ThemeAPIError(403, "当前环境暂不支持该装扮", "terminal")
    if not has_privilege(user, item):
        raise ThemeAPIError(403, "需要相应权限才能启用", "privilege")


def claim_item(user, item_type, item_id):
    cache_key = f"theme-claim:{user.id}:{item_type}:{item_id}"
    if rate_limited(cache_key, 1):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    if rate_count(f"theme-claim-user:{user.id}", 20, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    item = resolve_item(item_type, item_id)
    privilege = item.privilege_type
    if privilege in {PrivilegeType.FREE, PrivilegeType.MEMBER}:
        raise ThemeAPIError(403, "需要相应权限才能启用", "privilege")
    if item.status == ItemStatus.COMING:
        raise ThemeAPIError(409, "该主题暂未开放", "coming")
    if item.status == ItemStatus.DEPRECATED:
        raise ThemeAPIError(409, "装扮已绝版，无法启用", "deprecated")
    now = timezone.now()
    if item.activity_start_at and now < item.activity_start_at:
        raise ThemeAPIError(409, "该主题暂未开放", "coming")
    if item.activity_end_at and now > item.activity_end_at:
        raise ThemeAPIError(409, "装扮已绝版，无法启用", "deprecated")
    rights = entitlement_of(user)
    if privilege == PrivilegeType.CREATOR and not rights.creator_unlocked:
        raise ThemeAPIError(403, "需要相应权限才能启用", "privilege")
    claimed_id = item_public_id(item)
    ids = list(rights.activity_ids or [])
    if claimed_id and claimed_id not in ids:
        ids.append(claimed_id)
        rights.activity_ids = ids
        rights.save(update_fields=["activity_ids"])
    return rights


def rate_limited(key, seconds=1):
    if cache.get(key):
        return True
    cache.set(key, 1, timeout=seconds)
    return False


def rate_count(key, limit, window_seconds):
    count_key = f"{key}:count"
    current = cache.get(count_key)
    if current is None:
        cache.set(count_key, 1, timeout=window_seconds)
        return False
    if int(current) >= limit:
        return True
    try:
        cache.incr(count_key)
    except ValueError:
        cache.set(count_key, 1, timeout=window_seconds)
    return False


def sanitize_recent_use_list(raw):
    if not isinstance(raw, list):
        return []
    allowed = set(ItemType.values)
    seen = set()
    cleaned = []
    for row in raw:
        if not isinstance(row, dict):
            continue
        item_id = str(row.get("item_id") or "").strip()[:64]
        item_type = str(row.get("item_type") or "").strip()
        if not item_id or item_type not in allowed:
            continue
        key = (item_type, item_id)
        if key in seen:
            continue
        seen.add(key)
        try:
            use_time = int(row.get("use_time") or 0)
        except (TypeError, ValueError):
            use_time = 0
        cleaned.append(
            {
                "item_id": item_id,
                "item_type": item_type,
                "use_time": use_time,
            }
        )
        if len(cleaned) >= 8:
            break
    return cleaned


def apply_item(user, item_type, item_id, platform="h5"):
    cache_key = f"theme-apply:{user.id}:{item_type}:{item_id}"
    if rate_limited(cache_key, 1):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    item = resolve_item(item_type, item_id)
    assert_applyable(user, item, platform)
    config, _ = UserThemeConfig.objects.get_or_create(
        user=user, defaults={"global_theme_id": "default"}
    )
    if item_type == ItemType.THEME:
        config.global_theme_id = item.theme_id
    else:
        mapping = dict(config.decoration_map or {})
        mapping[item.component_type] = item.decoration_id
        config.decoration_map = mapping
    entry = {
        "item_id": item_id,
        "item_type": item_type,
        "use_time": int(timezone.now().timestamp() * 1000),
    }
    recent = [
        row
        for row in sanitize_recent_use_list(config.recent_use_list)
        if not (row.get("item_id") == item_id and row.get("item_type") == item_type)
    ]
    config.recent_use_list = [entry, *recent][:8]
    config.save()
    return config


def filter_config_payload(user, payload, platform="h5"):
    theme_id = str(payload.get("global_theme_id") or "default")
    overlay = bool(payload.get("is_cover_local_decoration", True))
    raw_map = payload.get("decoration_map") or {}
    if not isinstance(raw_map, dict):
        raise BadRequestException("参数无效")
    theme = resolve_item(ItemType.THEME, theme_id)
    existing = UserThemeConfig.objects.filter(user=user).first()
    try:
        assert_applyable(user, theme, platform)
    except ThemeAPIError as exc:
        reason = (exc.data or {}).get("reason")
        keep = existing and existing.global_theme_id == theme.theme_id
        if reason == "coming" or (
            reason in {"deprecated", "terminal", "privilege"} and not keep
        ):
            theme = resolve_item(ItemType.THEME, "default")
        elif reason not in {"deprecated", "terminal", "privilege"}:
            raise
    decoration_map = {}
    existing_map = (existing.decoration_map or {}) if existing else {}
    for component, item_id in raw_map.items():
        if component not in ComponentType.values:
            continue
        try:
            item = resolve_item(ItemType.DECORATION, str(item_id))
        except NotFoundException:
            continue
        if item.component_type != component:
            continue
        try:
            assert_applyable(user, item, platform)
        except ThemeAPIError as exc:
            reason = (exc.data or {}).get("reason")
            keep = existing_map.get(component) == item.decoration_id
            if reason in {"privilege", "terminal", "deprecated"} and keep:
                decoration_map[component] = item.decoration_id
                continue
            if reason in {"coming", "privilege", "terminal", "deprecated"}:
                continue
            raise
        decoration_map[component] = item.decoration_id
    return {
        "global_theme_id": theme.theme_id,
        "is_cover_local_decoration": overlay,
        "decoration_map": decoration_map,
        "recent_use_list": sanitize_recent_use_list(payload.get("recent_use_list")),
    }


def save_config(user, payload, platform="h5"):
    if rate_count(f"theme-config:{user.id}", 20, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    cleaned = filter_config_payload(user, payload, platform)
    config, _ = UserThemeConfig.objects.update_or_create(user=user, defaults=cleaned)
    return config


def catalog_item(item_type, item_id):
    if item_type == ItemType.THEME:
        return ThemeItem.objects.filter(theme_id=item_id).first()
    if item_type == ItemType.DECORATION:
        return DecorationItem.objects.filter(decoration_id=item_id).first()
    return None


def add_collect(user, item_type, item_id):
    if rate_count(f"theme-collect:{user.id}", 20, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    item = catalog_item(item_type, item_id)
    if item_type not in ItemType.values or item is None:
        raise NotFoundException("装扮不存在或已下架")
    if item.status == ItemStatus.COMING:
        raise ThemeAPIError(409, "待上线装扮暂不支持收藏", "coming")
    obj, created = UserThemeCollect.objects.get_or_create(
        user=user, item_type=item_type, item_id=item_id
    )
    if created:
        _bump_collect(item_type, item_id, 1)
    return obj


def remove_collect(user, item_type, item_id):
    if rate_count(f"theme-collect:{user.id}", 20, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    deleted, _ = UserThemeCollect.objects.filter(
        user=user, item_type=item_type, item_id=item_id
    ).delete()
    if deleted:
        _bump_collect(item_type, item_id, -1)
    return deleted


def _bump_collect(item_type, item_id, delta):
    if item_type == ItemType.THEME:
        item = ThemeItem.objects.filter(theme_id=item_id).first()
    else:
        item = DecorationItem.objects.filter(decoration_id=item_id).first()
    if not item:
        return
    item.collect_count = max(0, int(item.collect_count or 0) + delta)
    item.save(update_fields=["collect_count"])


def mix_signature(theme_id, decoration_map, overlay):
    items = tuple(sorted((str(key), str(value)) for key, value in (decoration_map or {}).items()))
    return (str(theme_id or "default"), items, bool(overlay))


def parse_mix_overlay(payload):
    if not isinstance(payload, dict) or "is_cover_local_decoration" not in payload:
        return True
    return bool(payload.get("is_cover_local_decoration"))


def mix_is_duplicate(user, theme_id, decoration_map, overlay):
    target = mix_signature(theme_id, decoration_map, overlay)
    for row in UserThemeMix.objects.filter(user=user).only(
        "global_theme_id",
        "decoration_map",
        "is_cover_local_decoration",
    ):
        if mix_signature(
            row.global_theme_id,
            row.decoration_map,
            row.is_cover_local_decoration,
        ) == target:
            return True
    return False


def create_mix(user, payload):
    if rate_count(f"theme-mix:{user.id}", 10, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    if UserThemeMix.objects.filter(user=user).count() >= 10:
        raise ThemeAPIError(
            409, "已达到最大保存数量，请删除旧搭配方案后再保存", "mix_cap"
        )
    name = clean_mix_name(payload.get("mix_name"))
    mix_id = str(payload.get("mix_id") or f"mix-{int(timezone.now().timestamp())}")
    theme_id = str(payload.get("global_theme_id") or "default")
    if not ThemeItem.objects.filter(theme_id=theme_id).exists():
        raise NotFoundException("装扮不存在或已下架")
    raw_map = payload.get("decoration_map") or {}
    if not isinstance(raw_map, dict):
        raw_map = {}
    decoration_map = {}
    for component, item_id in raw_map.items():
        if DecorationItem.objects.filter(decoration_id=str(item_id)).exists():
            decoration_map[str(component)] = str(item_id)
    ids = payload.get("decoration_ids")
    if not isinstance(ids, list):
        ids = list(decoration_map.values())
    overlay = parse_mix_overlay(payload)
    if mix_is_duplicate(user, theme_id, decoration_map, overlay):
        raise ThemeAPIError(409, "该搭配方案已保存，请勿重复添加", "mix_dup")
    return UserThemeMix.objects.create(
        mix_id=mix_id[:64],
        user=user,
        mix_name=name,
        global_theme_id=theme_id,
        decoration_map=decoration_map,
        decoration_ids=[str(item) for item in ids][:20],
        is_cover_local_decoration=overlay,
    )


def rename_mix(user, mix_id, name):
    mix = UserThemeMix.objects.filter(user=user, mix_id=mix_id).first()
    if not mix:
        raise NotFoundException("装扮不存在或已下架")
    mix.mix_name = clean_mix_name(name)
    mix.save(update_fields=["mix_name"])
    return mix


def delete_mix(user, mix_id):
    deleted, _ = UserThemeMix.objects.filter(user=user, mix_id=mix_id).delete()
    if not deleted:
        raise NotFoundException("装扮不存在或已下架")


def record_event(user, visitor_id, event_name, item_id=""):
    from .models import ThemeEventLog

    name = str(event_name or "")[:64]
    if not name:
        raise BadRequestException("参数无效")
    owner = getattr(user, "id", None) or visitor_id or "anon"
    if rate_count(f"theme-event:{owner}", 60, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    item = str(item_id or "")[:64]
    window = timezone.now() - timedelta(hours=1)
    counted = True
    if item:
        logs = ThemeEventLog.objects.filter(
            event_name=name,
            item_id=item,
            created_at__gte=window,
        )
        if user:
            counted = not logs.filter(user=user).exists()
        elif visitor_id:
            counted = not logs.filter(visitor_id=str(visitor_id)[:64]).exists()
        else:
            counted = False
        if not counted and name in {
            "theme_collect_click",
            "theme_share_click",
            "theme_apply_click",
        }:
            return None
    row = ThemeEventLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        visitor_id=str(visitor_id or "")[:64],
        event_name=name,
        item_id=item,
    )
    if counted and name == "theme_share_click" and item:
        _bump_share(item)
    return row


def _bump_share(item_id):
    theme = ThemeItem.objects.filter(theme_id=item_id).first()
    if theme:
        theme.share_count = int(theme.share_count or 0) + 1
        theme.save(update_fields=["share_count"])
        return
    deco = DecorationItem.objects.filter(decoration_id=item_id).first()
    if deco:
        deco.share_count = int(deco.share_count or 0) + 1
        deco.save(update_fields=["share_count"])


def item_is_referenced(item_type, item_id):
    if UserThemeCollect.objects.filter(item_type=item_type, item_id=item_id).exists():
        return True
    if item_type == ItemType.THEME:
        if UserThemeConfig.objects.filter(global_theme_id=item_id).exists():
            return True
        return UserThemeMix.objects.filter(global_theme_id=item_id).exists()
    for row in UserThemeConfig.objects.all().only("decoration_map"):
        if item_id in (row.decoration_map or {}).values():
            return True
    for row in UserThemeMix.objects.all().only("decoration_ids"):
        if item_id in (row.decoration_ids or []):
            return True
    return False


def sync_activity_windows(now=None):
    now = now or timezone.now()
    changed = 0
    for model in (ThemeItem, DecorationItem):
        for item in model.objects.filter(privilege_type=PrivilegeType.ACTIVITY):
            start = item.activity_start_at
            end = item.activity_end_at
            if not start or not end:
                continue
            if now < start:
                target = ItemStatus.COMING
            elif now > end:
                target = ItemStatus.DEPRECATED
            else:
                target = ItemStatus.AVAILABLE
            if item.status == target:
                continue
            item.status = target
            item.save(update_fields=["status"])
            changed += 1
    if changed:
        CatalogVersion.bump()
    return changed
