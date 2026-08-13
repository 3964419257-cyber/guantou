from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0007_userinfo_onboarding_done_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="userinfo",
            name="region",
            field=models.CharField(
                blank=True,
                default="",
                max_length=100,
                verbose_name="家乡/常住地",
            ),
        ),
    ]
