from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("user", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="userinfo",
            name="primary_dialect",
            field=models.CharField(
                blank=True, max_length=80, verbose_name="主方言"
            ),
        ),
        migrations.AddField(
            model_name="userinfo",
            name="dialects",
            field=models.JSONField(blank=True, default=list, verbose_name="方言列表"),
        ),
        migrations.AddField(
            model_name="userinfo",
            name="region",
            field=models.CharField(
                blank=True, max_length=120, verbose_name="家乡/常住地"
            ),
        ),
        migrations.AddField(
            model_name="userinfo",
            name="onboarding_done_at",
            field=models.DateTimeField(
                blank=True, null=True, verbose_name="方言身份引导完成时间"
            ),
        ),
    ]
