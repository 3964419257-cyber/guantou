from rest_framework import serializers

from .models import (
    DecorationItem,
    ThemeItem,
    UserThemeCollect,
    UserThemeConfig,
    UserThemeEntitlement,
    UserThemeMix,
)

THEME_LIST_FIELDS = (
    "theme_id",
    "name",
    "desc",
    "cover_img",
    "detail_img",
    "poster_img",
    "style_tags",
    "dialect_tags",
    "privilege_type",
    "get_condition",
    "status",
    "support_terminal",
    "activity_start_at",
    "activity_end_at",
    "like_count",
    "collect_count",
    "share_count",
    "create_time",
)

DECORATION_LIST_FIELDS = (
    "decoration_id",
    "name",
    "desc",
    "cover_img",
    "detail_img",
    "poster_img",
    "component_type",
    "group",
    "style_tags",
    "dialect_tags",
    "privilege_type",
    "get_condition",
    "status",
    "support_terminal",
    "activity_start_at",
    "activity_end_at",
    "like_count",
    "collect_count",
    "share_count",
    "create_time",
)


class ThemeItemListSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThemeItem
        fields = THEME_LIST_FIELDS
        read_only_fields = ("like_count", "collect_count", "share_count", "create_time")


class ThemeItemSerializer(ThemeItemListSerializer):
    class Meta(ThemeItemListSerializer.Meta):
        fields = THEME_LIST_FIELDS + ("style_json",)


class DecorationItemListSerializer(serializers.ModelSerializer):
    class Meta:
        model = DecorationItem
        fields = DECORATION_LIST_FIELDS
        read_only_fields = ("like_count", "collect_count", "share_count", "create_time")


class DecorationItemSerializer(DecorationItemListSerializer):
    class Meta(DecorationItemListSerializer.Meta):
        fields = DECORATION_LIST_FIELDS + ("style_json",)


class UserThemeConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserThemeConfig
        fields = (
            "global_theme_id",
            "decoration_map",
            "is_cover_local_decoration",
            "recent_use_list",
        )


class UserThemeCollectSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserThemeCollect
        fields = ("item_id", "item_type", "collect_time")


class UserThemeMixSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserThemeMix
        fields = (
            "mix_id",
            "mix_name",
            "global_theme_id",
            "decoration_ids",
            "decoration_map",
            "is_cover_local_decoration",
            "create_time",
        )


class UserThemeEntitlementSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserThemeEntitlement
        fields = ("is_member", "creator_unlocked", "activity_ids")
