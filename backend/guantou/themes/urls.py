from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    DecorationItemViewSet,
    ThemeApplyView,
    ThemeCollectDetailView,
    ThemeCollectView,
    ThemeConfigView,
    ThemeEntitlementView,
    ThemeEventView,
    ThemeItemViewSet,
    ThemeMixDetailView,
    ThemeMixView,
)

router = DefaultRouter()
router.register("themes", ThemeItemViewSet, basename="theme")
router.register("decorations", DecorationItemViewSet, basename="decoration")

urlpatterns = router.urls + [
    path("users/theme/config/", ThemeConfigView.as_view()),
    path("users/theme/apply/", ThemeApplyView.as_view()),
    path("users/theme/collects/", ThemeCollectView.as_view()),
    path("users/theme/collects/<slug:item_id>/", ThemeCollectDetailView.as_view()),
    path("users/theme/mixes/", ThemeMixView.as_view()),
    path("users/theme/mixes/<slug:mix_id>/", ThemeMixDetailView.as_view()),
    path("users/theme/events/", ThemeEventView.as_view()),
    path("users/theme/entitlement/", ThemeEntitlementView.as_view()),
]
