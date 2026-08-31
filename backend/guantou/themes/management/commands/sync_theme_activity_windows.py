from django.core.management.base import BaseCommand

from themes.services import sync_activity_windows


class Command(BaseCommand):
    help = "按活动开始/结束时间校正主题与装扮的 coming、available、deprecated，并在有变更时递增目录版本"

    def handle(self, *args, **options):
        changed = sync_activity_windows()
        self.stdout.write(self.style.SUCCESS(f"updated {changed}"))
