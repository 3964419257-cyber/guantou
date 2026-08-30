from rest_framework import permissions, viewsets
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from utils.exceptions.types.bad_request import BadRequestException

from .models import (
    CatalogVersion,
    DecorationItem,
    ItemType,
    ThemeItem,
    UserThemeCollect,
    UserThemeConfig,
    UserThemeEntitlement,
    UserThemeMix,
)
from .serializers import (
    DecorationItemListSerializer,
    DecorationItemSerializer,
    ThemeItemListSerializer,
    ThemeItemSerializer,
    UserThemeCollectSerializer,
    UserThemeConfigSerializer,
    UserThemeEntitlementSerializer,
    UserThemeMixSerializer,
)
from .services import (
    add_collect,
    apply_item,
    create_mix,
    delete_mix,
    record_event,
    remove_collect,
    rename_mix,
    save_config,
)


class ThemeCatalogPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data):
        return Response(
            {
                "count": self.page.paginator.count,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
                "catalog_version": CatalogVersion.current(),
            }
        )


def request_platform(request):
    raw = None
    if hasattr(request, "data") and isinstance(request.data, dict):
        raw = request.data.get("platform")
    raw = raw or request.query_params.get("platform")
    if raw in {"h5", "miniprogram"}:
        return raw
    return "h5"


def apply_catalog_filters(queryset, params, *, decoration=False):
    if params.get("privilege_type"):
        queryset = queryset.filter(privilege_type=params["privilege_type"])
    if params.get("status"):
        queryset = queryset.filter(status=params["status"])
    terminal = params.get("support_terminal")
    if terminal:
        queryset = queryset.filter(support_terminal__contains=[terminal])
    dialect = params.get("dialect_tag")
    if dialect:
        queryset = queryset.filter(dialect_tags__contains=[dialect])
    style = params.get("style_tag")
    if style:
        queryset = queryset.filter(style_tags__contains=[style])
    keyword = params.get("keyword")
    if keyword:
        queryset = queryset.filter(name__icontains=keyword)
    if decoration and params.get("component_type"):
        queryset = queryset.filter(component_type=params["component_type"])
    sort = params.get("sort")
    if sort == "heat":
        queryset = queryset.order_by("-collect_count", "-like_count", "-share_count")
    elif sort == "name":
        queryset = queryset.order_by("name")
    elif sort == "newest":
        queryset = queryset.order_by("-create_time")
    return queryset


class ThemeItemViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = ThemeCatalogPagination
    permission_classes = [permissions.AllowAny]
    lookup_field = "theme_id"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ThemeItemSerializer
        return ThemeItemListSerializer

    def get_queryset(self):
        return apply_catalog_filters(ThemeItem.objects.all(), self.request.query_params)


class DecorationItemViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = ThemeCatalogPagination
    permission_classes = [permissions.AllowAny]
    lookup_field = "decoration_id"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DecorationItemSerializer
        return DecorationItemListSerializer

    def get_queryset(self):
        return apply_catalog_filters(
            DecorationItem.objects.all(),
            self.request.query_params,
            decoration=True,
        )


class ThemeConfigView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        config, _ = UserThemeConfig.objects.get_or_create(
            user=request.user, defaults={"global_theme_id": "default"}
        )
        return Response(UserThemeConfigSerializer(config).data)

    def put(self, request):
        config = save_config(request.user, request.data, request_platform(request))
        return Response(UserThemeConfigSerializer(config).data)


class ThemeApplyView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        config = apply_item(
            request.user,
            request.data.get("item_type"),
            str(request.data.get("item_id") or ""),
            request_platform(request),
        )
        return Response(UserThemeConfigSerializer(config).data)


class ThemeCollectView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = UserThemeCollect.objects.filter(user=request.user)
        return Response(
            {"collect_list": UserThemeCollectSerializer(rows, many=True).data}
        )

    def post(self, request):
        row = add_collect(
            request.user,
            request.data.get("item_type"),
            str(request.data.get("item_id") or ""),
        )
        return Response(UserThemeCollectSerializer(row).data, status=201)


class ThemeCollectDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, item_id):
        item_type = request.query_params.get("item_type")
        if not item_type and isinstance(getattr(request, "data", None), dict):
            item_type = request.data.get("item_type")
        if item_type not in ItemType.values:
            raise BadRequestException("参数无效")
        remove_collect(request.user, item_type, item_id)
        return Response(status=204)


class ThemeMixView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        rows = UserThemeMix.objects.filter(user=request.user)
        return Response(UserThemeMixSerializer(rows, many=True).data)

    def post(self, request):
        mix = create_mix(request.user, request.data)
        return Response(UserThemeMixSerializer(mix).data, status=201)


class ThemeMixDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, mix_id):
        mix = rename_mix(request.user, mix_id, request.data.get("mix_name"))
        return Response(UserThemeMixSerializer(mix).data)

    def delete(self, request, mix_id):
        delete_mix(request.user, mix_id)
        return Response(status=204)


class ThemeEventView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        user = request.user if request.user.is_authenticated else None
        visitor = request.headers.get("X-Visitor-ID", "")
        record_event(
            user,
            visitor,
            request.data.get("event") or request.data.get("event_name"),
            request.data.get("item_id") or "",
        )
        return Response({"ok": True}, status=202)


class ThemeEntitlementView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        row, _ = UserThemeEntitlement.objects.get_or_create(user=request.user)
        return Response(UserThemeEntitlementSerializer(row).data)
