from django.db import migrations


def seed_forward(apps, schema_editor):
    from themes.catalog import seed_catalog

    seed_catalog()


class Migration(migrations.Migration):
    dependencies = [
        ("themes", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(seed_forward, migrations.RunPython.noop),
    ]
