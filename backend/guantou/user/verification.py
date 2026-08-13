import hashlib
import hmac
import logging
import re
import secrets
from datetime import timedelta

import demjson3
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.core.validators import validate_email
from django.db import transaction
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from user.models import EmailVerification

logger = logging.getLogger("log")
PHONE_PATTERN = re.compile(r"^1\d{10}$")


class EmailCodeThrottled(Exception):
    pass


def normalize_email(email):
    return str(email or "").strip().lower()


def validate_and_normalize_email(email):
    normalized = normalize_email(email)
    validate_email(normalized)
    return normalized


def email_cache_key(email):
    """Backward-compatible helper retained for callers outside this module."""
    return f"email_code:{normalize_email(email)}"


def generate_email_code(length=6):
    return "".join(secrets.choice("0123456789") for _ in range(length))


def _email_code_digest(email, purpose, subject, code):
    payload = f"{normalize_email(email)}:{purpose}:{subject}:{str(code).strip()}"
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def normalize_phone(phone):
    return re.sub(r"[\s-]+", "", str(phone or "")).strip()


def is_valid_phone(phone):
    return bool(PHONE_PATTERN.fullmatch(normalize_phone(phone)))


def phone_cache_key(phone):
    return f"phone_code:{normalize_phone(phone)}"


def phone_throttle_cache_key(phone):
    return f"phone_code_throttle:{normalize_phone(phone)}"


class PhoneCodeThrottled(Exception):
    def __init__(self, retry_after):
        self.retry_after = max(1, int(retry_after))
        super().__init__(f"请 {self.retry_after} 秒后再试")


PHONE_CODE_MISSING = "missing"
PHONE_CODE_EXPIRED = "expired"
PHONE_CODE_WRONG = "wrong"
PHONE_CODE_OK = "ok"

PHONE_CODE_MESSAGES = {
    PHONE_CODE_MISSING: "请先获取验证码",
    PHONE_CODE_EXPIRED: "验证码已过期，请重新获取",
    PHONE_CODE_WRONG: "验证码错误",
}


def generate_phone_code(length=6):
    return "".join(secrets.choice("0123456789") for _ in range(length))


def _phone_code_payload(value):
    if isinstance(value, dict):
        return value
    if value is None:
        return None
    # Backward-compatible plain-string cache entries from older demos.
    return {"code": str(value), "expires_at": None}


def issue_phone_code(phone):
    normalized = normalize_phone(phone)
    if not is_valid_phone(normalized):
        raise ValueError("请输入合法的11位手机号")
    throttle_key = phone_throttle_cache_key(normalized)
    now = timezone.now().timestamp()
    sent_at = cache.get(throttle_key)
    if sent_at is not None:
        elapsed = now - float(sent_at)
        remaining = settings.PHONE_CODE_THROTTLE_SECONDS - elapsed
        raise PhoneCodeThrottled(remaining)
    cache.set(
        throttle_key,
        now,
        timeout=settings.PHONE_CODE_THROTTLE_SECONDS,
    )
    code = generate_phone_code()
    # Keep the record a bit past expiry so login can return the expired copy.
    cache.set(
        phone_cache_key(normalized),
        {
            "code": code,
            "expires_at": now + settings.PHONE_CODE_TTL_SECONDS,
        },
        timeout=settings.PHONE_CODE_TTL_SECONDS + 300,
    )
    return code


def check_phone_code(phone, code):
    """Backward-compatible boolean check used by older callers/tests."""
    return consume_phone_code(phone, code) == PHONE_CODE_OK


def consume_phone_code(phone, code):
    key = phone_cache_key(phone)
    payload = _phone_code_payload(cache.get(key))
    if payload is None:
        return PHONE_CODE_MISSING
    expires_at = payload.get("expires_at")
    if expires_at is not None and timezone.now().timestamp() > float(expires_at):
        cache.delete(key)
        return PHONE_CODE_EXPIRED
    expected = str(payload.get("code") or "")
    submitted = str(code or "").strip()
    if not expected or not submitted or not hmac.compare_digest(expected, submitted):
        return PHONE_CODE_WRONG
    cache.delete(key)
    return PHONE_CODE_OK


