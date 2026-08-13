from django.contrib.auth.models import User
from django.test import Client, TestCase

from announcements.models import Announcement
from user.models import UserInfo
from user.tokens import generate_token


def bearer(user):
    return f"Bearer {generate_token(user)}"


class AnnouncementAuthorNullTests(TestCase):
    def setUp(self):
        self.client = Client()
        self.admin = User.objects.create_superuser(
            username="admin", password="pw", email="admin@example.com"
        )
        UserInfo.objects.create(user=self.admin, nickname="管理员")
        self.orphan = Announcement.objects.create(
            author=None,
            title="无作者公告",
            description="摘要",
            content="正文",
            visibility=True,
        )

    def test_search_lists_announcements_without_author(self):
        response = self.client.get("/announcements")
        self.assertEqual(response.status_code, 200)
        items = response.json()["announcements"]
        self.assertEqual(len(items), 1)
        self.assertIsNone(items[0]["announcement"]["author"])
        self.assertIsNone(items[0]["author"]["id"])
        self.assertEqual(items[0]["author"]["nickname"], "已注销用户")

    def test_batch_put_includes_null_author_payload(self):
        response = self.client.put(
            "/announcements",
            data={"announcements": [self.orphan.id]},
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 200)
        item = response.json()["announcements"][0]
        self.assertIsNone(item["author"]["id"])
        self.assertEqual(item["author"]["nickname"], "已注销用户")

    def test_detail_uses_null_safe_author_dto(self):
        response = self.client.get(f"/announcements/{self.orphan.id}")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIsNone(body["announcement"]["author"]["id"])
        self.assertEqual(body["announcement"]["author"]["nickname"], "已注销用户")
        self.assertFalse(body["me"]["is_author"])

    def test_non_admin_cannot_edit_orphan_announcement(self):
        editor = User.objects.create_user(username="editor", password="pw")
        UserInfo.objects.create(user=editor, nickname="编辑")
        response = self.client.put(
            f"/announcements/{self.orphan.id}",
            data={
                "announcement": {
                    "title": "改标题",
                    "description": "",
                    "content": "x",
                    "cover": "",
                }
            },
            content_type="application/json",
            HTTP_AUTHORIZATION=bearer(editor),
        )
        self.assertEqual(response.status_code, 401)
