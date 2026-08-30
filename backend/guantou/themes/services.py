import re
from datetime import timedelta

from django.core.cache import cache
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


def has_privilege(user, item):
    privilege = item.privilege_type
    if privilege == PrivilegeType.FREE:
        return True
    rights = entitlement_of(user)
    if privilege == PrivilegeType.MEMBER:
        return bool(rights.is_member)
    if privilege == PrivilegeType.CREATOR:
        return bool(rights.creator_unlocked)
    if privilege == PrivilegeType.ACTIVITY:
        item_id = getattr(item, "theme_id", None) or getattr(
            item, "decoration_id", None
        )
        return item_id in (rights.activity_ids or [])
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
    recent = list(config.recent_use_list or [])
    entry = {
        "item_id": item_id,
        "item_type": item_type,
        "use_time": int(timezone.now().timestamp() * 1000),
    }
    recent = [row for row in recent if row.get("item_id") != item_id][:7]
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
    assert_applyable(user, theme, platform)
    decoration_map = {}
    if not overlay:
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
                if exc.data.get("reason") in {
                    "coming",
                    "deprecated",
                    "terminal",
                    "privilege",
                }:
                    continue
                raise
            decoration_map[component] = item.decoration_id
    recent = payload.get("recent_use_list") or []
    if not isinstance(recent, list):
        recent = []
    return {
        "global_theme_id": theme.theme_id,
        "is_cover_local_decoration": overlay,
        "decoration_map": decoration_map,
        "recent_use_list": recent[:8],
    }


def save_config(user, payload, platform="h5"):
    cleaned = filter_config_payload(user, payload, platform)
    config, _ = UserThemeConfig.objects.update_or_create(user=user, defaults=cleaned)
    return config


def item_exists(item_type, item_id):
    if item_type == ItemType.THEME:
        return ThemeItem.objects.filter(theme_id=item_id).exists()
    if item_type == ItemType.DECORATION:
        return DecorationItem.objects.filter(decoration_id=item_id).exists()
    return False


def add_collect(user, item_type, item_id):
    if rate_count(f"theme-collect:{user.id}", 20, 60):
        raise ThemeAPIError(429, "操作过于频繁，请稍后再试", "rate")
    if item_type not in ItemType.values or not item_exists(item_type, item_id):
        raise NotFoundException("装扮不存在或已下架")
    obj, created = UserThemeCollect.objects.get_or_create(
        user=user, item_type=item_type, item_id=item_id
    )
    if created:
        _bump_collect(item_type, item_id, 1)
    return obj


def remove_collect(user, item_type, item_id):
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
    return UserThemeMix.objects.create(
        mix_id=mix_id[:64],
        user=user,
        mix_name=name,
        global_theme_id=theme_id,
        decoration_map=decoration_map,
        decoration_ids=[str(item) for item in ids][:20],
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
    if user and item:
        exists = ThemeEventLog.objects.filter(
            user=user,
            event_name=name,
            item_id=item,
            created_at__gte=window,
        ).exists()
        if exists and name in {
            "theme_collect_click",
            "theme_share_click",
            "theme_apply_click",
        }:
            return None
    return ThemeEventLog.objects.create(
        user=user if getattr(user, "is_authenticated", False) else None,
        visitor_id=str(visitor_id or "")[:64],
        event_name=name,
        item_id=item,
    )


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
