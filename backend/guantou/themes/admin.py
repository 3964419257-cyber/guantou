from django.contrib import admin

from .models import (
    CatalogVersion,
    DecorationItem,
    ItemStatus,
    ItemType,
    ThemeItem,
    UserThemeCollect,
    UserThemeConfig,
    UserThemeEntitlement,
    UserThemeMix,
)
from .services import clean_catalog_item, item_is_referenced


class CatalogAdminMixin:
    def save_model(self, request, obj, form, change):
        clean_catalog_item(obj)
        super().save_model(request, obj, form, change)
        CatalogVersion.bump()

    def has_delete_permission(self, request, obj=None):
        if obj is None:
            return request.user.is_superuser
        item_type = (
            ItemType.THEME if isinstance(obj, ThemeItem) else ItemType.DECORATION
        )
        item_id = getattr(obj, "theme_id", None) or getattr(obj, "decoration_id", None)
        if item_is_referenced(item_type, item_id):
            return False
        if obj.status != ItemStatus.COMING:
            return False
        return request.user.is_superuser


@admin.register(ThemeItem)
class ThemeItemAdmin(CatalogAdminMixin, admin.ModelAdmin):
    list_display = (
        "theme_id",
        "name",
        "privilege_type",
        "status",
        "support_terminal",
        "collect_count",
        "like_count",
        "share_count",
    )
    list_filter = ("privilege_type", "status")
    search_fields = ("theme_id", "name")
    readonly_fields = ("like_count", "collect_count", "share_count", "create_time")
    fieldsets = (
        (
            "基础信息",
            {
                "fields": (
                    "theme_id",
                    "name",
                    "desc",
                    "cover_img",
                    "detail_img",
                    "poster_img",
                )
            },
        ),
        (
            "样式与标签",
            {"fields": ("style_json", "style_tags", "dialect_tags")},
        ),
        (
            "权限与终端",
            {
                "fields": (
                    "privilege_type",
                    "get_condition",
                    "status",
                    "support_terminal",
                    "activity_start_at",
                    "activity_end_at",
                )
            },
        ),
        (
            "热度",
            {"fields": ("like_count", "collect_count", "share_count", "create_time")},
        ),
    )


@admin.register(DecorationItem)
class DecorationItemAdmin(CatalogAdminMixin, admin.ModelAdmin):
    list_display = (
        "decoration_id",
        "name",
        "component_type",
        "privilege_type",
        "status",
        "support_terminal",
        "collect_count",
        "like_count",
        "share_count",
    )
    list_filter = ("component_type", "privilege_type", "status")
    search_fields = ("decoration_id", "name")
    readonly_fields = ("like_count", "collect_count", "share_count", "create_time")
    fieldsets = (
        (
            "基础信息",
            {
                "fields": (
                    "decoration_id",
                    "name",
                    "desc",
                    "cover_img",
                    "detail_img",
                    "poster_img",
                    "component_type",
                    "group",
                )
            },
        ),
        (
            "样式与标签",
            {"fields": ("style_json", "style_tags", "dialect_tags")},
        ),
        (
            "权限与终端",
            {
                "fields": (
                    "privilege_type",
                    "get_condition",
                    "status",
                    "support_terminal",
                    "activity_start_at",
                    "activity_end_at",
                )
            },
        ),
        (
            "热度",
            {"fields": ("like_count", "collect_count", "share_count", "create_time")},
        ),
    )


@admin.register(UserThemeEntitlement)
class UserThemeEntitlementAdmin(admin.ModelAdmin):
    list_display = ("user", "is_member", "creator_unlocked")
    search_fields = ("user__username",)


@admin.register(UserThemeConfig)
class UserThemeConfigAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "global_theme_id",
        "is_cover_local_decoration",
        "updated_at",
    )
    search_fields = ("user__username", "global_theme_id")
    readonly_fields = (
        "user",
        "global_theme_id",
        "decoration_map",
        "is_cover_local_decoration",
        "recent_use_list",
        "updated_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(UserThemeCollect)
class UserThemeCollectAdmin(admin.ModelAdmin):
    list_display = ("user", "item_type", "item_id", "collect_time")
    list_filter = ("item_type",)
    search_fields = ("user__username", "item_id")
    readonly_fields = ("user", "item_type", "item_id", "collect_time")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(UserThemeMix)
class UserThemeMixAdmin(admin.ModelAdmin):
    list_display = ("user", "mix_name", "global_theme_id", "create_time")
    search_fields = ("user__username", "mix_name", "mix_id")
    readonly_fields = (
        "mix_id",
        "user",
        "mix_name",
        "global_theme_id",
        "decoration_map",
        "decoration_ids",
        "is_cover_local_decoration",
        "create_time",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(CatalogVersion)
class CatalogVersionAdmin(admin.ModelAdmin):
    list_display = ("value", "updated_at")

    def has_add_permission(self, request):
        return not CatalogVersion.objects.exists()

    def has_delete_permission(self, request, obj=None):
        return False
