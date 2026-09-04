from django.db import migrations


def seed_forward(apps, schema_editor):
    from themes.catalog import seed_catalog
    from themes.models import CatalogVersion

    seed_catalog()
    CatalogVersion.bump()


class Migration(migrations.Migration):
    dependencies = [
        ("themes", "0006_three_free_category_skins"),
    ]

    operations = [
        migrations.RunPython(seed_forward, migrations.RunPython.noop),
    ]
