from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from guantou.models import Dialect
from user.models import UserInfo

DEMO_USERS = (
    {
        "phone": "13900000001",
        "username": "u_old_with_dialect",
        "nickname": "老用户川话",
        "with_dialect": True,
    },
    {
        "phone": "13900000002",
        "username": "u_old_no_dialect",
        "nickname": "老用户无方言",
        "with_dialect": False,
    },
)


def ensure_sichuan_dialect():
    root, _ = Dialect.objects.get_or_create(
        parent=None,
        code="西南",
        defaults={"name": "西南官话", "sort_order": 20},
    )
    dialect, _ = Dialect.objects.get_or_create(
        parent=root,
        code="四川",
        defaults={"name": "四川话", "sort_order": 10},
    )
    return dialect


def seed_demo_phone_users(*, reset=False):
    """Create or refresh W1-E6 demo phone accounts used in Demo App / 组会联调."""
    dialect = ensure_sichuan_dialect()
    created = 0
    updated = 0
    users = []

    with transaction.atomic():
        for item in DEMO_USERS:
            phone = item["phone"]
            info = (
                UserInfo.objects.select_related("user").filter(telephone=phone).first()
            )
            primary = dialect if item["with_dialect"] else None

            if info is None:
                username = item["username"]
                if User.objects.filter(username=username).exists():
                    username = f"phone_demo_{phone[-4:]}"
                user = User(username=username)
                user.set_unusable_password()
                user.save()
                info = UserInfo.objects.create(
                    user=user,
                    nickname=item["nickname"],
                    telephone=phone,
                    primary_dialect=primary,
                    onboarding_done_at=timezone.now() if primary else None,
                )
                created += 1
            else:
                info.nickname = item["nickname"]
                info.primary_dialect = primary
                update_fields = ["nickname", "primary_dialect"]
                if primary is not None:
                    if reset or not info.onboarding_done_at:
                        info.onboarding_done_at = timezone.now()
                        update_fields.append("onboarding_done_at")
                else:
                    info.onboarding_done_at = None
                    update_fields.append("onboarding_done_at")
                info.save(update_fields=update_fields)
                updated += 1

            if info.primary_dialect_id:
                info.followed_dialects.add(info.primary_dialect_id)
            elif reset:
                info.followed_dialects.clear()

            users.append(
                {
                    "phone": phone,
                    "username": info.user.username,
                    "nickname": info.nickname,
                    "primary_dialect": (
                        info.primary_dialect.name if info.primary_dialect else None
                    ),
                }
            )

    return {
        "created": created,
        "updated": updated,
        "reset": reset,
        "users": users,
    }
