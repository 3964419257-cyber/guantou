from django.core.management.base import BaseCommand

from user.demo_users import seed_demo_phone_users


class Command(BaseCommand):
    help = (
        "Seed W1-E6 demo phone users: "
        "13900000001 老用户川话(四川话), 13900000002 老用户无方言"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Force rebuild demo account dialect/onboarding fields",
        )

    def handle(self, *args, **options):
        result = seed_demo_phone_users(reset=bool(options.get("reset")))
        self.stdout.write(
            self.style.SUCCESS(
                "Phone demo users ready "
                f"(created={result['created']}, updated={result['updated']}, "
                f"reset={result['reset']})"
            )
        )