def issue_email_code(email, purpose, subject=""):
    normalized = validate_and_normalize_email(email)
    if purpose not in EmailVerification.Purpose.values:
        raise ValueError("不支持的验证码用途")
    subject = str(subject or "").strip()
    now = timezone.now()
    code = generate_email_code()
    digest = _email_code_digest(normalized, purpose, subject, code)

    with transaction.atomic():
        record = (
            EmailVerification.objects.select_for_update()
            .filter(
                normalized_email=normalized,
                purpose=purpose,
                subject=subject,
            )
            .first()
        )
        if record and record.created_at >= now - timedelta(
            seconds=settings.EMAIL_CODE_THROTTLE_SECONDS
        ):
            raise EmailCodeThrottled
        values = {
            "code_digest": digest,
            "expires_at": now + timedelta(seconds=settings.EMAIL_CODE_TTL_SECONDS),
            "attempts": 0,
            "delivered_at": None,
            "consumed_at": None,
        }
        if record:
            for field, value in values.items():
                setattr(record, field, value)
            record.created_at = now
            record.save(
                update_fields=[
                    *values.keys(),
                    "created_at",
                    "updated_at",
                ]
            )
        else:
            record = EmailVerification.objects.create(
                normalized_email=normalized,
                purpose=purpose,
                subject=subject,
                **values,
            )

    try:
        sent = send_mail(
            "[乡声集盒]验证码",
            f"你的验证码为 {code}，{settings.EMAIL_CODE_TTL_SECONDS // 60} 分钟内有效。",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[normalized],
            html_message=(
                "<!DOCTYPE html><html lang='zh-Hans'><body>"
                f"<p><strong>你的验证码为：{code}</strong></p>"
                f"<p>{settings.EMAIL_CODE_TTL_SECONDS // 60} 分钟内有效，请勿转发。</p>"
                "<p>乡声集盒团队</p></body></html>"
            ),
        )
        if sent != 1:
            raise RuntimeError("SMTP provider did not accept the message")
    except Exception:
        EmailVerification.objects.filter(pk=record.pk, code_digest=digest).delete()
        raise

    EmailVerification.objects.filter(pk=record.pk, code_digest=digest).update(
        delivered_at=timezone.now()
    )
    return True


def check_email_code(email, code, purpose, subject=""):
    normalized = normalize_email(email)
    now = timezone.now()
    with transaction.atomic():
        record = (
            EmailVerification.objects.select_for_update()
            .filter(
                normalized_email=normalized,
                purpose=purpose,
                subject=str(subject or "").strip(),
                delivered_at__isnull=False,
                consumed_at__isnull=True,
                expires_at__gt=now,
            )
            .first()
        )
        if record is None or record.attempts >= settings.EMAIL_CODE_MAX_ATTEMPTS:
            return False
        expected = _email_code_digest(normalized, purpose, record.subject, code)
        if not hmac.compare_digest(record.code_digest, expected):
            record.attempts += 1
            if record.attempts >= settings.EMAIL_CODE_MAX_ATTEMPTS:
                record.consumed_at = now
                record.save(update_fields=["attempts", "consumed_at", "updated_at"])
            else:
                record.save(update_fields=["attempts", "updated_at"])
            return False
        record.consumed_at = now
        record.save(update_fields=["consumed_at", "updated_at"])
        return True


@csrf_exempt
@require_POST
def email_code(request):
    body = demjson3.decode(request.body)
    purpose = body.get("purpose", EmailVerification.Purpose.REGISTER)
    if purpose not in {
        EmailVerification.Purpose.REGISTER,
        EmailVerification.Purpose.BIND,
    }:
        return JsonResponse({"msg": "不支持的验证码用途"}, status=400)
    try:
        email_address = validate_and_normalize_email(body.get("email"))
    except ValidationError:
        return JsonResponse({"msg": "邮箱地址无效"}, status=400)
    if User.objects.filter(email__iexact=email_address).exists():
        return JsonResponse({"msg": "该邮箱已被绑定"}, status=409)
    try:
        issue_email_code(email_address, purpose)
    except EmailCodeThrottled:
        return JsonResponse({"msg": "验证码发送过于频繁"}, status=429)
    except Exception:
        logger.exception("Failed to send email verification code")
        return JsonResponse({"msg": "验证码发送失败，请稍后重试"}, status=502)
    return JsonResponse({}, status=200)


@csrf_exempt
@require_POST
def phone_code(request):
    body = demjson3.decode(request.body)
    if not settings.PHONE_CODE_DEMO_MODE:
        return JsonResponse({"message": "短信服务尚未配置"}, status=503)
    try:
        code = issue_phone_code(body.get("phone"))
    except PhoneCodeThrottled as error:
        return JsonResponse(
            {
                "message": str(error),
                "retry_after": error.retry_after,
            },
            status=429,
        )
    except ValueError as error:
        return JsonResponse({"message": str(error)}, status=400)
    payload = {
        "expires_in": settings.PHONE_CODE_TTL_SECONDS,
        "retry_after": settings.PHONE_CODE_THROTTLE_SECONDS,
        "delivery": "demo",
        "demo_code": code,
    }
    return JsonResponse(payload, status=200)
