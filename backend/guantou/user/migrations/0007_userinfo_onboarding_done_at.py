from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("user", "0006_email_verification"),
    ]

    operations = [
        migrations.AddField(
            model_name="userinfo",
            name="onboarding_done_at",
            field=models.DateTimeField(
                blank=True,
                null=True,
                verbose_name="方言身份引导完成时间",
            ),
        ),
    ]
