from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.http import JsonResponse
from django.views import View

from guantou.models import CircleMembership, Dialect, DialectCircle
from user.dto.user_all import dialect_ref
from user.models import UserFollow
from user.tokens import get_request_user
from user.utils import get_user_by_id
from utils.exceptions.types.bad_request import BadRequestException
from utils.exceptions.types.unauthorized import UnauthorizedException

ROLE_CREATOR = "creator"
ROLE_OFFICIAL = "official"
ROLE_CIRCLE_HOST = "circle_host"

ROLE_LABELS = {
    ROLE_CREATOR: "同方言创作者",
    ROLE_OFFICIAL: "官方",
    ROLE_CIRCLE_HOST: "圈主",
}


def user_recommendation(user, viewer, *, role=ROLE_CREATOR, bio=""):
    return {
        "id": user.id,
        "username": user.username,
        "nickname": user.user_info.nickname or user.username,
        "avatar": user.user_info.avatar,
        "primary_dialect": dialect_ref(user.user_info.primary_dialect),
        "public_can_count": getattr(user, "public_can_count", 0) or 0,
        "is_following": UserFollow.objects.filter(
            follower=viewer, followed=user
        ).exists(),
        "role": role,
        "role_label": ROLE_LABELS.get(role, ROLE_LABELS[ROLE_CREATOR]),
        "bio": bio
        or (
            f"{getattr(user, 'public_can_count', 0) or 0} 罐公开乡音"
            if getattr(user, "public_can_count", 0)
            else "同方言乡音作者"
        ),
    }


def annotate_public_cans(queryset):
    return queryset.annotate(
        public_can_count=Count("cans", filter=Q(cans__visibility=True), distinct=True)
    )


class FollowManage(View):
    def put(self, request, id):
        viewer = get_request_user(request)
        if not viewer.is_authenticated:
            raise UnauthorizedException()
        if viewer.id == id:
            raise BadRequestException("不能关注自己")
        followed = get_user_by_id(id)
        _, created = UserFollow.objects.get_or_create(
            follower=viewer, followed=followed
        )
        return JsonResponse(
            {
                "following": True,
                "created": created,
                "user_id": followed.id,
            }
        )

    def delete(self, request, id):
        viewer = get_request_user(request)
        if not viewer.is_authenticated:
            raise UnauthorizedException()
        if viewer.id == id:
            raise BadRequestException("不能取消关注自己")
        followed = get_user_by_id(id)
        deleted, _ = UserFollow.objects.filter(
            follower=viewer, followed=followed
        ).delete()
        return JsonResponse(
            {
                "following": False,
                "deleted": bool(deleted),
                "user_id": followed.id,
            }
        )


class FollowRecommendations(View):
    def get(self, request):
        viewer = get_request_user(request)
        if not viewer.is_authenticated:
            raise UnauthorizedException()
        dialect_id = request.GET.get("dialect_id")
        if not dialect_id:
            raise BadRequestException("dialect_id 不能为空")
        try:
            dialect = Dialect.objects.get(pk=int(dialect_id))
            limit = max(1, min(int(request.GET.get("limit", 6)), 20))
        except (Dialect.DoesNotExist, TypeError, ValueError) as exc:
            raise BadRequestException("方言或数量参数无效") from exc

        followed_ids = set(
            UserFollow.objects.filter(follower=viewer).values_list(
                "followed_id", flat=True
            )
        )
        dialect_ids = dialect.descendant_ids()
        results = []
        seen = {viewer.id}

        # 官方号：同方言树下的 staff（若有）
        official_qs = annotate_public_cans(
            User.objects.select_related("user_info__primary_dialect")
            .filter(
                is_staff=True,
                user_info__primary_dialect_id__in=dialect_ids,
            )
            .exclude(id__in=followed_ids)
            .exclude(id=viewer.id)
        ).order_by("-public_can_count", "id")
        for user in official_qs[:2]:
            if user.id in seen:
                continue
            seen.add(user.id)
            results.append(
                user_recommendation(
                    user,
                    viewer,
                    role=ROLE_OFFICIAL,
                    bio="官方「每日一词」与运营号",
                )
            )

        # 方言圈主：该方言圈子最早加入的成员（无独立 owner 字段时的约定）
        circle = (
            DialectCircle.objects.filter(dialect_id__in=dialect_ids, is_active=True)
            .order_by("id")
            .first()
        )
        if circle:
            host_membership = (
                CircleMembership.objects.select_related(
                    "user__user_info__primary_dialect"
                )
                .filter(circle=circle)
                .exclude(user_id__in=followed_ids)
                .exclude(user_id=viewer.id)
                .order_by("created_at", "id")
                .first()
            )
            if host_membership and host_membership.user_id not in seen:
                host = annotate_public_cans(
                    User.objects.filter(id=host_membership.user_id)
                ).first()
                if host:
                    seen.add(host.id)
                    results.append(
                        user_recommendation(
                            host,
                            viewer,
                            role=ROLE_CIRCLE_HOST,
                            bio=f"{circle.name} · 圈主",
                        )
                    )

        remaining = max(0, limit - len(results))
        creators = annotate_public_cans(
            User.objects.select_related("user_info__primary_dialect")
            .filter(
                user_info__primary_dialect_id__in=dialect_ids,
                cans__visibility=True,
            )
            .exclude(id__in=followed_ids)
            .exclude(id__in=seen)
        ).order_by("-public_can_count", "id")[:remaining]
        for user in creators:
            results.append(user_recommendation(user, viewer, role=ROLE_CREATOR))

        return JsonResponse({"results": results[:limit]})
