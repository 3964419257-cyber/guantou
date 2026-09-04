from django.conf import settings
from django.db import models


class PrivilegeType(models.TextChoices):
    FREE = "free", "免费"
    MEMBER = "member", "会员专属"
    ACTIVITY = "activity", "活动限定"
    CREATOR = "creator", "方言创作者专属"


class ItemStatus(models.TextChoices):
    AVAILABLE = "available", "可用"
    COMING = "coming", "待上线"
    DEPRECATED = "deprecated", "已下架绝版"


class ItemType(models.TextChoices):
    THEME = "theme", "全局主题"
    DECORATION = "decoration", "局部装扮"


class ComponentType(models.TextChoices):
    NAV_BAR = "nav_bar", "导航栏"
    TAB_BAR = "tab_bar", "底部Tab栏"
    BUTTON = "button", "交互按钮"
    CARD = "card", "罐头卡片"
    HOME_BG = "home_bg", "个人主页背景"
    AVATAR_FRAME = "avatar_frame", "头像框"
    COMMENT_BUBBLE = "comment_bubble", "评论气泡"
    TOPIC_CARD = "topic_card", "话题卡片"
    INPUT_BOX = "input_box", "弹窗输入框"


def default_terminals():
    return ["h5", "miniprogram"]


class CatalogVersion(models.Model):
    value = models.PositiveIntegerField(default=1)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "装扮目录版本"
        verbose_name_plural = "装扮目录版本"

    def save(self, *args, **kwargs):
        self.pk = 1
        return super().save(*args, **kwargs)

    @classmethod
    def current(cls):
        item, _ = cls.objects.get_or_create(pk=1, defaults={"value": 1})
        return item.value

    @classmethod
    def bump(cls):
        item, _ = cls.objects.get_or_create(pk=1, defaults={"value": 1})
        item.value = int(item.value or 1) + 1
        item.save(update_fields=["value", "updated_at"])
        return item.value


class ThemeItem(models.Model):
    theme_id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=80)
    desc = models.TextField(blank=True)
    cover_img = models.CharField(max_length=255, default="default")
    detail_img = models.CharField(max_length=255, blank=True)
    poster_img = models.CharField(max_length=255, blank=True)
    style_json = models.JSONField(default=dict, blank=True)
    style_tags = models.JSONField(default=list, blank=True)
    dialect_tags = models.JSONField(default=list, blank=True)
    privilege_type = models.CharField(
        max_length=16, choices=PrivilegeType.choices, default=PrivilegeType.FREE
    )
    get_condition = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=16, choices=ItemStatus.choices, default=ItemStatus.COMING
    )
    support_terminal = models.JSONField(default=default_terminals)
    activity_start_at = models.DateTimeField(null=True, blank=True)
    activity_end_at = models.DateTimeField(null=True, blank=True)
    like_count = models.PositiveIntegerField(default=0)
    collect_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)
    create_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-create_time", "theme_id"]
        verbose_name = "全局主题"
        verbose_name_plural = "全局主题"

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        from .services import clean_catalog_item

        clean_catalog_item(self)


class DecorationItem(models.Model):
    decoration_id = models.SlugField(primary_key=True, max_length=64)
    name = models.CharField(max_length=80)
    desc = models.TextField(blank=True)
    cover_img = models.CharField(max_length=255, default="default")
    detail_img = models.CharField(max_length=255, blank=True)
    poster_img = models.CharField(max_length=255, blank=True)
    style_json = models.JSONField(default=dict, blank=True)
    component_type = models.CharField(max_length=32, choices=ComponentType.choices)
    group = models.CharField(max_length=64, blank=True)
    style_tags = models.JSONField(default=list, blank=True)
    dialect_tags = models.JSONField(default=list, blank=True)
    privilege_type = models.CharField(
        max_length=16, choices=PrivilegeType.choices, default=PrivilegeType.FREE
    )
    get_condition = models.CharField(max_length=200, blank=True)
    status = models.CharField(
        max_length=16, choices=ItemStatus.choices, default=ItemStatus.COMING
    )
    support_terminal = models.JSONField(default=default_terminals)
    activity_start_at = models.DateTimeField(null=True, blank=True)
    activity_end_at = models.DateTimeField(null=True, blank=True)
    like_count = models.PositiveIntegerField(default=0)
    collect_count = models.PositiveIntegerField(default=0)
    share_count = models.PositiveIntegerField(default=0)
    create_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["component_type", "decoration_id"]
        verbose_name = "局部装扮"
        verbose_name_plural = "局部装扮"

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        from .services import clean_catalog_item

        clean_catalog_item(self)


class UserThemeEntitlement(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="theme_entitlement",
    )
    is_member = models.BooleanField(default=False)
    creator_unlocked = models.BooleanField(default=False)
    activity_ids = models.JSONField(default=list, blank=True)

    class Meta:
        verbose_name = "装扮权益"
        verbose_name_plural = "装扮权益"


class UserThemeConfig(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="theme_config",
    )
    global_theme_id = models.CharField(max_length=64, default="default")
    decoration_map = models.JSONField(default=dict, blank=True)
    is_cover_local_decoration = models.BooleanField(default=True)
    recent_use_list = models.JSONField(default=list, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "当前装扮配置"
        verbose_name_plural = "当前装扮配置"


class UserThemeCollect(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="theme_collects",
    )
    item_type = models.CharField(max_length=16, choices=ItemType.choices)
    item_id = models.CharField(max_length=64)
    collect_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "item_type", "item_id")
        ordering = ["-collect_time"]
        verbose_name = "装扮收藏"
        verbose_name_plural = "装扮收藏"


class UserThemeMix(models.Model):
    mix_id = models.SlugField(max_length=64)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="theme_mixes",
    )
    mix_name = models.CharField(max_length=20)
    global_theme_id = models.CharField(max_length=64, default="default")
    decoration_map = models.JSONField(default=dict, blank=True)
    decoration_ids = models.JSONField(default=list, blank=True)
    is_cover_local_decoration = models.BooleanField(default=True)
    create_time = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "mix_id")
        ordering = ["-create_time"]
        verbose_name = "历史搭配"
        verbose_name_plural = "历史搭配"


class ThemeEventLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="theme_events",
    )
    visitor_id = models.CharField(max_length=64, blank=True)
    event_name = models.CharField(max_length=64)
    item_id = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "event_name", "item_id", "created_at"]),
        ]
        verbose_name = "装扮行为事件"
        verbose_name_plural = "装扮行为事件"
