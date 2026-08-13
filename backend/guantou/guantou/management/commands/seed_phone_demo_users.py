from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from django.db import transaction

from guantou.models import Dialect
from user.models import UserInfo

DEMO_USERS = (
    {
        "phone": "13900000001",
        "nickname": "用户0001",
        "with_dialect": True,
    },
    {
        "phone": "13900000002",
        "nickname": "用户0002",
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


class Command(BaseCommand):
    help = "Seed W1-E3 demo phone users (13900000001 with 四川话, 13900000002 without)"

    def handle(self, *args, **options):
        dialect = ensure_sichuan_dialect()
        created = 0
        updated = 0
        with transaction.atomic():
            for item in DEMO_USERS:
                phone = item["phone"]
                info = (
                    UserInfo.objects.select_related("user")
                    .filter(telephone=phone)
                    .first()
                )
                if info is None:
                    user = User(username=f"phone_demo_{phone[-4:]}")
                    user.set_unusable_password()
                    user.save()
                    info = UserInfo.objects.create(
                        user=user,
                        nickname=item["nickname"],
                        telephone=phone,
                        primary_dialect=dialect if item["with_dialect"] else None,
                    )
                    created += 1
                else:
                    info.nickname = item["nickname"]
                    info.primary_dialect = dialect if item["with_dialect"] else None
                    info.save(update_fields=["nickname", "primary_dialect"])
                    updated += 1
                if info.primary_dialect_id:
                    info.followed_dialects.add(info.primary_dialect_id)

        self.stdout.write(
            self.style.SUCCESS(
                f"Phone demo users ready (created={created}, updated={updated})"
            )
        )
