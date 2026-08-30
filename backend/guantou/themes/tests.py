from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import Client, TestCase

from user.models import UserInfo
from user.tokens import generate_token

from .catalog import seed_catalog
from .models import CatalogVersion, ThemeItem, UserThemeEntitlement


def bearer(user):
    return f"Bearer {generate_token(user)}"


class ThemeApiTests(TestCase):
    def setUp(self):
        cache.clear()
        seed_catalog()
        self.user = User.objects.create_user(
            username="theme-user", password="pw", email="theme@example.com"
        )
        UserInfo.objects.create(user=self.user, nickname="乡音")
        self.client = Client()

    def auth(self):
        return {"HTTP_AUTHORIZATION": bearer(self.user)}

    def test_guest_can_read_catalog_with_version_and_without_list_style(self):
        response = self.client.get("/themes/")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("catalog_version", payload)
        self.assertGreaterEqual(payload["count"], 1)
        self.assertTrue(payload["results"])
        first = payload["results"][0]
        self.assertNotIn("style_json", first)
        ids = [row["theme_id"] for row in payload["results"]]
        self.assertIn("default", ids)

        detail = self.client.get("/themes/default/")
        self.assertEqual(detail.status_code, 200)
        self.assertIn("style_json", detail.json())

        decorations = self.client.get("/decorations/?page_size=50")
        self.assertEqual(decorations.status_code, 200)
        deco_ids = [row["decoration_id"] for row in decorations.json()["results"]]
        self.assertIn("cards-plain", deco_ids)
        self.assertNotIn("style_json", decorations.json()["results"][0])

    def test_guest_cannot_write_config(self):
        response = self.client.put(
            "/users/theme/config/",
            data={"global_theme_id": "default"},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 401)

    def test_apply_default_theme_and_ignore_client_style(self):
        apply = self.client.post(
            "/users/theme/apply/",
            data={"item_type": "theme", "item_id": "default", "platform": "h5"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(apply.status_code, 200)
        self.assertEqual(apply.json()["global_theme_id"], "default")

        cache.clear()
        put = self.client.put(
            "/users/theme/config/",
            data={
                "global_theme_id": "default",
                "is_cover_local_decoration": True,
                "style_json": {"accent": "hack"},
                "like_count": 99,
                "is_member": True,
            },
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(put.status_code, 200)
        self.assertEqual(put.json()["global_theme_id"], "default")
        self.assertNotIn("style_json", put.json())
        self.assertFalse(
            UserThemeEntitlement.objects.filter(user=self.user, is_member=True).exists()
        )

    def test_apply_rejects_coming_deprecated_privilege_and_terminal(self):
        coming = self.client.post(
            "/users/theme/apply/",
            data={"item_type": "theme", "item_id": "paper", "platform": "h5"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(coming.status_code, 409)
        self.assertEqual(coming.json()["data"]["reason"], "coming")

        cache.clear()
        ended = self.client.post(
            "/users/theme/apply/",
            data={"item_type": "theme", "item_id": "event-spring", "platform": "h5"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(ended.status_code, 409)
        self.assertEqual(ended.json()["data"]["reason"], "deprecated")

        cache.clear()
        member = self.client.post(
            "/users/theme/apply/",
            data={"item_type": "theme", "item_id": "member-pine", "platform": "h5"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(member.status_code, 403)
        self.assertEqual(member.json()["data"]["reason"], "privilege")

        cache.clear()
        terminal = self.client.post(
            "/users/theme/apply/",
            data={
                "item_type": "decoration",
                "item_id": "navbar-plain",
                "platform": "miniprogram",
            },
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(terminal.status_code, 403)
        self.assertEqual(terminal.json()["data"]["reason"], "terminal")

    def test_member_can_apply_member_theme(self):
        UserThemeEntitlement.objects.update_or_create(
            user=self.user, defaults={"is_member": True}
        )
        response = self.client.post(
            "/users/theme/apply/",
            data={"item_type": "theme", "item_id": "member-pine", "platform": "h5"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["global_theme_id"], "member-pine")

    def test_collect_mix_and_events(self):
        collect = self.client.post(
            "/users/theme/collects/",
            data={"item_type": "theme", "item_id": "default"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(collect.status_code, 201)
        listed = self.client.get("/users/theme/collects/", **self.auth())
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.json()["collect_list"][0]["item_id"], "default")
        ThemeItem.objects.get(theme_id="default").refresh_from_db()
        self.assertEqual(ThemeItem.objects.get(theme_id="default").collect_count, 1)

        deleted = self.client.delete(
            "/users/theme/collects/default/?item_type=theme",
            **self.auth(),
        )
        self.assertEqual(deleted.status_code, 204)

        mix = self.client.post(
            "/users/theme/mixes/",
            data={
                "mix_id": "mix-home",
                "mix_name": "<b>巷口搭配</b>",
                "global_theme_id": "default",
                "decoration_map": {"card": "cards-plain"},
            },
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(mix.status_code, 201)
        self.assertEqual(mix.json()["mix_name"], "巷口搭配")

        renamed = self.client.patch(
            "/users/theme/mixes/mix-home/",
            data={"mix_name": "晚风搭配"},
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(renamed.status_code, 200)
        self.assertEqual(renamed.json()["mix_name"], "晚风搭配")

        event = self.client.post(
            "/users/theme/events/",
            data={"event": "theme_center_enter", "item_id": "default"},
            content_type="application/json",
        )
        self.assertEqual(event.status_code, 202)
        before = ThemeItem.objects.get(theme_id="default").like_count
        self.assertEqual(before, 0)

    def test_put_skips_locked_layers_when_overlay_off(self):
        response = self.client.put(
            "/users/theme/config/",
            data={
                "global_theme_id": "default",
                "is_cover_local_decoration": False,
                "decoration_map": {
                    "card": "cards-member",
                    "home_bg": "profile-plain",
                },
            },
            content_type="application/json",
            **self.auth(),
        )
        self.assertEqual(response.status_code, 200)
        mapping = response.json()["decoration_map"]
        self.assertNotIn("card", mapping)
        self.assertEqual(mapping.get("home_bg"), "profile-plain")

    def test_catalog_version_bumps_with_admin_save(self):
        first = CatalogVersion.current()
        CatalogVersion.bump()
        self.assertEqual(CatalogVersion.current(), first + 1)
