from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("themes", "0003_paper_available"),
    ]

    operations = [
        migrations.AddField(
            model_name="userthememix",
            name="is_cover_local_decoration",
            field=models.BooleanField(default=True),
        ),
    ]
